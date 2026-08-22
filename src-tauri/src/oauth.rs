use base64::engine::general_purpose;
use base64::Engine as _;
use rand::RngCore;
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use std::collections::HashMap;
use tauri::Emitter;
use tauri::Url;
use tauri_plugin_http::reqwest;
use tauri_plugin_opener::OpenerExt;

use crate::models::{ClientWrapper, PendingOAuthFlows};

const OAUTH_TOKEN_ACCEPT_HEADER: &str =
    "application/json, application/x-www-form-urlencoded, text/plain";
const TOKEN_CONTAINER_KEYS: &[&str] = &["data", "token", "result", "response"];

/// How long to wait for the provider to redirect back to the loopback listener.
///
/// Deliberately generous: a real sign-in can involve MFA, an account chooser and
/// a password manager. Cancelling is the UI's job, not the timeout's.
const AUTH_CALLBACK_TIMEOUT_SECS: u64 = 300;

/// RFC 8628 §3.2 defaults, used when the provider omits the fields. The expiry
/// ceiling also bounds a provider-supplied lifetime so an extravagant
/// `expires_in` cannot leave a poll loop running for hours.
const DEVICE_CODE_DEFAULT_EXPIRES_SECS: u64 = 900;
const DEVICE_CODE_MAX_EXPIRES_SECS: u64 = 1800;

/// POST a form to an OAuth endpoint with the standard accept header and
/// timeout. Every token/device request in this module sends the same shape;
/// `err_prefix` labels a transport failure ("Token request failed: ...").
async fn post_oauth_form(
    client: &reqwest::Client,
    url: &str,
    params: &HashMap<String, String>,
    err_prefix: &str,
) -> Result<reqwest::Response, String> {
    client
        .post(url)
        .header("accept", OAUTH_TOKEN_ACCEPT_HEADER)
        .timeout(std::time::Duration::from_secs(30))
        .form(params)
        .send()
        .await
        .map_err(|e| format!("{}: {}", err_prefix, e))
}
const DEVICE_POLL_DEFAULT_INTERVAL_SECS: u64 = 5;

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
    /// Identifies this flow so the UI can cancel it. Optional — a flow started
    /// without one simply cannot be cancelled, which keeps older callers working.
    #[serde(default)]
    flow_id: Option<String>,
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

fn parse_optional_u64_field(
    map: &Map<String, Value>,
    aliases: &[&str],
    field_name: &str,
) -> Result<Option<u64>, String> {
    match lookup_value(map, aliases) {
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
            Err(format!("{} must be a whole non-negative number", field_name))
        }
        Some(Value::String(value)) => {
            let trimmed = value.trim();
            if trimmed.is_empty() {
                return Ok(None);
            }
            let parsed = trimmed
                .parse::<u64>()
                .map_err(|_| format!("{} must be a whole non-negative number", field_name))?;
            Ok(Some(parsed))
        }
        Some(_) => Err(format!("{} must be a number or string", field_name)),
    }
}

