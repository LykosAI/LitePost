// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[cfg(target_os = "windows")]
fn configure_webview2_args() {
    let disable_gpu = std::env::args().any(|arg| arg == "--disable-webview-gpu")
        || std::env::var("LITEPOST_DISABLE_WEBVIEW_GPU")
            .map(|value| value == "1" || value.eq_ignore_ascii_case("true"))
            .unwrap_or(false);

    if !disable_gpu {
        return;
    }

    const ENV_KEY: &str = "WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS";
    const DISABLE_GPU_ARG: &str = "--disable-gpu";

    let next_args = match std::env::var(ENV_KEY) {
        Ok(existing) if existing.split_whitespace().any(|arg| arg == DISABLE_GPU_ARG) => existing,
        Ok(existing) if !existing.trim().is_empty() => format!("{existing} {DISABLE_GPU_ARG}"),
        _ => DISABLE_GPU_ARG.to_string(),
    };

    std::env::set_var(ENV_KEY, next_args);
}

#[cfg(not(target_os = "windows"))]
fn configure_webview2_args() {}

fn main() {
    configure_webview2_args();
    litepost_lib::run()
}
