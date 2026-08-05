use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use tauri_plugin_http::reqwest::{self, Client};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RequestOptions {
    pub method: String,
    pub url: String,
    pub headers: HashMap<String, String>,
    pub body: Option<String>,
    pub content_type: Option<String>,
    pub cookies: Vec<Cookie>,
    #[serde(default)]
    pub form_data: Option<Vec<FormDataField>>,
    #[serde(default)]
    pub timeout: Option<u64>,
    #[serde(default)]
    pub connect_timeout: Option<u64>,
    #[serde(default = "default_true")]
    pub ssl_verification: bool,
    #[serde(default)]
    pub proxy: Option<String>,
}

fn default_true() -> bool {
    true
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FormDataField {
    pub key: String,
    pub value: String,
    #[serde(rename = "type")]
    pub field_type: String, // "text" or "file"
    #[serde(rename = "fileName")]
    pub file_name: Option<String>,
    #[serde(rename = "fileData")]
    pub file_data: Option<String>, // base64 encoded
    #[serde(rename = "filePath")]
    pub file_path: Option<String>,
    pub enabled: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Cookie {
    pub name: String,
    pub value: String,
    pub domain: Option<String>,
    pub path: Option<String>,
    pub expires: Option<String>,
    pub secure: Option<bool>,
    pub http_only: Option<bool>,
}

#[derive(Debug, Serialize, Clone)]
pub struct ResponseTiming {
    pub start: f64,
    pub end: f64,
    pub duration: f64,
    pub dns: Option<f64>,
    pub tcp: Option<f64>,
    pub tls: Option<f64>,
    pub request: Option<f64>,
    pub first_byte: Option<f64>,
    pub download: Option<f64>,
    pub total: f64,
}

#[derive(Debug, Serialize, Clone)]
pub struct ResponseSize {
    pub headers: usize,
    pub body: usize,
    pub total: usize,
}

#[derive(Debug, Serialize, Clone)]
pub struct RedirectInfo {
    pub url: String,
    pub status: u16,
    pub status_text: String,
    pub headers: HashMap<String, String>,
    pub cookies: Vec<String>,
    pub timing: Option<ResponseTiming>,
    pub size: Option<ResponseSize>,
}

#[derive(Debug, Serialize, Clone)]
pub struct ResponseData {
    pub status: u16,
    pub status_text: String,
    pub headers: HashMap<String, String>,
    pub body: String,
    pub is_base64: bool,
    pub redirect_chain: Vec<RedirectInfo>,
    pub cookies: Vec<String>,
    pub timing: Option<ResponseTiming>,
    pub size: Option<ResponseSize>,
}

#[derive(Debug, Serialize, Clone)]
pub struct StreamChunk {
    pub id: Option<String>,
    pub event: Option<String>,
    pub data: String,
    pub is_done: bool,
}

pub struct ClientWrapper {
    client: Mutex<Option<Client>>,
}

impl ClientWrapper {
    pub fn new() -> Self {
        Self {
            client: Mutex::new(None),
        }
    }

    pub fn get_or_init_client(&self) -> Result<Client, String> {
        let mut guard = self
            .client
            .lock()
            .map_err(|error| format!("Client lock error: {}", error))?;

        if guard.is_none() {
            let client = Client::builder()
                .redirect(reqwest::redirect::Policy::none())
                .timeout(std::time::Duration::from_secs(30))
                .connect_timeout(std::time::Duration::from_secs(10))
                .build()
                .map_err(|error| format!("Failed to build HTTP client: {}", error))?;

            *guard = Some(client);
        }

        Ok(guard
            .as_ref()
            .expect("HTTP client should be initialized")
            .clone())
    }
}

pub struct ActiveStreams {
    pub streams: Mutex<HashMap<String, tokio::sync::watch::Sender<bool>>>,
}

/// In-flight authorization code flows, keyed by a frontend-supplied id.
///
/// The flow parks on a loopback listener waiting for the provider to redirect
/// back. If the provider refuses to redirect at all — an unregistered redirect
/// URI is the usual reason — nothing ever arrives, and without this the user is
/// stuck watching a spinner until the timeout expires with no way out.
pub struct PendingOAuthFlows {
    pub flows: Mutex<HashMap<String, tokio::sync::watch::Sender<bool>>>,
}
