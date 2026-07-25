use futures_util::StreamExt;
use std::collections::HashMap;
use std::str::FromStr;
use tauri::http::method::Method;
use tauri::Emitter;

use crate::models::{ActiveStreams, ClientWrapper, RequestOptions, StreamChunk};
use crate::network_utils::{build_request_headers, now_millis};

#[tauri::command]
pub async fn stream_sse(
    options: RequestOptions,
    request_id: String,
    window: tauri::Window,
    client_wrapper: tauri::State<'_, ClientWrapper>,
    active_streams: tauri::State<'_, ActiveStreams>,
) -> Result<(), String> {
    let client = client_wrapper.get_or_init_client()?;
    let start_time = now_millis();

    let (cancel_tx, mut cancel_rx) = tokio::sync::watch::channel(false);
    {
        let mut streams = active_streams
            .streams
            .lock()
            .map_err(|e| format!("Lock error: {}", e))?;
        streams.insert(request_id.clone(), cancel_tx);
    }

    let headers = build_request_headers(&options)?;

    let mut request = client
        .request(
            Method::from_str(&options.method).map_err(|e| e.to_string())?,
            &options.url,
        )
        .headers(headers)
        .timeout(std::time::Duration::from_secs(300));

    if let Some(body) = &options.body {
        request = request.body(body.clone());
    }

    let header_event = format!("sse-headers-{}", request_id);
    let chunk_event = format!("sse-chunk-{}", request_id);
    let done_event = format!("sse-done-{}", request_id);

    let res = match request.send().await {
        Ok(res) => res,
        Err(e) => {
            if let Ok(mut streams) = active_streams.streams.lock() {
                streams.remove(&request_id);
            }
            let _ = window.emit(
                &done_event,
                serde_json::json!({
                    "error": e.to_string(),
                    "cancelled": false,
                    "duration": now_millis() - start_time,
                }),
            );
            return Err(e.to_string());
        }
    };

    let status = res.status();
    let resp_headers: HashMap<String, String> = res
        .headers()
        .iter()
        .map(|(k, v)| (k.to_string(), v.to_str().unwrap_or_default().to_string()))
        .collect();

    window
        .emit(
            &header_event,
            serde_json::json!({
                "status": status.as_u16(),
                "statusText": status.to_string(),
                "headers": resp_headers,
            }),
        )
        .map_err(|e| e.to_string())?;

    let mut stream = res.bytes_stream();
    let mut buffer = String::new();
    let mut current_event: Option<String> = None;
    let mut current_id: Option<String> = None;
    let mut current_data: Vec<String> = Vec::new();
    let mut cancelled = false;

    loop {
        tokio::select! {
            _ = cancel_rx.changed() => {
                if *cancel_rx.borrow() {
                    cancelled = true;
                    break;
                }
            }
            chunk = stream.next() => {
                match chunk {
                    Some(Ok(bytes)) => {
                        buffer.push_str(&String::from_utf8_lossy(&bytes));

                        while let Some(newline_pos) = buffer.find('\n') {
                            let line = buffer[..newline_pos].trim_end_matches('\r').to_string();
                            buffer = buffer[newline_pos + 1..].to_string();

                            if line.is_empty() {
                                if !current_data.is_empty() {
                                    let data = current_data.join("\n");
                                    let _ = window.emit(&chunk_event, StreamChunk {
                                        id: current_id.take(),
                                        event: current_event.take(),
                                        data,
                                        is_done: false,
                                    });
                                    current_data.clear();
                                }
                            } else if let Some(data) = line.strip_prefix("data:") {
                                current_data.push(data.trim_start().to_string());
                            } else if let Some(event) = line.strip_prefix("event:") {
                                current_event = Some(event.trim_start().to_string());
                            } else if let Some(id) = line.strip_prefix("id:") {
                                current_id = Some(id.trim_start().to_string());
                            } else if line.starts_with(':') {
                                // SSE comment line
                            } else {
                                let _ = window.emit(&chunk_event, StreamChunk {
                                    id: None,
                                    event: None,
                                    data: line + "\n",
                                    is_done: false,
                                });
                            }
                        }
                    }
                    Some(Err(e)) => {
                        let _ = window.emit(&done_event, serde_json::json!({
                            "error": e.to_string(),
                            "cancelled": false,
                            "duration": now_millis() - start_time,
                        }));
                        if let Ok(mut streams) = active_streams.streams.lock() {
                            streams.remove(&request_id);
                        }
                        return Err(e.to_string());
                    }
                    None => {
                        if !current_data.is_empty() {
                            let data = current_data.join("\n");
                            let _ = window.emit(&chunk_event, StreamChunk {
                                id: current_id.take(),
                                event: current_event.take(),
                                data,
                                is_done: false,
                            });
                        }

                        let remaining = buffer.trim().to_string();
                        if !remaining.is_empty() {
                            let _ = window.emit(&chunk_event, StreamChunk {
                                id: None,
                                event: None,
                                data: remaining,
                                is_done: false,
                            });
                        }
                        break;
                    }
                }
            }
        }
    }

    if let Ok(mut streams) = active_streams.streams.lock() {
        streams.remove(&request_id);
    }

    let _ = window.emit(
        &done_event,
        serde_json::json!({
            "cancelled": cancelled,
            "duration": now_millis() - start_time,
        }),
    );

    Ok(())
}

#[tauri::command]
pub async fn cancel_stream(
    request_id: String,
    active_streams: tauri::State<'_, ActiveStreams>,
) -> Result<(), String> {
    let streams = active_streams
        .streams
        .lock()
        .map_err(|e| format!("Lock error: {}", e))?;

    if let Some(tx) = streams.get(&request_id) {
        let _ = tx.send(true);
    }

    Ok(())
}
