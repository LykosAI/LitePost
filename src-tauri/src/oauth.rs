use base64::engine::general_purpose;
use base64::Engine as _;
use rand::RngCore;
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use std::collections::HashMap;
use tauri::Url;
use tauri_plugin_http::reqwest;
use tauri_plugin_opener::OpenerExt;

use crate::models::ClientWrapper;

const OAUTH_TOKEN_ACCEPT_HEADER: &str =
    "application/json, application/x-www-form-urlencoded, text/plain";
const TOKEN_CONTAINER_KEYS: &[&str] = &["data", "token", "result", "response"];

#[derive(Debug, Deserialize)]
pub struct OAuth2TokenExchangeOptions {
    token_url: String,
    grant_type: String,
    client_id: String,
    client_secret: Option<String>,
    scope: Option<String>,
    username: Option<String>,
    password: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
pub struct OAuth2TokenResponse {
    access_token: String,
    token_type: Option<String>,
    expires_in: Option<u64>,
    refresh_token: Option<String>,
    scope: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct OAuth2AuthCodeOptions {
    auth_url: String,
    token_url: String,
    client_id: String,
    client_secret: Option<String>,
    scope: Option<String>,
    use_pkce: Option<bool>,
    redirect_uri: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct OAuth2RefreshOptions {
    token_url: String,
    client_id: String,
    client_secret: Option<String>,
    refresh_token: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum TokenBodyFormat {
    Json,
    Form,
}

fn required_field(value: String, field_name: &str) -> Result<String, String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err(format!("{} is required", field_name));
    }
    Ok(trimmed.to_string())
}

fn normalize_optional_input(value: Option<String>) -> Option<String> {
    value.and_then(|raw| {
        let trimmed = raw.trim();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed.to_string())
        }
    })
}

fn insert_optional_param(params: &mut HashMap<String, String>, key: &str, value: Option<String>) {
    if let Some(value) = normalize_optional_input(value) {
        params.insert(key.to_string(), value);
    }
}

fn oauth_body_preview(body: &str, max_chars: usize) -> String {
    let trimmed = body.trim();
    let mut preview = trimmed.chars().take(max_chars).collect::<String>();
    if trimmed.chars().count() > max_chars {
        preview.push_str("...");
    }
    preview
}

fn lookup_value<'a>(map: &'a Map<String, Value>, keys: &[&str]) -> Option<&'a Value> {
    for key in keys {
        if let Some(value) = map.get(*key) {
            return Some(value);
        }
    }

    for container_key in TOKEN_CONTAINER_KEYS {
        if let Some(Value::Object(inner)) = map.get(*container_key) {
            for key in keys {
                if let Some(value) = inner.get(*key) {
                    return Some(value);
                }
            }
        }
    }

    None
}

fn value_as_non_empty_string(value: &Value) -> Option<String> {
    match value {
        Value::String(s) => {
            let trimmed = s.trim();
            if trimmed.is_empty() {
                None
            } else {
                Some(trimmed.to_string())
            }
        }
        Value::Number(n) => Some(n.to_string()),
        Value::Bool(b) => Some(b.to_string()),
        _ => None,
    }
}

fn parse_required_string_field(
    map: &Map<String, Value>,
    aliases: &[&str],
    field_name: &str,
) -> Result<String, String> {
    let value = lookup_value(map, aliases).ok_or_else(|| format!("missing {}", field_name))?;
    value_as_non_empty_string(value)
        .ok_or_else(|| format!("{} must be a non-empty string", field_name))
}

fn parse_optional_string_field(
    map: &Map<String, Value>,
    aliases: &[&str],
    field_name: &str,
) -> Result<Option<String>, String> {
    match lookup_value(map, aliases) {
        None | Some(Value::Null) => Ok(None),
        Some(value) => {
            let parsed = value_as_non_empty_string(value)
                .ok_or_else(|| format!("{} must be a string", field_name))?;
            Ok(Some(parsed))
        }
    }
}

