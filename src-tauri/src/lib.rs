// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri_plugin_http::reqwest::{self, Client, header::{HeaderMap, HeaderName, HeaderValue}};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tauri::http::method::Method;
use tauri::Url;
use std::str::FromStr;
use base64;

#[derive(Debug, Serialize, Deserialize)]
struct RequestOptions {
    method: String,
    url: String,
    headers: HashMap<String, String>,
    body: Option<String>,
    content_type: Option<String>,
    cookies: Vec<Cookie>,
}

#[derive(Debug, Serialize, Deserialize)]
struct Cookie {
    name: String,
    value: String,
    domain: Option<String>,
    path: Option<String>,
    expires: Option<String>,
    secure: Option<bool>,
    http_only: Option<bool>,
}

#[derive(Debug, Serialize)]
struct ResponseTiming {
    start: u128,
    end: u128,
    duration: u128,
    dns: Option<u128>,
    tcp: Option<u128>,
    tls: Option<u128>,
    request: Option<u128>,
    first_byte: Option<u128>,
    download: Option<u128>,
    total: u128,
}

#[derive(Debug, Serialize)]
struct ResponseSize {
    headers: usize,
    body: usize,
    total: usize,
}

#[derive(Debug, Serialize)]
struct RedirectInfo {
    url: String,
    status: u16,
    status_text: String,
    headers: HashMap<String, String>,
    cookies: Vec<String>,
    timing: Option<ResponseTiming>,
    size: Option<ResponseSize>,
}

#[derive(Debug, Serialize)]
struct ResponseData {
    status: u16,
    status_text: String,
    headers: HashMap<String, String>,
    body: String,
    is_base64: bool,
    redirect_chain: Vec<RedirectInfo>,
    cookies: Vec<String>,
    timing: Option<ResponseTiming>,
    size: Option<ResponseSize>,
}

// Add new struct for application state
struct AppState {
    client: Client,
}

