mod http_client;
mod models;
mod network_utils;
mod oauth;
mod streaming;
mod websocket;

use std::collections::HashMap;
use std::sync::Mutex;

use models::{ActiveStreams, ClientWrapper};
use websocket::ActiveWebSockets;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let active_streams = ActiveStreams {
        streams: Mutex::new(HashMap::new()),
    };

    let active_websockets = ActiveWebSockets {
        connections: Mutex::new(HashMap::new()),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .manage(ClientWrapper::new())
        .manage(active_streams)
        .manage(active_websockets)
        .invoke_handler(tauri::generate_handler![
            http_client::send_request,
            streaming::stream_sse,
            streaming::cancel_stream,
            oauth::oauth2_token_exchange,
            oauth::oauth2_auth_code_flow,
            oauth::oauth2_refresh,
            websocket::ws_connect,
            websocket::ws_send,
            websocket::ws_disconnect,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
