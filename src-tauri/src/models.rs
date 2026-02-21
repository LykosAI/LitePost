use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tauri_plugin_http::reqwest::{self, Client};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RequestOptions {
    pub method: String,
    pub url: String,
    pub headers: HashMap<String, String>,
    pub body: Option<String>,
    pub content_type: Option<String>,
    pub cookies: Vec<Cookie>,
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
    pub start: u128,
    pub end: u128,
    pub duration: u128,
    pub dns: Option<u128>,
    pub tcp: Option<u128>,
    pub tls: Option<u128>,
    pub request: Option<u128>,
    pub first_byte: Option<u128>,
    pub download: Option<u128>,
    pub total: u128,
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

#[derive(Clone)]
pub struct ClientWrapper {
    pub client: Client,
    pub cookie_jar: Arc<reqwest::cookie::Jar>,
}

pub struct ActiveStreams {
    pub streams: Mutex<HashMap<String, tokio::sync::watch::Sender<bool>>>,
}