fn parse_optional_expires_in(map: &Map<String, Value>) -> Result<Option<u64>, String> {
    match lookup_value(map, &["expires_in", "expiresIn"]) {
        None | Some(Value::Null) => Ok(None),
        Some(Value::Number(value)) => {
            if let Some(as_u64) = value.as_u64() {
                return Ok(Some(as_u64));
            }
            if let Some(as_f64) = value.as_f64() {
                if as_f64.is_finite() && as_f64 >= 0.0 && as_f64.fract() == 0.0 {
                    return Ok(Some(as_f64 as u64));
                }
            }
            Err("expires_in must be a whole non-negative number".to_string())
        }
        Some(Value::String(value)) => {
            let trimmed = value.trim();
            if trimmed.is_empty() {
                return Ok(None);
            }
            let parsed = trimmed
                .parse::<u64>()
                .map_err(|_| "expires_in must be a whole non-negative number".to_string())?;
            Ok(Some(parsed))
        }
        Some(_) => Err("expires_in must be a number or string".to_string()),
    }
}

fn extract_oauth_error(map: &Map<String, Value>) -> Option<String> {
    let error = lookup_value(map, &["error", "error_code"]).and_then(value_as_non_empty_string)?;
    let description = lookup_value(
        map,
        &[
            "error_description",
            "errorDescription",
            "error_message",
            "message",
        ],
    )
    .and_then(value_as_non_empty_string);
    let error_uri =
        lookup_value(map, &["error_uri", "errorUri"]).and_then(value_as_non_empty_string);

    let mut message = error;
    if let Some(description) = description {
        message.push_str(": ");
        message.push_str(&description);
    }
    if let Some(error_uri) = error_uri {
        message.push_str(" (");
        message.push_str(&error_uri);
        message.push(')');
    }

    Some(message)
}

fn map_to_token_response(map: &Map<String, Value>) -> Result<OAuth2TokenResponse, String> {
    let access_token_aliases = &["access_token", "accessToken"];
    let has_access_token = lookup_value(map, access_token_aliases).is_some();

    if !has_access_token {
        if let Some(provider_error) = extract_oauth_error(map) {
            return Err(format!("OAuth provider error: {}", provider_error));
        }
    }

    Ok(OAuth2TokenResponse {
        access_token: parse_required_string_field(map, access_token_aliases, "access_token")?,
        token_type: parse_optional_string_field(map, &["token_type", "tokenType"], "token_type")?,
        expires_in: parse_optional_expires_in(map)?,
        refresh_token: parse_optional_string_field(
            map,
            &["refresh_token", "refreshToken"],
            "refresh_token",
        )?,
        scope: parse_optional_string_field(map, &["scope"], "scope")?,
    })
}

fn parse_json_map(body: &str) -> Result<Map<String, Value>, String> {
    let value: Value =
        serde_json::from_str(body).map_err(|e| format!("JSON parse error: {}", e))?;

    match value {
        Value::Object(map) => Ok(map),
        _ => Err("JSON token response must be an object".to_string()),
    }
}

fn parse_form_map(body: &str) -> Result<Map<String, Value>, String> {
    let form = body.trim_start_matches('?');
    if form.is_empty() {
        return Err("form-encoded response body is empty".to_string());
    }

    let fake_url = format!("http://localhost/?{}", form);
    let url = Url::parse(&fake_url).map_err(|e| format!("form-encoded parse error: {}", e))?;

    let mut values = Map::new();
    for (key, value) in url.query_pairs() {
        values.insert(key.into_owned(), Value::String(value.into_owned()));
    }

    if values.is_empty() {
        return Err("no form fields found".to_string());
    }

    Ok(values)
}

fn looks_like_json(body: &str) -> bool {
    body.starts_with('{') || body.starts_with('[')
}

fn looks_like_form(body: &str) -> bool {
    body.contains('=') && !looks_like_json(body)
}

fn detect_parse_order(trimmed_body: &str, content_type: &str) -> Vec<TokenBodyFormat> {
    let mut order = Vec::new();

    if content_type.contains("json") {
        order.push(TokenBodyFormat::Json);
        order.push(TokenBodyFormat::Form);
    } else if content_type.contains("x-www-form-urlencoded")
        || content_type.contains("form-urlencoded")
    {
        order.push(TokenBodyFormat::Form);
        order.push(TokenBodyFormat::Json);
    } else if looks_like_json(trimmed_body) {
        order.push(TokenBodyFormat::Json);
        order.push(TokenBodyFormat::Form);
    } else if looks_like_form(trimmed_body) {
        order.push(TokenBodyFormat::Form);
        order.push(TokenBodyFormat::Json);
    } else {
        order.push(TokenBodyFormat::Json);
        order.push(TokenBodyFormat::Form);
    }

    order
}

