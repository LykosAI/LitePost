use base64::engine::general_purpose;
use base64::Engine as _;
use curl::easy::{Easy, List};
use std::collections::HashMap;
use std::path::Path;
use std::time::Duration;
use tauri::Url;

use crate::models::{
    ClientWrapper, RedirectInfo, RequestOptions, ResponseData, ResponseSize, ResponseTiming,
};
use crate::network_utils::now_millis;

fn is_binary_content_type(content_type: Option<&String>) -> bool {
    let Some(content_type) = content_type else {
        return false;
    };

    let ct = content_type.to_ascii_lowercase();
    (ct.starts_with("image/") && !ct.starts_with("image/svg"))
        || ct.starts_with("application/octet-stream")
        || ct.starts_with("application/pdf")
        || ct.starts_with("application/zip")
        || ct.starts_with("application/gzip")
        || ct.starts_with("application/x-tar")
        || ct.starts_with("application/x-gzip")
        || ct.starts_with("application/x-bzip2")
        || ct.starts_with("application/x-7z-compressed")
        || ct.starts_with("application/vnd.ms-")
        || ct.starts_with("application/vnd.openxmlformats-")
        || ct.starts_with("application/wasm")
        || ct.starts_with("font/")
        || ct.starts_with("audio/")
        || ct.starts_with("video/")
}

#[derive(Clone)]
struct StoredCookie {
    name: String,
    value: String,
    domain: String,
    path: String,
    secure: bool,
}

fn build_request_header_lines(options: &RequestOptions) -> Vec<String> {
    let mut headers = Vec::new();
    let mut has_content_type = false;

    for (key, value) in &options.headers {
        if key.eq_ignore_ascii_case("cookie") {
            continue;
        }
        if key.eq_ignore_ascii_case("content-type") {
            has_content_type = true;
        }
        headers.push(format!("{}: {}", key, value));
    }

    if options.body.is_some() && !has_content_type {
        if let Some(content_type) = options.content_type.as_deref() {
            headers.push(format!("Content-Type: {}", content_type));
        }
    }

    headers
}

fn set_or_replace_content_type(headers: &mut Vec<String>, content_type: &str) {
    headers.retain(|header| {
        header
            .split_once(':')
            .map(|(name, _)| !name.trim().eq_ignore_ascii_case("content-type"))
            .unwrap_or(true)
    });
    headers.push(format!("Content-Type: {}", content_type));
}

fn parse_status_line(line: &str) -> Option<(u16, String)> {
    if !line.starts_with("HTTP/") {
        return None;
    }

    let mut parts = line.splitn(3, ' ');
    let _http_version = parts.next()?;
    let status = parts.next()?.parse::<u16>().ok()?;
    let reason = parts.next().unwrap_or_default().trim();
    let status_text = if reason.is_empty() {
        status.to_string()
    } else {
        format!("{} {}", status, reason)
    };

    Some((status, status_text))
}

fn parse_cookie_name_value(set_cookie: &str) -> Option<(String, String)> {
    let first_segment = set_cookie.split(';').next()?.trim();
    let (name, value) = first_segment.split_once('=')?;
    if name.trim().is_empty() {
        return None;
    }
    Some((name.trim().to_string(), value.trim().to_string()))
}

fn normalize_cookie_domain(domain: &str) -> String {
    domain.trim().trim_start_matches('.').to_ascii_lowercase()
}

fn domain_matches(host: &str, domain: &str) -> bool {
    host.eq_ignore_ascii_case(domain)
        || host
            .to_ascii_lowercase()
            .ends_with(&format!(".{}", domain.to_ascii_lowercase()))
}

fn path_matches(request_path: &str, cookie_path: &str) -> bool {
    if cookie_path == "/" {
        return true;
    }
    request_path.starts_with(cookie_path)
}