#[derive(Clone)]
struct ClientWrapper {
    client: Client,
    cookie_jar: Arc<reqwest::cookie::Jar>,
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn send_request(
    options: RequestOptions,
    client_wrapper: tauri::State<'_, ClientWrapper>,
) -> Result<ResponseData, String> {
    let client = &client_wrapper.client;
    let cookie_jar = &client_wrapper.cookie_jar;
    let start_time = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis();

    // Add UI cookies to the cookie store
    let url = Url::parse(&options.url).map_err(|e| e.to_string())?;
    for cookie in &options.cookies {
        let cookie_str = format!("{}={}", cookie.name, cookie.value);
        cookie_jar.add_cookie_str(&cookie_str, &url);
    }

    let mut headers = HeaderMap::new();
    for (key, value) in options.headers {
        // Skip Cookie header as we're handling cookies separately
        if key.to_lowercase() != "cookie" {
            headers.insert(
                HeaderName::from_str(&key).map_err(|e| e.to_string())?,
                HeaderValue::from_str(&value).map_err(|e| e.to_string())?
            );
        }
    }

    // Add content type header if body is present
    if options.body.is_some() && !headers.contains_key(HeaderName::from_static("content-type")) {
        if let Some(content_type) = options.content_type {
            headers.insert(
                HeaderName::from_static("content-type"),
                HeaderValue::from_str(&content_type).map_err(|e| e.to_string())?
            );
        }
    }

    let mut request = client.request(
        Method::from_str(&options.method).map_err(|e| e.to_string())?,
        &options.url
    )
    .headers(headers);

    if let Some(body) = options.body {
        request = request.body(body);
    }

    let mut current_url = options.url;
    let mut redirect_chain = Vec::new();
    let mut response = None;

    for i in 0..10 { // Max 10 redirects
        let dns_start = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis();

        let resp = request
            .try_clone()
            .ok_or_else(|| "Failed to clone request".to_string())?
            .send()
            .await
            .map_err(|e| e.to_string())?;

        let first_byte_time = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis();

        let status = resp.status();
        let headers: HashMap<String, String> = resp
            .headers()
            .iter()
            .map(|(k, v)| (k.to_string(), v.to_str().unwrap_or("").to_string()))
            .collect();

        // Calculate headers size
        let headers_size = headers.iter()
            .map(|(k, v)| k.len() + v.len() + 4) // +4 for ": " and "\r\n"
            .sum();

        if status.is_redirection() {
            if let Some(location) = resp.headers().get("location") {
                let location = location.to_str().map_err(|e| e.to_string())?;
                let next_url = Url::parse(&current_url)
                    .map_err(|e| e.to_string())?
                    .join(location)
                    .map_err(|e| e.to_string())?
                    .to_string();

                let redirect_cookies: Vec<String> = resp.headers()
                    .get_all("set-cookie")
                    .iter()
                    .filter_map(|h| h.to_str().ok())
                    .map(String::from)
                    .collect();

                let end_time = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_millis();

                redirect_chain.push(RedirectInfo {
                    url: current_url.clone(),
                    status: status.as_u16(),
                    status_text: status.to_string(),
                    headers: headers.clone(),
                    cookies: redirect_cookies,
                    timing: Some(ResponseTiming {
                        start: dns_start,
                        end: end_time,
                        duration: end_time - dns_start,
                        dns: Some(first_byte_time - dns_start),
                        tcp: None,
                        tls: None,
                        request: None,
                        first_byte: Some(first_byte_time - dns_start),
                        download: Some(end_time - first_byte_time),
                        total: end_time - dns_start,
                    }),
                    size: Some(ResponseSize {
                        headers: headers_size,
                        body: 0, // Redirects don't typically have bodies
                        total: headers_size,
                    }),
                });

                if i == 9 {
                    return Err("Maximum redirect limit (10) exceeded. The server might be in a redirect loop.".to_string());
                }

                current_url = next_url;
                request = client.request(
                    Method::from_str(&options.method).map_err(|e| e.to_string())?,
                    &current_url
                );
                continue;
            }
        }

        response = Some((resp, dns_start, first_byte_time));
        break;
    }

    let (final_response, dns_start, first_byte_time) = response.ok_or_else(|| "No response received".to_string())?;
    let status = final_response.status();
    let headers: HashMap<String, String> = final_response
        .headers()
        .iter()
        .map(|(k, v)| (k.to_string(), v.to_str().unwrap_or("").to_string()))
        .collect();

    // Calculate headers size
    let headers_size = headers.iter()
        .map(|(k, v)| k.len() + v.len() + 4) // +4 for ": " and "\r\n"
        .sum();

    let mut all_cookies = Vec::new();
    
    // Collect cookies from redirect chain
    for redirect in &redirect_chain {
        all_cookies.extend(redirect.cookies.clone());
    }
    
    // Add cookies from final response
    all_cookies.extend(
        final_response.headers()
            .get_all("set-cookie")
            .iter()
            .filter_map(|h| h.to_str().ok())
            .map(String::from)
    );

    // Check content type to determine if response is binary
    let content_type = headers.get("content-type").map(|s| s.to_lowercase());
    let is_binary = content_type.as_ref().map_or(false, |ct| 
        (ct.starts_with("image/") && !ct.starts_with("image/svg")) || // SVG is text-based XML
        ct.starts_with("application/octet-stream") ||
        ct.starts_with("audio/") ||
        ct.starts_with("video/")
    );

    let (body, body_size, is_base64) = if is_binary {
        // For binary data, get bytes and base64 encode
        let bytes = final_response.bytes().await.map_err(|e| e.to_string())?;
        let size = bytes.len();
        (base64::encode(bytes), size, true)
    } else {
        // For text data (including SVG), get as string
        let text = final_response.text().await.map_err(|e| e.to_string())?;
        let size = text.len();
        (text, size, false)
    };

    let end_time = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis();

    Ok(ResponseData {
        status: status.as_u16(),
        status_text: status.to_string(),
        headers,
        body,
        is_base64,
        redirect_chain,
        cookies: all_cookies,
        timing: Some(ResponseTiming {
            start: start_time,
            end: end_time,
            duration: end_time - start_time,
            dns: Some(first_byte_time - dns_start),
            tcp: None,
            tls: None,
            request: None,
            first_byte: Some(first_byte_time - dns_start),
            download: Some(end_time - first_byte_time),
            total: end_time - start_time,
        }),
        size: Some(ResponseSize {
            headers: headers_size,
            body: body_size,
            total: headers_size + body_size,
        }),
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let cookie_jar = Arc::new(reqwest::cookie::Jar::default());
    
    tauri::Builder::default()
        .manage(ClientWrapper {
            client: Client::builder()
                .redirect(reqwest::redirect::Policy::none())
                .cookie_store(true)
                .cookie_provider(cookie_jar.clone())
                .build()
                .unwrap(),
            cookie_jar,
        })
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, send_request])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