fn parse_oauth_token_body(body: &str, content_type: &str) -> Result<OAuth2TokenResponse, String> {
    let trimmed = body.trim();
    if trimmed.is_empty() {
        return Err("token response body is empty".to_string());
    }

    let mut errors = Vec::new();

    for format in detect_parse_order(trimmed, content_type) {
        let result = match format {
            TokenBodyFormat::Json => {
                parse_json_map(trimmed).and_then(|map| map_to_token_response(&map))
            }
            TokenBodyFormat::Form => {
                parse_form_map(trimmed).and_then(|map| map_to_token_response(&map))
            }
        };

        match result {
            Ok(token) => return Ok(token),
            Err(error) => errors.push(error),
        }
    }

    Err(errors.join("; "))
}

fn parse_oauth_error_body(body: &str, content_type: &str) -> Option<String> {
    let trimmed = body.trim();
    if trimmed.is_empty() {
        return None;
    }

    for format in detect_parse_order(trimmed, content_type) {
        let parsed = match format {
            TokenBodyFormat::Json => parse_json_map(trimmed),
            TokenBodyFormat::Form => parse_form_map(trimmed),
        };

        if let Ok(map) = parsed {
            if let Some(error) = extract_oauth_error(&map) {
                return Some(error);
            }
        }
    }

    None
}

async fn parse_oauth_token_response(res: reqwest::Response) -> Result<OAuth2TokenResponse, String> {
    let content_type = res
        .headers()
        .get("content-type")
        .and_then(|value| value.to_str().ok())
        .unwrap_or_default()
        .to_ascii_lowercase();

    let body = res
        .text()
        .await
        .map_err(|e| format!("Failed to read token response body: {}", e))?;

    parse_oauth_token_body(&body, &content_type).map_err(|error| {
        let content_type_display = if content_type.is_empty() {
            "<missing>"
        } else {
            &content_type
        };
        format!(
            "Failed to parse token response: {} (content-type: {}, body preview: {})",
            error,
            content_type_display,
            oauth_body_preview(&body, 300)
        )
    })
}

async fn oauth_http_error(prefix: &str, res: reqwest::Response) -> String {
    let status = res.status();
    let content_type = res
        .headers()
        .get("content-type")
        .and_then(|value| value.to_str().ok())
        .unwrap_or_default()
        .to_ascii_lowercase();

    let body = res.text().await.unwrap_or_default();
    if let Some(error) = parse_oauth_error_body(&body, &content_type) {
        return format!("{} ({}): {}", prefix, status, error);
    }

    let preview = oauth_body_preview(&body, 300);
    if preview.is_empty() {
        format!("{} ({})", prefix, status)
    } else {
        format!("{} ({}): {}", prefix, status, preview)
    }
}

#[tauri::command]
pub async fn oauth2_token_exchange(
    options: OAuth2TokenExchangeOptions,
    client_wrapper: tauri::State<'_, ClientWrapper>,
) -> Result<OAuth2TokenResponse, String> {
    let token_url = required_field(options.token_url, "token_url")?;
    let grant_type = required_field(options.grant_type, "grant_type")?.to_ascii_lowercase();
    let client_id = required_field(options.client_id, "client_id")?;

    if grant_type != "client_credentials" && grant_type != "password" {
        return Err(format!(
            "Unsupported grant_type: {}. Supported values: client_credentials, password",
            grant_type
        ));
    }

    let mut params = HashMap::new();
    params.insert("grant_type".to_string(), grant_type.clone());
    params.insert("client_id".to_string(), client_id);

    insert_optional_param(&mut params, "client_secret", options.client_secret);
    insert_optional_param(&mut params, "scope", options.scope);

    if grant_type == "password" {
        let username = normalize_optional_input(options.username)
            .ok_or_else(|| "username is required for password grant".to_string())?;
        let password = normalize_optional_input(options.password)
            .ok_or_else(|| "password is required for password grant".to_string())?;

        params.insert("username".to_string(), username);
        params.insert("password".to_string(), password);
    }

    let client = client_wrapper.get_or_init_client()?;
    let res = client
        .post(&token_url)
        .header("accept", OAUTH_TOKEN_ACCEPT_HEADER)
        .timeout(std::time::Duration::from_secs(30))
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Token request failed: {}", e))?;

    if !res.status().is_success() {
        return Err(oauth_http_error("Token request failed", res).await);
    }

    parse_oauth_token_response(res).await
}