fn upsert_cookie(cookie_store: &mut Vec<StoredCookie>, cookie: StoredCookie) {
    if let Some(existing) = cookie_store.iter_mut().find(|existing| {
        existing.name == cookie.name
            && existing.domain == cookie.domain
            && existing.path == cookie.path
    }) {
        existing.value = cookie.value;
        existing.secure = cookie.secure;
    } else {
        cookie_store.push(cookie);
    }
}

fn apply_set_cookie_headers(
    cookie_store: &mut Vec<StoredCookie>,
    set_cookies: &[String],
    current_url: &str,
) -> Result<(), String> {
    let current_host = Url::parse(current_url)
        .map_err(|e| e.to_string())?
        .host_str()
        .ok_or_else(|| "Current URL host missing".to_string())?
        .to_ascii_lowercase();
    let default_path = "/";

    for cookie in set_cookies {
        let mut segments = cookie.split(';');
        let Some(first_segment) = segments.next() else {
            continue;
        };
        let Some((name, value)) = parse_cookie_name_value(first_segment) else {
            continue;
        };

        let mut domain = current_host.clone();
        let mut path = default_path.to_string();
        let mut secure = false;
        for attribute in segments {
            let trimmed = attribute.trim();
            if trimmed.eq_ignore_ascii_case("secure") {
                secure = true;
                continue;
            }

            if let Some((attr_name, attr_value)) = trimmed.split_once('=') {
                if attr_name.trim().eq_ignore_ascii_case("domain") {
                    let parsed = normalize_cookie_domain(attr_value);
                    if !parsed.is_empty() {
                        domain = parsed;
                    }
                } else if attr_name.trim().eq_ignore_ascii_case("path") {
                    let parsed = attr_value.trim();
                    if !parsed.is_empty() {
                        path = parsed.to_string();
                    }
                }
            }
        }

        upsert_cookie(
            cookie_store,
            StoredCookie {
                name,
                value,
                domain,
                path,
                secure,
            },
        );
    }

    Ok(())
}

fn build_cookie_header_value(
    cookie_store: &[StoredCookie],
    current_url: &str,
) -> Result<Option<String>, String> {
    let current_host = Url::parse(current_url)
        .map_err(|e| e.to_string())?
        .host_str()
        .ok_or_else(|| "Current URL host missing".to_string())?
        .to_ascii_lowercase();
    let parsed_url = Url::parse(current_url).map_err(|e| e.to_string())?;
    let current_path = parsed_url.path();
    let is_https = parsed_url.scheme().eq_ignore_ascii_case("https");

    let mut pairs = Vec::new();
    for cookie in cookie_store {
        if domain_matches(&current_host, &cookie.domain)
            && path_matches(current_path, &cookie.path)
            && (!cookie.secure || is_https)
        {
            pairs.push(format!("{}={}", cookie.name, cookie.value));
        }
    }

    if pairs.is_empty() {
        Ok(None)
    } else {
        Ok(Some(pairs.join("; ")))
    }
}

fn duration_to_ms(duration: Result<Duration, curl::Error>) -> Option<f64> {
    duration.ok().map(|d| d.as_secs_f64() * 1000.0)
}

fn phase_delta_ms(end: Option<f64>, start: Option<f64>) -> Option<f64> {
    match (end, start) {
        (Some(end_ms), Some(start_ms)) if end_ms >= 0.0 && start_ms >= 0.0 => {
            Some((end_ms - start_ms).max(0.0))
        }
        _ => None,
    }
}

fn sum_optional<I>(values: I) -> Option<f64>
where
    I: IntoIterator<Item = Option<f64>>,
{
    let mut total = 0.0;
    let mut has_value = false;
    for value in values {
        if let Some(v) = value {
            total += v;
            has_value = true;
        }
    }
    has_value.then_some(total)
}

struct CurlHopResponse {
    status: u16,
    status_text: String,
    headers: HashMap<String, String>,
    body: Vec<u8>,
    cookies: Vec<String>,
    location: Option<String>,
    timing: ResponseTiming,
    header_size: usize,
}

