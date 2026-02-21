use base64::engine::general_purpose;
use base64::Engine as _;
use std::collections::HashMap;
use std::str::FromStr;
use tauri::http::method::Method;
use tauri::Url;

use crate::models::{
    ClientWrapper, RedirectInfo, RequestOptions, ResponseData, ResponseSize, ResponseTiming,
};
use crate::network_utils::{build_request_headers, now_millis};

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

#[tauri::command]
pub async fn send_request(
    options: RequestOptions,
    client_wrapper: tauri::State<'_, ClientWrapper>,
) -> Result<ResponseData, String> {
    let client = &client_wrapper.client;
    let cookie_jar = &client_wrapper.cookie_jar;
    let start_time = now_millis();

    let request_url = Url::parse(&options.url).map_err(|e| e.to_string())?;
    for cookie in &options.cookies {
        let cookie_str = format!("{}={}", cookie.name, cookie.value);
        cookie_jar.add_cookie_str(&cookie_str, &request_url);
    }

    let headers = build_request_headers(&options)?;
    let method = Method::from_str(&options.method).map_err(|e| e.to_string())?;
    let original_body = options.body.clone();

    let mut current_url = options.url;
    let mut redirect_chain = Vec::new();
    let mut response = None;

    for redirect_index in 0..10 {
        let mut request = client
            .request(method.clone(), &current_url)
            .headers(headers.clone());

        if let Some(body) = &original_body {
            request = request.body(body.clone());
        }

        let request_start = now_millis();
        let resp = request.send().await.map_err(|e| e.to_string())?;
        let first_byte_time = now_millis();

        let status = resp.status();
        let resp_headers: HashMap<String, String> = resp
            .headers()
            .iter()
            .map(|(k, v)| (k.to_string(), v.to_str().unwrap_or_default().to_string()))
            .collect();

        let headers_size = resp_headers
            .iter()
            .map(|(k, v)| k.len() + v.len() + 4)
            .sum();

        if status.is_redirection() {
            if let Some(location) = resp.headers().get("location") {
                let location = location.to_str().map_err(|e| e.to_string())?;
                let next_url = Url::parse(&current_url)
                    .map_err(|e| e.to_string())?
                    .join(location)
                    .map_err(|e| e.to_string())?
                    .to_string();

                let redirect_cookies: Vec<String> = resp
                    .headers()
                    .get_all("set-cookie")
                    .iter()
                    .filter_map(|h| h.to_str().ok())
                    .map(String::from)
                    .collect();

                let end_time = now_millis();
                redirect_chain.push(RedirectInfo {
                    url: current_url.clone(),
                    status: status.as_u16(),
                    status_text: status.to_string(),
                    headers: resp_headers,
                    cookies: redirect_cookies,
                    timing: Some(ResponseTiming {
                        start: request_start,
                        end: end_time,
                        duration: end_time - request_start,
                        dns: None,
                        tcp: None,
                        tls: None,
                        request: None,
                        first_byte: Some(first_byte_time - request_start),
                        download: Some(end_time - first_byte_time),
                        total: end_time - request_start,
                    }),
                    size: Some(ResponseSize {
                        headers: headers_size,
                        body: 0,
                        total: headers_size,
                    }),
                });

                if redirect_index == 9 {
                    return Err(
                        "Maximum redirect limit (10) exceeded. The server might be in a redirect loop."
                            .to_string(),
                    );
                }

                current_url = next_url;
                continue;
            }
        }

        response = Some((resp, request_start, first_byte_time));
        break;
    }

    let (final_response, request_start, first_byte_time) =
        response.ok_or_else(|| "No response received".to_string())?;

    let status = final_response.status();
    let headers: HashMap<String, String> = final_response
        .headers()
        .iter()
        .map(|(k, v)| (k.to_string(), v.to_str().unwrap_or_default().to_string()))
        .collect();

    let headers_size = headers.iter().map(|(k, v)| k.len() + v.len() + 4).sum();

    let mut all_cookies = Vec::new();
    for redirect in &redirect_chain {
        all_cookies.extend(redirect.cookies.clone());
    }
    all_cookies.extend(
        final_response
            .headers()
            .get_all("set-cookie")
            .iter()
            .filter_map(|h| h.to_str().ok())
            .map(String::from),
    );

    let is_binary = is_binary_content_type(headers.get("content-type"));

    let (body, body_size, is_base64) = if is_binary {
        let bytes = final_response.bytes().await.map_err(|e| e.to_string())?;
        let size = bytes.len();
        (general_purpose::STANDARD.encode(bytes), size, true)
    } else {
        let text = final_response.text().await.map_err(|e| e.to_string())?;
        let size = text.len();
        (text, size, false)
    };

    let end_time = now_millis();

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
            dns: None,
            tcp: None,
            tls: None,
            request: None,
            first_byte: Some(first_byte_time - request_start),
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