#[tauri::command]
pub async fn oauth2_auth_code_flow(
    options: OAuth2AuthCodeOptions,
    app: tauri::AppHandle,
    client_wrapper: tauri::State<'_, ClientWrapper>,
) -> Result<OAuth2TokenResponse, String> {
    let auth_url = required_field(options.auth_url, "auth_url")?;
    let token_url = required_field(options.token_url, "token_url")?;
    let client_id = required_field(options.client_id, "client_id")?;

    let custom_redirect_uri = normalize_optional_input(options.redirect_uri);
    let (listener, redirect_uri) = if let Some(custom_uri) = custom_redirect_uri {
        let url = Url::parse(&custom_uri).map_err(|e| format!("Invalid redirect URI: {}", e))?;

        if url.scheme() != "http" && url.scheme() != "https" {
            return Err("Redirect URI must use http or https".to_string());
        }

        let host = url
            .host_str()
            .ok_or_else(|| "Redirect URI must include a host".to_string())?;
        if host != "localhost" && host != "127.0.0.1" && host != "::1" {
            return Err(
                "Redirect URI host must be localhost, 127.0.0.1, or ::1 for local callback"
                    .to_string(),
            );
        }

        let port = url
            .port()
            .ok_or_else(|| "Redirect URI must include an explicit port".to_string())?;

        let listener = tokio::net::TcpListener::bind(format!("127.0.0.1:{}", port))
            .await
            .map_err(|e| format!("Failed to bind callback server on port {}: {}", port, e))?;

        (listener, custom_uri)
    } else {
        // Prefer the documented default port (users may have registered it as a
        // redirect URI), but fall back to an ephemeral port if it's taken —
        // e.g. a second LitePost instance. RFC 8252 §7.3 requires providers to
        // accept any port on a loopback redirect.
        let listener = match tokio::net::TcpListener::bind("127.0.0.1:17823").await {
            Ok(listener) => listener,
            Err(_) => tokio::net::TcpListener::bind("127.0.0.1:0")
                .await
                .map_err(|e| format!("Failed to bind callback server: {}", e))?,
        };
        let port = listener
            .local_addr()
            .map_err(|e| format!("Failed to read callback server port: {}", e))?
            .port();
        (listener, format!("http://localhost:{}/callback", port))
    };

    let pkce = if options.use_pkce.unwrap_or(false) {
        Some(generate_pkce())
    } else {
        None
    };

    let state = generate_state();

    let mut auth_uri = Url::parse(&auth_url).map_err(|e| format!("Invalid auth URL: {}", e))?;
    auth_uri
        .query_pairs_mut()
        .append_pair("response_type", "code")
        .append_pair("client_id", &client_id)
        .append_pair("redirect_uri", &redirect_uri)
        .append_pair("state", &state);

    if let Some(scope) = normalize_optional_input(options.scope) {
        auth_uri.query_pairs_mut().append_pair("scope", &scope);
    }

    if let Some((_, code_challenge)) = &pkce {
        auth_uri
            .query_pairs_mut()
            .append_pair("code_challenge", code_challenge)
            .append_pair("code_challenge_method", "S256");
    }

    app.opener()
        .open_url(auth_uri.as_str(), None::<&str>)
        .map_err(|e| format!("Failed to open browser: {}", e))?;

    let (code, received_state) = tokio::time::timeout(
        std::time::Duration::from_secs(120),
        wait_for_callback(listener),
    )
    .await
    .map_err(|_| "Authorization timed out after 2 minutes".to_string())?
    .map_err(|e| format!("Callback error: {}", e))?;

    if received_state != state {
        return Err("State mismatch - possible CSRF attack".to_string());
    }

    let mut params = HashMap::new();
    params.insert("grant_type".to_string(), "authorization_code".to_string());
    params.insert("code".to_string(), code);
    params.insert("redirect_uri".to_string(), redirect_uri);
    params.insert("client_id".to_string(), client_id);

    insert_optional_param(&mut params, "client_secret", options.client_secret);

    if let Some((code_verifier, _)) = pkce {
        params.insert("code_verifier".to_string(), code_verifier);
    }

    let client = client_wrapper.get_or_init_client()?;
    let res = client
        .post(&token_url)
        .header("accept", OAUTH_TOKEN_ACCEPT_HEADER)
        .timeout(std::time::Duration::from_secs(30))
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Token exchange failed: {}", e))?;

    if !res.status().is_success() {
        return Err(oauth_http_error("Token exchange failed", res).await);
    }

    parse_oauth_token_response(res).await
}