struct NetworkSettings {
    timeout_secs: u64,
    connect_timeout_secs: u64,
    ssl_verification: bool,
    proxy: Option<String>,
}

impl Default for NetworkSettings {
    fn default() -> Self {
        Self {
            timeout_secs: 30,
            connect_timeout_secs: 10,
            ssl_verification: true,
            proxy: None,
        }
    }
}

fn perform_curl_request(
    method: String,
    url: String,
    headers: Vec<String>,
    // Arc so the redirect loop can re-send the body without copying it per hop
    body: Option<std::sync::Arc<Vec<u8>>>,
    cookie_header: Option<String>,
    network: &NetworkSettings,
) -> Result<CurlHopResponse, String> {
    let request_start = now_millis();
    let mut easy = Easy::new();

    easy.url(&url).map_err(|e| e.to_string())?;
    easy.follow_location(false).map_err(|e| e.to_string())?;
    easy.connect_timeout(Duration::from_secs(network.connect_timeout_secs))
        .map_err(|e| e.to_string())?;
    if network.timeout_secs > 0 {
        easy.timeout(Duration::from_secs(network.timeout_secs))
            .map_err(|e| e.to_string())?;
    }
    easy.accept_encoding("").map_err(|e| e.to_string())?;

    // SSL verification
    easy.ssl_verify_peer(network.ssl_verification)
        .map_err(|e| e.to_string())?;
    easy.ssl_verify_host(network.ssl_verification)
        .map_err(|e| e.to_string())?;

    // Proxy
    if let Some(ref proxy_url) = network.proxy {
        if !proxy_url.is_empty() {
            easy.proxy(proxy_url).map_err(|e| e.to_string())?;
        }
    }

    let method_upper = method.to_ascii_uppercase();
    match method_upper.as_str() {
        "GET" => easy.get(true).map_err(|e| e.to_string())?,
        "POST" => easy.post(true).map_err(|e| e.to_string())?,
        "HEAD" => {
            easy.nobody(true).map_err(|e| e.to_string())?;
            easy.custom_request("HEAD").map_err(|e| e.to_string())?;
        }
        _ => easy
            .custom_request(&method_upper)
            .map_err(|e| e.to_string())?,
    }

    if let Some(ref request_body) = body {
        if method_upper != "GET" && method_upper != "HEAD" {
            easy.post_fields_copy(request_body)
                .map_err(|e| e.to_string())?;
        }
    }

    if !headers.is_empty() || cookie_header.is_some() {
        let mut header_list = List::new();
        for header in headers {
            header_list.append(&header).map_err(|e| e.to_string())?;
        }
        if let Some(cookie) = cookie_header {
            header_list
                .append(&format!("Cookie: {}", cookie))
                .map_err(|e| e.to_string())?;
        }
        easy.http_headers(header_list).map_err(|e| e.to_string())?;
    }

    let mut response_headers = HashMap::new();
    let mut response_body = Vec::new();
    let mut response_cookies = Vec::new();
    let mut location = None;
    let mut status_text = String::new();
    let mut header_size = 0usize;

    {
        let mut transfer = easy.transfer();

        transfer
            .header_function(|header| {
                let Ok(raw_line) = std::str::from_utf8(header) else {
                    return true;
                };

                let line = raw_line.trim_end_matches(|c| c == '\r' || c == '\n');
                if line.is_empty() {
                    return true;
                }

                if let Some((_status, parsed_status_text)) = parse_status_line(line) {
                    response_headers.clear();
                    response_cookies.clear();
                    location = None;
                    header_size = line.len() + 2;
                    status_text = parsed_status_text;
                    return true;
                }

                header_size += line.len() + 2;

                if let Some((name, value)) = line.split_once(':') {
                    let key = name.trim().to_ascii_lowercase();
                    let value = value.trim().to_string();

                    if key == "set-cookie" {
                        response_cookies.push(value.clone());
                    }
                    if key == "location" {
                        location = Some(value.clone());
                    }

                    response_headers.insert(key, value);
                }

                true
            })
            .map_err(|e| e.to_string())?;

        transfer
            .write_function(|data| {
                response_body.extend_from_slice(data);
                Ok(data.len())
            })
            .map_err(|e| e.to_string())?;

        transfer.perform().map_err(|e| e.to_string())?;
    }

    let request_end = now_millis();
    let status = easy.response_code().map_err(|e| e.to_string())? as u16;
    let status_text = if status_text.is_empty() {
        status.to_string()
    } else {
        status_text
    };

    let dns_ms = duration_to_ms(easy.namelookup_time());
    let connect_ms = duration_to_ms(easy.connect_time());
    let app_connect_ms = duration_to_ms(easy.appconnect_time());
    let pre_transfer_ms = duration_to_ms(easy.pretransfer_time());
    let start_transfer_ms = duration_to_ms(easy.starttransfer_time());
    let total_ms =
        duration_to_ms(easy.total_time()).unwrap_or((request_end - request_start).max(0.0));

    let tcp_ms = phase_delta_ms(connect_ms, dns_ms);
    let tls_ms = if app_connect_ms.unwrap_or(0.0) > 0.0 {
        phase_delta_ms(app_connect_ms, connect_ms)
    } else {
        None
    };
    let request_ms = phase_delta_ms(start_transfer_ms, pre_transfer_ms);
    let download_ms = start_transfer_ms.map(|start_ms| (total_ms - start_ms).max(0.0));

    Ok(CurlHopResponse {
        status,
        status_text,
        headers: response_headers,
        body: response_body,
        cookies: response_cookies,
        location,
        timing: ResponseTiming {
            start: request_start,
            end: request_start + total_ms,
            duration: total_ms,
            dns: dns_ms,
            tcp: tcp_ms,
            tls: tls_ms,
            request: request_ms,
            first_byte: start_transfer_ms,
            download: download_ms,
            total: total_ms,
        },
        header_size,
    })
}

