use std::str::FromStr;
use tauri_plugin_http::reqwest::header::{HeaderMap, HeaderName, HeaderValue};

use crate::models::RequestOptions;

pub fn now_millis() -> u128 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
}

pub fn build_request_headers(options: &RequestOptions) -> Result<HeaderMap, String> {
    let mut headers = HeaderMap::new();

    for (key, value) in &options.headers {
        if key.eq_ignore_ascii_case("cookie") {
            continue;
        }

        headers.insert(
            HeaderName::from_str(key).map_err(|e| e.to_string())?,
            HeaderValue::from_str(value).map_err(|e| e.to_string())?,
        );
    }

    if options.body.is_some() && !headers.contains_key(HeaderName::from_static("content-type")) {
        if let Some(content_type) = options.content_type.as_deref() {
            headers.insert(
                HeaderName::from_static("content-type"),
                HeaderValue::from_str(content_type).map_err(|e| e.to_string())?,
            );
        }
    }

    Ok(headers)
}
