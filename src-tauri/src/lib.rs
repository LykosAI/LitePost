mod http_client;
mod models;
mod network_utils;
mod oauth;
mod streaming;

use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tauri_plugin_http::reqwest::{self, Client};

use models::{ActiveStreams, ClientWrapper};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let cookie_jar = Arc::new(reqwest::cookie::Jar::default());
    let client = Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .cookie_provider(Arc::clone(&cookie_jar))
        .timeout(std::time::Duration::from_secs(30))
        .connect_timeout(std::time::Duration::from_secs(10))
        .build()
        .expect("Failed to build HTTP client");

    let client_wrapper = ClientWrapper { client, cookie_jar };
    let active_streams = ActiveStreams {
        streams: Mutex::new(HashMap::new()),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .manage(client_wrapper)
        .manage(active_streams)
        .invoke_handler(tauri::generate_handler![
            http_client::send_request,
            streaming::stream_sse,
            streaming::cancel_stream,
            oauth::oauth2_token_exchange,
            oauth::oauth2_auth_code_flow,
            oauth::oauth2_refresh,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