/// Guess MIME type from file extension
fn guess_mime(file_name: &str) -> &'static str {
    file_name
        .rsplit('.')
        .next()
        .map(|ext| match ext.to_lowercase().as_str() {
            "jpg" | "jpeg" => "image/jpeg",
            "png" => "image/png",
            "gif" => "image/gif",
            "webp" => "image/webp",
            "pdf" => "application/pdf",
            "json" => "application/json",
            "xml" => "application/xml",
            "txt" => "text/plain",
            "csv" => "text/csv",
            "zip" => "application/zip",
            "html" | "htm" => "text/html",
            "css" => "text/css",
            "js" => "application/javascript",
            _ => "application/octet-stream",
        })
        .unwrap_or("application/octet-stream")
}

/// Build a multipart/form-data body manually (RFC 2046).
/// Returns (body_bytes, content_type_header_with_boundary).
fn build_multipart_body(
    fields: &[crate::models::FormDataField],
) -> Result<(Vec<u8>, String), String> {
    use rand::Rng;
    let boundary: String = {
        let mut rng = rand::thread_rng();
        format!("----LitePostBoundary{:016x}", rng.gen::<u64>())
    };

    let mut body: Vec<u8> = Vec::new();

    for field in fields {
        if !field.enabled || field.key.is_empty() {
            continue;
        }

        // Part delimiter
        body.extend_from_slice(format!("--{}\r\n", boundary).as_bytes());

        if field.field_type == "file" {
            let file_name = field
                .file_name
                .as_deref()
                .or_else(|| {
                    field.file_path.as_deref().and_then(|path| {
                        Path::new(path)
                            .file_name()
                            .and_then(|name| name.to_str())
                    })
                })
                .unwrap_or("upload");
            let mime = guess_mime(file_name);

            body.extend_from_slice(
                format!(
                    "Content-Disposition: form-data; name=\"{}\"; filename=\"{}\"\r\n",
                    field.key, file_name
                )
                .as_bytes(),
            );
            body.extend_from_slice(format!("Content-Type: {}\r\n", mime).as_bytes());
            body.extend_from_slice(b"\r\n");

            if let Some(ref file_data) = field.file_data {
                let decoded = general_purpose::STANDARD
                    .decode(file_data)
                    .map_err(|e| format!("Failed to decode file data: {}", e))?;
                body.extend_from_slice(&decoded);
            } else if let Some(ref file_path) = field.file_path {
                let cleaned_path = file_path.trim().trim_matches('"');
                let file_bytes = std::fs::read(cleaned_path)
                    .map_err(|e| format!("Failed to read file '{}': {}", cleaned_path, e))?;
                body.extend_from_slice(&file_bytes);
            }
        } else {
            body.extend_from_slice(
                format!("Content-Disposition: form-data; name=\"{}\"\r\n", field.key).as_bytes(),
            );
            body.extend_from_slice(b"\r\n");
            body.extend_from_slice(field.value.as_bytes());
        }

        body.extend_from_slice(b"\r\n");
    }

    // Closing delimiter
    body.extend_from_slice(format!("--{}--\r\n", boundary).as_bytes());

    let content_type = format!("multipart/form-data; boundary={}", boundary);
    Ok((body, content_type))
}