async fn wait_for_callback(listener: tokio::net::TcpListener) -> Result<(String, String), String> {
    use tokio::io::{AsyncReadExt, AsyncWriteExt};

    let (mut stream, _) = listener
        .accept()
        .await
        .map_err(|e| format!("Accept error: {}", e))?;

    let mut buf = Vec::with_capacity(4096);
    loop {
        let mut chunk = [0u8; 1024];
        let bytes_read = stream
            .read(&mut chunk)
            .await
            .map_err(|e| format!("Read error: {}", e))?;

        if bytes_read == 0 {
            break;
        }

        buf.extend_from_slice(&chunk[..bytes_read]);

        if buf.len() >= 16 * 1024 || buf.windows(4).any(|window| window == b"\r\n\r\n") {
            break;
        }
    }

    if buf.is_empty() {
        return Err("Empty callback request".to_string());
    }

    let request = String::from_utf8_lossy(&buf).to_string();
    let first_line = request
        .lines()
        .next()
        .ok_or_else(|| "Empty request".to_string())?;
    let path = first_line
        .split_whitespace()
        .nth(1)
        .ok_or_else(|| "No path in request".to_string())?;

    let url = Url::parse(&format!("http://localhost{}", path))
        .map_err(|e| format!("Failed to parse callback URL: {}", e))?;

    let mut code = None;
    let mut state = String::new();
    let mut error = None;
    let mut error_description = None;

    for (key, value) in url.query_pairs() {
        match key.as_ref() {
            "code" => code = Some(value.to_string()),
            "state" => state = value.to_string(),
            "error" => error = Some(value.to_string()),
            "error_description" => error_description = Some(value.to_string()),
            _ => {}
        }
    }

    let html = if error.is_some() {
        "<html><body><h2>Authorization Failed</h2><p>You can close this window.</p></body></html>"
    } else {
        "<html><body><h2>Authorization Successful</h2><p>You can close this window and return to LitePost.</p></body></html>"
    };

    let response = format!(
        "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        html.len(),
        html
    );
    let _ = stream.write_all(response.as_bytes()).await;

    if let Some(error) = error {
        if let Some(description) = error_description {
            return Err(format!("Authorization denied: {}: {}", error, description));
        }
        return Err(format!("Authorization denied: {}", error));
    }

    let code = code.ok_or_else(|| "No authorization code received".to_string())?;
    Ok((code, state))
}

fn generate_state() -> String {
    let mut bytes = [0u8; 16];
    rand::rngs::OsRng.fill_bytes(&mut bytes);
    general_purpose::URL_SAFE_NO_PAD.encode(bytes)
}

/// Generate PKCE code_verifier and code_challenge (S256).
/// Returns (code_verifier, code_challenge).
fn generate_pkce() -> (String, String) {
    use sha2::{Digest, Sha256};

    let mut bytes = [0u8; 64];
    rand::rngs::OsRng.fill_bytes(&mut bytes);

    let code_verifier = general_purpose::URL_SAFE_NO_PAD.encode(bytes);

    let mut hasher = Sha256::new();
    hasher.update(code_verifier.as_bytes());
    let code_challenge = general_purpose::URL_SAFE_NO_PAD.encode(hasher.finalize());

    (code_verifier, code_challenge)
}