fn parse_optional_expires_in(map: &Map<String, Value>) -> Result<Option<u64>, String> {
    parse_optional_u64_field(map, &["expires_in", "expiresIn"], "expires_in")
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

/// The provider's answer to a device authorization request (RFC 8628 §3.2).
#[derive(Debug, Clone, PartialEq)]
struct DeviceAuthorization {
    device_code: String,
    user_code: String,
    verification_uri: String,
    verification_uri_complete: Option<String>,
    expires_in: u64,
    interval: u64,
}

fn map_to_device_authorization(map: &Map<String, Value>) -> Result<DeviceAuthorization, String> {
    let device_code_aliases = &["device_code", "deviceCode"];

    if lookup_value(map, device_code_aliases).is_none() {
        if let Some(provider_error) = extract_oauth_error(map) {
            return Err(format!("OAuth provider error: {}", provider_error));
        }
    }

    Ok(DeviceAuthorization {
        device_code: parse_required_string_field(map, device_code_aliases, "device_code")?,
        user_code: parse_required_string_field(map, &["user_code", "userCode"], "user_code")?,
        // Google answers with `verification_url`, despite RFC 8628 naming the
        // field `verification_uri`.
        verification_uri: parse_required_string_field(
            map,
            &[
                "verification_uri",
                "verification_url",
                "verificationUri",
                "verificationUrl",
            ],
            "verification_uri",
        )?,
        verification_uri_complete: parse_optional_string_field(
            map,
            &[
                "verification_uri_complete",
                "verification_url_complete",
                "verificationUriComplete",
            ],
            "verification_uri_complete",
        )?,
        expires_in: parse_optional_expires_in(map)?.unwrap_or(DEVICE_CODE_DEFAULT_EXPIRES_SECS),
        interval: parse_optional_u64_field(map, &["interval"], "interval")?
            .unwrap_or(DEVICE_POLL_DEFAULT_INTERVAL_SECS),
    })
}

fn parse_device_authorization_body(
    body: &str,
    content_type: &str,
) -> Result<DeviceAuthorization, String> {
    let trimmed = body.trim();
    if trimmed.is_empty() {
        return Err("device authorization response body is empty".to_string());
    }

    let mut errors = Vec::new();

    for format in detect_parse_order(trimmed, content_type) {
        let result = match format {
            TokenBodyFormat::Json => parse_json_map(trimmed),
            TokenBodyFormat::Form => parse_form_map(trimmed),
        }
        .and_then(|map| map_to_device_authorization(&map));

        match result {
            Ok(device) => return Ok(device),
            Err(error) => errors.push(error),
        }
    }

    Err(errors.join("; "))
}

/// What one round of polling the token endpoint told us.
#[derive(Debug)]
enum DevicePollOutcome {
    Token(OAuth2TokenResponse),
    /// The user has not approved yet — keep polling.
    Pending,
    /// The provider asked us to back off (RFC 8628 §3.5: add 5 seconds).
    SlowDown,
}

fn parse_device_poll_body(body: &str, content_type: &str) -> Result<DevicePollOutcome, String> {
    let trimmed = body.trim();
    if trimmed.is_empty() {
        return Err("token response body is empty".to_string());
    }

    let mut errors = Vec::new();

    for format in detect_parse_order(trimmed, content_type) {
        let map = match format {
            TokenBodyFormat::Json => parse_json_map(trimmed),
            TokenBodyFormat::Form => parse_form_map(trimmed),
        };
        let map = match map {
            Ok(map) => map,
            Err(error) => {
                errors.push(error);
                continue;
            }
        };

        // The RFC reports poll state as an `error` with HTTP 400, but GitHub
        // sends the same body with HTTP 200 — so the body, not the status,
        // decides what happened.
        let error_code =
            lookup_value(&map, &["error", "error_code"]).and_then(value_as_non_empty_string);
        match error_code.as_deref() {
            Some("authorization_pending") => return Ok(DevicePollOutcome::Pending),
            Some("slow_down") => return Ok(DevicePollOutcome::SlowDown),
            Some(_) => {
                let message = extract_oauth_error(&map)
                    .unwrap_or_else(|| "unknown provider error".to_string());
                return Err(format!("OAuth provider error: {}", message));
            }
            None => {}
        }

        match map_to_token_response(&map) {
            Ok(token) => return Ok(DevicePollOutcome::Token(token)),
            Err(error) => errors.push(error),
        }
    }

    Err(errors.join("; "))
}

/// Split a response into its lowercased content-type and body text.
async fn read_response_body(res: reqwest::Response) -> Result<(String, String), String> {
    let content_type = res
        .headers()
        .get("content-type")
        .and_then(|value| value.to_str().ok())
        .unwrap_or_default()
        .to_ascii_lowercase();

    let body = res
        .text()
        .await
        .map_err(|e| format!("Failed to read response body: {}", e))?;

    Ok((content_type, body))
}

async fn parse_oauth_token_response(res: reqwest::Response) -> Result<OAuth2TokenResponse, String> {
    let (content_type, body) = read_response_body(res).await?;

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
    let res = post_oauth_form(&client, &token_url, &params, "Token request failed").await?;

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
    pending_flows: tauri::State<'_, PendingOAuthFlows>,
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

    // Register a cancel channel so the UI can abort a flow that is never going
    // to complete. Signing in can legitimately take a while (MFA, a password
    // manager, picking an account), so the timeout is generous and the cancel
    // button is the real escape hatch.
    let (cancel_tx, mut cancel_rx) = tokio::sync::watch::channel(false);
    let flow_id = normalize_optional_input(options.flow_id);
    if let Some(id) = &flow_id {
        pending_flows
            .flows
            .lock()
            .map_err(|_| "Failed to register the authorization flow".to_string())?
            .insert(id.clone(), cancel_tx);
    }

    let outcome = tokio::select! {
        result = tokio::time::timeout(
            std::time::Duration::from_secs(AUTH_CALLBACK_TIMEOUT_SECS),
            wait_for_callback(listener),
        ) => match result {
            Ok(inner) => inner.map_err(|e| format!("Callback error: {}", e)),
            Err(_) => Err(format!(
                "Timed out after {} minutes waiting for the provider to redirect back. \
                 If your browser showed an error instead of a sign-in page, register \
                 exactly this callback URL with the provider: {}",
                AUTH_CALLBACK_TIMEOUT_SECS / 60,
                redirect_uri
            )),
        },
        _ = cancel_rx.changed() => Err("Authorization cancelled".to_string()),
    };

    // Always deregister, whichever way the flow ended, so a retry with the same
    // id does not find a stale sender.
    if let Some(id) = &flow_id {
        if let Ok(mut flows) = pending_flows.flows.lock() {
            flows.remove(id);
        }
    }

    let (code, received_state) = outcome?;

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
    let res = post_oauth_form(&client, &token_url, &params, "Token exchange failed").await?;

    if !res.status().is_success() {
        return Err(oauth_http_error("Token exchange failed", res).await);
    }

    parse_oauth_token_response(res).await
}

/// Abort an in-flight authorization code flow.
///
/// Returns whether a flow was actually waiting: the UI uses that to tell "we
/// stopped it" apart from "it had already finished or timed out".
#[tauri::command]
pub async fn oauth2_cancel_flow(
    flow_id: String,
    pending_flows: tauri::State<'_, PendingOAuthFlows>,
) -> Result<bool, String> {
    let sender = pending_flows
        .flows
        .lock()
        .map_err(|_| "Failed to read in-flight authorization flows".to_string())?
        .remove(&flow_id);

    match sender {
        // The receiver side treats any change as cancellation, so the value
        // only has to differ from the `false` it was created with.
        Some(sender) => Ok(sender.send(true).is_ok()),
        None => Ok(false),
    }
}

#[derive(Debug, Deserialize)]
pub struct OAuth2DeviceFlowOptions {
    device_auth_url: String,
    token_url: String,
    client_id: String,
    client_secret: Option<String>,
    scope: Option<String>,
    /// Identifies this flow so the UI can cancel it and receive the user-code
    /// event. Optional for the same reason as on the authorization code flow.
    #[serde(default)]
    flow_id: Option<String>,
}

/// What the UI must show while the poll loop waits: the code the user has to
/// enter, and where to enter it.
#[derive(Debug, Serialize, Clone)]
struct OAuth2DevicePromptPayload {
    user_code: String,
    verification_uri: String,
    verification_uri_complete: Option<String>,
    expires_in: u64,
}

#[tauri::command]
pub async fn oauth2_device_flow(
    options: OAuth2DeviceFlowOptions,
    app: tauri::AppHandle,
    client_wrapper: tauri::State<'_, ClientWrapper>,
    pending_flows: tauri::State<'_, PendingOAuthFlows>,
) -> Result<OAuth2TokenResponse, String> {
    let device_auth_url = required_field(options.device_auth_url, "device_auth_url")?;
    let token_url = required_field(options.token_url, "token_url")?;
    let client_id = required_field(options.client_id, "client_id")?;
    let client_secret = normalize_optional_input(options.client_secret);

    let client = client_wrapper.get_or_init_client()?;

    let mut params = HashMap::new();
    params.insert("client_id".to_string(), client_id.clone());
    insert_optional_param(&mut params, "scope", options.scope);
    if let Some(secret) = &client_secret {
        params.insert("client_secret".to_string(), secret.clone());
    }

    let res = post_oauth_form(
        &client,
        &device_auth_url,
        &params,
        "Device authorization request failed",
    )
    .await?;

    if !res.status().is_success() {
        return Err(oauth_http_error("Device authorization request failed", res).await);
    }

    let (content_type, body) = read_response_body(res).await?;
    let device = parse_device_authorization_body(&body, &content_type).map_err(|error| {
        format!(
            "Failed to parse device authorization response: {} (body preview: {})",
            error,
            oauth_body_preview(&body, 300)
        )
    })?;

    // Hand the UI the code before opening the browser, so it is already on
    // screen when the user lands on the verification page.
    let flow_id = normalize_optional_input(options.flow_id);
    if let Some(id) = &flow_id {
        let _ = app.emit(
            &format!("oauth-device-prompt-{}", id),
            OAuth2DevicePromptPayload {
                user_code: device.user_code.clone(),
                verification_uri: device.verification_uri.clone(),
                verification_uri_complete: device.verification_uri_complete.clone(),
                expires_in: device.expires_in,
            },
        );
    }

    // `verification_uri_complete` arrives with the code pre-filled; the plain
    // URI asks the user to type it. The code stays visible in the app either
    // way, so the user can check it matches what the page shows.
    let open_url = device
        .verification_uri_complete
        .as_deref()
        .unwrap_or(&device.verification_uri);
    app.opener()
        .open_url(open_url, None::<&str>)
        .map_err(|e| format!("Failed to open browser: {}", e))?;

    let (cancel_tx, mut cancel_rx) = tokio::sync::watch::channel(false);
    if let Some(id) = &flow_id {
        pending_flows
            .flows
            .lock()
            .map_err(|_| "Failed to register the authorization flow".to_string())?
            .insert(id.clone(), cancel_tx);
    }

    let poll = async {
        let mut interval = device.interval.max(1);
        loop {
            tokio::time::sleep(std::time::Duration::from_secs(interval)).await;

            let mut poll_params = HashMap::new();
            poll_params.insert(
                "grant_type".to_string(),
                "urn:ietf:params:oauth:grant-type:device_code".to_string(),
            );
            poll_params.insert("device_code".to_string(), device.device_code.clone());
            poll_params.insert("client_id".to_string(), client_id.clone());
            if let Some(secret) = &client_secret {
                poll_params.insert("client_secret".to_string(), secret.clone());
            }

            let res =
                post_oauth_form(&client, &token_url, &poll_params, "Token request failed").await?;

            let status = res.status();
            let (content_type, body) = read_response_body(res).await?;

            match parse_device_poll_body(&body, &content_type) {
                Ok(DevicePollOutcome::Token(token)) => return Ok(token),
                Ok(DevicePollOutcome::Pending) => {}
                Ok(DevicePollOutcome::SlowDown) => interval += 5,
                Err(error) => {
                    return Err(if status.is_success() {
                        format!(
                            "Failed to parse token response: {} (body preview: {})",
                            error,
                            oauth_body_preview(&body, 300)
                        )
                    } else {
                        format!("Token request failed ({}): {}", status, error)
                    });
                }
            }
        }
    };

    let expires_in = device.expires_in.min(DEVICE_CODE_MAX_EXPIRES_SECS);
    let outcome = tokio::select! {
        result = tokio::time::timeout(std::time::Duration::from_secs(expires_in), poll) => match result {
            Ok(inner) => inner,
            Err(_) => Err(format!(
                "The device code expired after {} minutes without the sign-in being approved. \
                 Get a new token to start over with a fresh code.",
                expires_in.div_ceil(60)
            )),
        },
        _ = cancel_rx.changed() => Err("Authorization cancelled".to_string()),
    };

    if let Some(id) = &flow_id {
        if let Ok(mut flows) = pending_flows.flows.lock() {
            flows.remove(id);
        }
    }

    outcome
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
    let res = post_oauth_form(&client, &token_url, &params, "Refresh token request failed").await?;

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

    #[test]
    fn parses_device_authorization_json() {
        let body = r#"{
            "device_code": "dev-abc",
            "user_code": "WDJB-MJHT",
            "verification_uri": "https://example.com/activate",
            "verification_uri_complete": "https://example.com/activate?user_code=WDJB-MJHT",
            "expires_in": 1800,
            "interval": 10
        }"#;
        let device = parse_device_authorization_body(body, "application/json").unwrap();

        assert_eq!(device.device_code, "dev-abc");
        assert_eq!(device.user_code, "WDJB-MJHT");
        assert_eq!(device.verification_uri, "https://example.com/activate");
        assert_eq!(
            device.verification_uri_complete.as_deref(),
            Some("https://example.com/activate?user_code=WDJB-MJHT")
        );
        assert_eq!(device.expires_in, 1800);
        assert_eq!(device.interval, 10);
    }

    #[test]
    fn device_authorization_accepts_googles_verification_url_spelling() {
        let body = r#"{
            "device_code": "dev-goog",
            "user_code": "ABCD-EFGH",
            "verification_url": "https://www.google.com/device",
            "expires_in": 1800,
            "interval": 5
        }"#;
        let device = parse_device_authorization_body(body, "application/json").unwrap();

        assert_eq!(device.verification_uri, "https://www.google.com/device");
    }

    #[test]
    fn device_authorization_defaults_missing_expiry_and_interval() {
        let body = r#"{"device_code":"d","user_code":"u","verification_uri":"https://x.test"}"#;
        let device = parse_device_authorization_body(body, "application/json").unwrap();

        assert_eq!(device.expires_in, DEVICE_CODE_DEFAULT_EXPIRES_SECS);
        assert_eq!(device.interval, DEVICE_POLL_DEFAULT_INTERVAL_SECS);
    }

    #[test]
    fn device_authorization_parses_form_encoded_body() {
        // GitHub answers form-encoded unless asked for JSON.
        let body = "device_code=dc123&user_code=ABCD-1234&verification_uri=https%3A%2F%2Fgithub.com%2Flogin%2Fdevice&expires_in=899&interval=5";
        let device =
            parse_device_authorization_body(body, "application/x-www-form-urlencoded").unwrap();

        assert_eq!(device.device_code, "dc123");
        assert_eq!(device.user_code, "ABCD-1234");
        assert_eq!(device.verification_uri, "https://github.com/login/device");
        assert_eq!(device.expires_in, 899);
    }

    #[test]
    fn device_authorization_surfaces_provider_errors() {
        let body = r#"{"error":"unauthorized_client","error_description":"Device flow not enabled"}"#;
        let error = parse_device_authorization_body(body, "application/json").unwrap_err();

        assert!(error.contains("unauthorized_client"));
        assert!(error.contains("Device flow not enabled"));
    }

    #[test]
    fn device_poll_treats_pending_as_keep_going() {
        let body = r#"{"error":"authorization_pending"}"#;
        assert!(matches!(
            parse_device_poll_body(body, "application/json"),
            Ok(DevicePollOutcome::Pending)
        ));
    }

    #[test]
    fn device_poll_treats_github_200_form_pending_as_keep_going() {
        // GitHub reports poll state with HTTP 200 and a form body, so the parse
        // must not depend on the status code or JSON.
        let body = "error=authorization_pending&error_description=The+authorization+request+is+still+pending";
        assert!(matches!(
            parse_device_poll_body(body, "application/x-www-form-urlencoded"),
            Ok(DevicePollOutcome::Pending)
        ));
    }

    #[test]
    fn device_poll_recognizes_slow_down() {
        let body = r#"{"error":"slow_down"}"#;
        assert!(matches!(
            parse_device_poll_body(body, "application/json"),
            Ok(DevicePollOutcome::SlowDown)
        ));
    }

    #[test]
    fn device_poll_fails_on_denial() {
        let body = r#"{"error":"access_denied","error_description":"User declined"}"#;
        let error = parse_device_poll_body(body, "application/json").unwrap_err();

        assert!(error.contains("access_denied"));
        assert!(error.contains("User declined"));
    }

    #[test]
    fn device_poll_returns_the_token_when_approved() {
        let body = r#"{"access_token":"tok-1","token_type":"bearer","expires_in":3600}"#;
        let outcome = parse_device_poll_body(body, "application/json").unwrap();

        match outcome {
            DevicePollOutcome::Token(token) => {
                assert_eq!(token.access_token, "tok-1");
                assert_eq!(token.expires_in, Some(3600));
            }
            _ => panic!("expected a token"),
        }
    }
}