#[tauri::command]
pub async fn send_request(
    options: RequestOptions,
    _client_wrapper: tauri::State<'_, ClientWrapper>,
) -> Result<ResponseData, String> {
    let start_time = now_millis();
    let request_headers = build_request_header_lines(&options);
    let original_body = options.body.clone().map(|body| body.into_bytes());
    let is_multipart = options
        .content_type
        .as_deref()
        .map(|ct| ct.starts_with("multipart/form-data"))
        .unwrap_or(false);
    let form_data = options.form_data.clone();

    // Pre-compute multipart body if needed
    let (multipart_body, multipart_content_type) = if is_multipart {
        if let Some(ref fields) = form_data {
            let (body, ct) = build_multipart_body(fields)?;
            (Some(body), Some(ct))
        } else {
            (None, None)
        }
    } else {
        (None, None)
    };

    let network = NetworkSettings {
        timeout_secs: options.timeout.unwrap_or(30),
        connect_timeout_secs: options.connect_timeout.unwrap_or(10),
        ssl_verification: options.ssl_verification,
        proxy: options.proxy.clone(),
    };

    let mut request_headers = request_headers;
    if let Some(content_type) = multipart_content_type.as_deref() {
        set_or_replace_content_type(&mut request_headers, content_type);
    }

    // Arc: redirect hops share one buffer instead of cloning it each time
    let request_body = multipart_body.or(original_body).map(std::sync::Arc::new);
    let method = options.method.to_ascii_uppercase();
    let mut current_url = options.url;
    let initial_host = Url::parse(&current_url)
        .map_err(|e| e.to_string())?
        .host_str()
        .ok_or_else(|| "Initial URL host missing".to_string())?
        .to_ascii_lowercase();
    let mut cookie_store: Vec<StoredCookie> = options
        .cookies
        .iter()
        .map(|cookie| StoredCookie {
            name: cookie.name.clone(),
            value: cookie.value.clone(),
            domain: cookie
                .domain
                .as_deref()
                .map(normalize_cookie_domain)
                .filter(|domain| !domain.is_empty())
                .unwrap_or_else(|| initial_host.clone()),
            path: cookie.path.clone().unwrap_or_else(|| "/".to_string()),
            secure: cookie.secure.unwrap_or(false),
        })
        .collect();
    let mut redirect_chain = Vec::new();
    let mut all_cookies = Vec::new();
    let mut hop_timings = Vec::new();
    let mut final_response = None;

    for redirect_index in 0..10 {
        let headers_for_request = request_headers.clone();
        let body_for_request = request_body.clone();
        let method_for_request = method.clone();
        let url_for_request = current_url.clone();
        let cookie_header = build_cookie_header_value(&cookie_store, &current_url)?;

        let network_for_request = NetworkSettings {
            timeout_secs: network.timeout_secs,
            connect_timeout_secs: network.connect_timeout_secs,
            ssl_verification: network.ssl_verification,
            proxy: network.proxy.clone(),
        };
        let hop = tokio::task::spawn_blocking(move || {
            perform_curl_request(
                method_for_request,
                url_for_request,
                headers_for_request,
                body_for_request,
                cookie_header,
                &network_for_request,
            )
        })
        .await
        .map_err(|e| format!("Request task failed: {}", e))??;

        apply_set_cookie_headers(&mut cookie_store, &hop.cookies, &current_url)?;
        all_cookies.extend(hop.cookies.clone());
        hop_timings.push(hop.timing.clone());

        let is_redirect = (300..400).contains(&hop.status) && hop.location.is_some();
        if is_redirect {
            let hop_body_size = hop.body.len();
            redirect_chain.push(RedirectInfo {
                url: current_url.clone(),
                status: hop.status,
                status_text: hop.status_text.clone(),
                headers: hop.headers.clone(),
                cookies: hop.cookies.clone(),
                timing: Some(hop.timing.clone()),
                size: Some(ResponseSize {
                    headers: hop.header_size,
                    body: hop_body_size,
                    total: hop.header_size + hop_body_size,
                }),
            });

            if redirect_index == 9 {
                return Err(
                    "Maximum redirect limit (10) exceeded. The server might be in a redirect loop."
                        .to_string(),
                );
            }

            let location = hop.location.unwrap_or_default();
            current_url = Url::parse(&current_url)
                .map_err(|e| e.to_string())?
                .join(&location)
                .map_err(|e| e.to_string())?
                .to_string();
            continue;
        }

        final_response = Some(hop);
        break;
    }

    let final_response = final_response.ok_or_else(|| "No response received".to_string())?;
    let body_size = final_response.body.len();
    let is_binary = is_binary_content_type(final_response.headers.get("content-type"));

    let (body, is_base64) = if is_binary {
        (general_purpose::STANDARD.encode(&final_response.body), true)
    } else {
        (
            String::from_utf8_lossy(&final_response.body).to_string(),
            false,
        )
    };

    let end_time = now_millis();
    let total_ms = (end_time - start_time).max(0.0);

    Ok(ResponseData {
        status: final_response.status,
        status_text: final_response.status_text,
        headers: final_response.headers,
        body,
        is_base64,
        redirect_chain,
        cookies: all_cookies,
        timing: Some(ResponseTiming {
            start: start_time,
            end: end_time,
            duration: total_ms,
            dns: sum_optional(hop_timings.iter().map(|timing| timing.dns)),
            tcp: sum_optional(hop_timings.iter().map(|timing| timing.tcp)),
            tls: sum_optional(hop_timings.iter().map(|timing| timing.tls)),
            request: sum_optional(hop_timings.iter().map(|timing| timing.request)),
            first_byte: sum_optional(hop_timings.iter().map(|timing| timing.first_byte)),
            download: sum_optional(hop_timings.iter().map(|timing| timing.download)),
            total: total_ms,
        }),
        size: Some(ResponseSize {
            headers: final_response.header_size,
            body: body_size,
            total: final_response.header_size + body_size,
        }),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::{Read, Write};
    use std::net::TcpListener;
    use std::sync::mpsc::{self, Receiver};
    use std::thread;

    fn spawn_one_shot_server(response: impl Into<String>) -> String {
        let listener = TcpListener::bind("127.0.0.1:0").expect("server should bind");
        let address = listener
            .local_addr()
            .expect("server should have local addr");
        let response_payload = response.into();

        thread::spawn(move || {
            if let Ok((mut socket, _)) = listener.accept() {
                let mut buffer = [0u8; 4096];
                let _ = socket.read(&mut buffer);
                let _ = socket.write_all(response_payload.as_bytes());
                let _ = socket.flush();
            }
        });

        format!("http://{}", address)
    }

    fn spawn_capture_server(response: impl Into<String>) -> (String, Receiver<String>) {
        let listener = TcpListener::bind("127.0.0.1:0").expect("server should bind");
        let address = listener
            .local_addr()
            .expect("server should have local addr");
        let response_payload = response.into();
        let (tx, rx) = mpsc::channel::<String>();

        thread::spawn(move || {
            if let Ok((mut socket, _)) = listener.accept() {
                let _ = socket.set_read_timeout(Some(std::time::Duration::from_secs(2)));
                let mut request_bytes = Vec::new();
                let mut buffer = [0u8; 1024];

                loop {
                    match socket.read(&mut buffer) {
                        Ok(0) => break,
                        Ok(size) => {
                            request_bytes.extend_from_slice(&buffer[..size]);
                            if request_bytes.windows(4).any(|window| window == b"\r\n\r\n") {
                                break;
                            }
                        }
                        Err(error)
                            if error.kind() == std::io::ErrorKind::TimedOut
                                || error.kind() == std::io::ErrorKind::WouldBlock =>
                        {
                            break;
                        }
                        Err(_) => break,
                    }
                }

                let request_text = String::from_utf8_lossy(&request_bytes).to_string();
                let _ = tx.send(request_text);

                let _ = socket.write_all(response_payload.as_bytes());
                let _ = socket.flush();
            }
        });

        (format!("http://{}", address), rx)
    }

    #[test]
    fn parse_status_line_keeps_code_and_reason() {
        let parsed =
            parse_status_line("HTTP/1.1 301 Moved Permanently").expect("status line should parse");
        assert_eq!(parsed.0, 301);
        assert_eq!(parsed.1, "301 Moved Permanently");
    }

    #[test]
    fn cookie_domain_and_path_filtering_works() {
        let cookies = vec![
            StoredCookie {
                name: "sid".to_string(),
                value: "123".to_string(),
                domain: "example.com".to_string(),
                path: "/api".to_string(),
                secure: false,
            },
            StoredCookie {
                name: "secure_token".to_string(),
                value: "abc".to_string(),
                domain: "example.com".to_string(),
                path: "/".to_string(),
                secure: true,
            },
        ];

        let http_header = build_cookie_header_value(&cookies, "http://api.example.com/api/users")
            .expect("cookie header build should succeed")
            .expect("at least one cookie should match");
        assert!(http_header.contains("sid=123"));
        assert!(!http_header.contains("secure_token=abc"));

        let https_header = build_cookie_header_value(&cookies, "https://api.example.com/api/users")
            .expect("cookie header build should succeed")
            .expect("cookies should match on https");
        assert!(https_header.contains("sid=123"));
        assert!(https_header.contains("secure_token=abc"));

        let no_match = build_cookie_header_value(&cookies, "https://api.example.com/other")
            .expect("cookie header build should succeed");
        assert_eq!(no_match, Some("secure_token=abc".to_string()));
    }

    #[test]
    fn set_cookie_parsing_applies_domain_path_secure() {
        let mut store = Vec::new();
        let set_cookies = vec![
            "session=xyz; Domain=.example.com; Path=/v1; Secure".to_string(),
            "theme=dark; Path=/".to_string(),
        ];

        apply_set_cookie_headers(&mut store, &set_cookies, "https://api.example.com/v1")
            .expect("set-cookie parse should succeed");

        let session = store
            .iter()
            .find(|cookie| cookie.name == "session")
            .expect("session cookie should exist");
        assert_eq!(session.domain, "example.com");
        assert_eq!(session.path, "/v1");
        assert!(session.secure);

        let theme = store
            .iter()
            .find(|cookie| cookie.name == "theme")
            .expect("theme cookie should exist");
        assert_eq!(theme.domain, "api.example.com");
        assert_eq!(theme.path, "/");
        assert!(!theme.secure);
    }

    #[test]
    fn perform_curl_request_smoke_test() {
        let url = spawn_one_shot_server(
            "HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nSet-Cookie: sid=1; Path=/\r\nContent-Length: 5\r\nConnection: close\r\n\r\nhello",
        );

        let response = perform_curl_request("GET".to_string(), url, Vec::new(), None, None, &NetworkSettings::default())
            .expect("curl request should succeed");

        assert_eq!(response.status, 200);
        assert_eq!(response.status_text, "200 OK");
        assert_eq!(response.body, b"hello");
        assert_eq!(
            response.headers.get("content-type"),
            Some(&"text/plain".to_string())
        );
        assert!(response
            .cookies
            .iter()
            .any(|cookie| cookie.starts_with("sid=1")));
        assert!(response.timing.total >= 0.0);
        assert!(response.timing.first_byte.is_some());
    }

    #[test]
    fn manual_redirect_chain_forwards_cookie_to_final_hop() {
        let (final_url, final_request_rx) = spawn_capture_server(
            "HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: 5\r\nConnection: close\r\n\r\nfinal",
        );
        let redirect_url = spawn_one_shot_server(format!(
            "HTTP/1.1 302 Found\r\nLocation: {}\r\nSet-Cookie: hop=1; Path=/\r\nContent-Length: 0\r\nConnection: close\r\n\r\n",
            final_url
        ));

        let mut current_url = redirect_url;
        let mut cookie_store = Vec::<StoredCookie>::new();
        let mut redirect_count = 0usize;
        let mut final_hop = None;

        for _ in 0..3 {
            let cookie_header = build_cookie_header_value(&cookie_store, &current_url)
                .expect("cookie header should be buildable");
            let hop = perform_curl_request(
                "GET".to_string(),
                current_url.clone(),
                Vec::new(),
                None,
                cookie_header,
                &NetworkSettings::default(),
            )
            .expect("curl request should succeed");
            apply_set_cookie_headers(&mut cookie_store, &hop.cookies, &current_url)
                .expect("set-cookie parse should succeed");

            if (300..400).contains(&hop.status) && hop.location.is_some() {
                redirect_count += 1;
                current_url = Url::parse(&current_url)
                    .expect("current url should parse")
                    .join(hop.location.as_deref().unwrap_or_default())
                    .expect("redirect location should resolve")
                    .to_string();
                continue;
            }

            final_hop = Some(hop);
            break;
        }

        let final_hop = final_hop.expect("final hop should be present");
        assert_eq!(redirect_count, 1);
        assert_eq!(final_hop.status, 200);
        assert_eq!(final_hop.status_text, "200 OK");
        assert_eq!(final_hop.body, b"final");

        let final_request = final_request_rx
            .recv_timeout(std::time::Duration::from_secs(2))
            .expect("final request should be captured");
        assert!(final_request.to_ascii_lowercase().contains("cookie: hop=1"));
    }

    #[test]
    fn multipart_reads_file_bytes_from_file_path() {
        let temp_file = std::env::temp_dir().join(format!(
            "litepost-upload-{}.txt",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .expect("time should be valid")
                .as_nanos()
        ));

        std::fs::write(&temp_file, b"hello from file path")
            .expect("temporary file should be writable");

        let fields = vec![crate::models::FormDataField {
            key: "file".to_string(),
            value: String::new(),
            field_type: "file".to_string(),
            file_name: Some("sample.txt".to_string()),
            file_data: None,
            file_path: Some(temp_file.to_string_lossy().to_string()),
            enabled: true,
        }];

        let (body, content_type) =
            build_multipart_body(&fields).expect("multipart body should be built");
        let body_text = String::from_utf8_lossy(&body);

        assert!(content_type.starts_with("multipart/form-data; boundary="));
        assert!(body_text.contains("name=\"file\"; filename=\"sample.txt\""));
        assert!(body_text.contains("hello from file path"));

        let _ = std::fs::remove_file(temp_file);
    }
}