#[tauri::command]
pub async fn oauth2_refresh(
    options: OAuth2RefreshOptions,
    client_wrapper: tauri::State<'_, ClientWrapper>,
) -> Result<OAuth2TokenResponse, String> {
    let token_url = required_field(options.token_url, "token_url")?;
    let client_id = required_field(options.client_id, "client_id")?;
    let refresh_token = required_field(options.refresh_token, "refresh_token")?;

    let mut params = HashMap::new();
    params.insert("grant_type".to_string(), "refresh_token".to_string());
    params.insert("refresh_token".to_string(), refresh_token);
    params.insert("client_id".to_string(), client_id);

    insert_optional_param(&mut params, "client_secret", options.client_secret);

    let client = client_wrapper.get_or_init_client()?;
    let res = client
        .post(&token_url)
        .header("accept", OAUTH_TOKEN_ACCEPT_HEADER)
        .timeout(std::time::Duration::from_secs(30))
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Refresh token request failed: {}", e))?;

    if !res.status().is_success() {
        return Err(oauth_http_error("Refresh failed", res).await);
    }

    parse_oauth_token_response(res).await
}

#[cfg(test)]
mod oauth_parser_tests {
    use super::*;

    #[test]
    fn parses_json_token_response() {
        let body = r#"{"access_token":"abc123","token_type":"bearer","expires_in":3600}"#;
        let token = parse_oauth_token_body(body, "application/json").unwrap();

        assert_eq!(token.access_token, "abc123");
        assert_eq!(token.token_type.as_deref(), Some("bearer"));
        assert_eq!(token.expires_in, Some(3600));
    }

    #[test]
    fn parses_form_encoded_token_response() {
        let body = "access_token=xyz789&token_type=bearer&scope=repo%20user&expires_in=7200";
        let token = parse_oauth_token_body(body, "application/x-www-form-urlencoded").unwrap();

        assert_eq!(token.access_token, "xyz789");
        assert_eq!(token.token_type.as_deref(), Some("bearer"));
        assert_eq!(token.scope.as_deref(), Some("repo user"));
        assert_eq!(token.expires_in, Some(7200));
    }

    #[test]
    fn parses_json_with_string_expires_in() {
        let body = r#"{"access_token":"token","expires_in":"1800"}"#;
        let token = parse_oauth_token_body(body, "application/json").unwrap();

        assert_eq!(token.access_token, "token");
        assert_eq!(token.expires_in, Some(1800));
    }

    #[test]
    fn falls_back_to_json_when_content_type_is_text_plain() {
        let body = r#"{"access_token":"from_text_plain","token_type":"bearer"}"#;
        let token = parse_oauth_token_body(body, "text/plain").unwrap();

        assert_eq!(token.access_token, "from_text_plain");
        assert_eq!(token.token_type.as_deref(), Some("bearer"));
    }

    #[test]
    fn falls_back_to_form_when_content_type_is_text_plain() {
        let body = "access_token=from_text_plain_form&token_type=bearer";
        let token = parse_oauth_token_body(body, "text/plain").unwrap();

        assert_eq!(token.access_token, "from_text_plain_form");
        assert_eq!(token.token_type.as_deref(), Some("bearer"));
    }

    #[test]
    fn parses_wrapped_camel_case_token_payload() {
        let body = r#"{"data":{"accessToken":"wrapped","tokenType":"Bearer","expiresIn":"60"}}"#;
        let token = parse_oauth_token_body(body, "application/json").unwrap();

        assert_eq!(token.access_token, "wrapped");
        assert_eq!(token.token_type.as_deref(), Some("Bearer"));
        assert_eq!(token.expires_in, Some(60));
    }

    #[test]
    fn surfaces_json_provider_errors() {
        let body = r#"{"error":"invalid_client","error_description":"Bad client secret"}"#;
        let error = parse_oauth_token_body(body, "application/json").unwrap_err();

        assert!(error.contains("invalid_client"));
        assert!(error.contains("Bad client secret"));
    }

    #[test]
    fn surfaces_form_provider_errors() {
        let body = "error=invalid_grant&error_description=Code+expired";
        let error = parse_oauth_token_body(body, "application/x-www-form-urlencoded").unwrap_err();

        assert!(error.contains("invalid_grant"));
        assert!(error.contains("Code expired"));
    }
}
