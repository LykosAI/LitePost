use std::collections::HashMap;
use std::sync::Mutex;

use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use tauri::Emitter;
use tokio_tungstenite::tungstenite::client::IntoClientRequest;
use tokio_tungstenite::tungstenite::Message;

use crate::network_utils::now_millis;

// ── Shared state ────────────────────────────────────────

pub struct ActiveWebSockets {
    pub connections: Mutex<HashMap<String, tokio::sync::watch::Sender<WsCommand>>>,
}

#[derive(Clone, Debug, PartialEq)]
pub enum WsCommand {
    None,
    Send(String),
    Close,
}

// ── Models ──────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct WsConnectOptions {
    pub url: String,
    pub headers: HashMap<String, String>,
    pub protocols: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Clone)]
pub struct WsMessagePayload {
    pub data: String,
    pub is_binary: bool,
    pub timestamp: f64,
    pub direction: String, // "incoming" or "outgoing"
}

// ── Commands ────────────────────────────────────────────

#[tauri::command]
pub async fn ws_connect(
    options: WsConnectOptions,
    connection_id: String,
    window: tauri::Window,
    active_ws: tauri::State<'_, ActiveWebSockets>,
) -> Result<(), String> {
    let connected_event = format!("ws-connected-{}", connection_id);
    let message_event = format!("ws-message-{}", connection_id);
    let error_event = format!("ws-error-{}", connection_id);
    let closed_event = format!("ws-closed-{}", connection_id);

    // Parse the URL
    let url = url::Url::parse(&options.url).map_err(|e| format!("Invalid URL: {}", e))?;

    // Build the request with custom headers
    let mut request = url
        .into_client_request()
        .map_err(|e| format!("Failed to build request: {}", e))?;

    for (key, value) in &options.headers {
        if let (Ok(name), Ok(val)) = (
            key.parse::<tokio_tungstenite::tungstenite::http::header::HeaderName>(),
            value.parse::<tokio_tungstenite::tungstenite::http::header::HeaderValue>(),
        ) {
            request.headers_mut().insert(name, val);
        }
    }

    // Add subprotocols if specified
    if let Some(protocols) = &options.protocols {
        if !protocols.is_empty() {
            let proto_str = protocols.join(", ");
            if let Ok(val) = proto_str.parse::<tokio_tungstenite::tungstenite::http::header::HeaderValue>() {
                request.headers_mut().insert("Sec-WebSocket-Protocol", val);
            }
        }
    }

    // Create command channel for sending messages and closing
    let (cmd_tx, mut cmd_rx) = tokio::sync::watch::channel(WsCommand::None);
    {
        let mut connections = active_ws
            .connections
            .lock()
            .map_err(|e| format!("Lock error: {}", e))?;
        connections.insert(connection_id.clone(), cmd_tx);
    }

    // Connect
    let ws_stream = match tokio_tungstenite::connect_async(request).await {
        Ok((stream, _response)) => stream,
        Err(e) => {
            if let Ok(mut connections) = active_ws.connections.lock() {
                connections.remove(&connection_id);
            }
            let _ = window.emit(
                &error_event,
                serde_json::json!({ "error": e.to_string() }),
            );
            return Err(format!("WebSocket connection failed: {}", e));
        }
    };

    let _ = window.emit(
        &connected_event,
        serde_json::json!({ "timestamp": now_millis() }),
    );

    let (mut write, mut read) = ws_stream.split();

    // Main event loop
    loop {
        tokio::select! {
            _ = cmd_rx.changed() => {
                let cmd = cmd_rx.borrow().clone();
                match cmd {
                    WsCommand::Send(data) => {
                        let msg = Message::Text(data.clone());
                        if let Err(e) = write.send(msg).await {
                            let _ = window.emit(
                                &error_event,
                                serde_json::json!({ "error": format!("Send failed: {}", e) }),
                            );
                        } else {
                            let _ = window.emit(&message_event, WsMessagePayload {
                                data,
                                is_binary: false,
                                timestamp: now_millis(),
                                direction: "outgoing".to_string(),
                            });
                        }
                    }
                    WsCommand::Close => {
                        let _ = write.send(Message::Close(None)).await;
                        break;
                    }
                    WsCommand::None => {}
                }
            }
            msg = read.next() => {
                match msg {
                    Some(Ok(Message::Text(text))) => {
                        let _ = window.emit(&message_event, WsMessagePayload {
                            data: text,
                            is_binary: false,
                            timestamp: now_millis(),
                            direction: "incoming".to_string(),
                        });
                    }
                    Some(Ok(Message::Binary(data))) => {
                        let text = format!("[Binary: {} bytes]", data.len());
                        let _ = window.emit(&message_event, WsMessagePayload {
                            data: text,
                            is_binary: true,
                            timestamp: now_millis(),
                            direction: "incoming".to_string(),
                        });
                    }
                    Some(Ok(Message::Ping(data))) => {
                        let _ = write.send(Message::Pong(data)).await;
                    }
                    Some(Ok(Message::Pong(_))) => {
                        // Ignore pongs
                    }
                    Some(Ok(Message::Close(frame))) => {
                        let reason = frame
                            .map(|f| format!("{}: {}", f.code, f.reason))
                            .unwrap_or_else(|| "Connection closed".to_string());
                        let _ = window.emit(
                            &closed_event,
                            serde_json::json!({
                                "reason": reason,
                                "clean": true,
                                "timestamp": now_millis(),
                            }),
                        );
                        break;
                    }
                    Some(Ok(Message::Frame(_))) => {
                        // Raw frame, ignore
                    }
                    Some(Err(e)) => {
                        let _ = window.emit(
                            &error_event,
                            serde_json::json!({ "error": e.to_string() }),
                        );
                        break;
                    }
                    None => {
                        // Stream ended
                        break;
                    }
                }
            }
        }
    }

    // Cleanup
    if let Ok(mut connections) = active_ws.connections.lock() {
        connections.remove(&connection_id);
    }

    let _ = window.emit(
        &closed_event,
        serde_json::json!({
            "reason": "Connection closed",
            "clean": true,
            "timestamp": now_millis(),
        }),
    );

    Ok(())
}

#[tauri::command]
pub async fn ws_send(
    connection_id: String,
    message: String,
    active_ws: tauri::State<'_, ActiveWebSockets>,
) -> Result<(), String> {
    let connections = active_ws
        .connections
        .lock()
        .map_err(|e| format!("Lock error: {}", e))?;

    if let Some(tx) = connections.get(&connection_id) {
        tx.send(WsCommand::Send(message))
            .map_err(|e| format!("Send error: {}", e))?;
        Ok(())
    } else {
        Err("Connection not found".to_string())
    }
}

#[tauri::command]
pub async fn ws_disconnect(
    connection_id: String,
    active_ws: tauri::State<'_, ActiveWebSockets>,
) -> Result<(), String> {
    let connections = active_ws
        .connections
        .lock()
        .map_err(|e| format!("Lock error: {}", e))?;

    if let Some(tx) = connections.get(&connection_id) {
        let _ = tx.send(WsCommand::Close);
    }

    Ok(())
}
