use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize)]
struct FetchOptions {
    method: String,
    headers: HashMap<String, String>,
    body: Option<String>,
}

#[derive(Serialize, Deserialize)]
struct FetchResponse {
    ok: bool,
    status: u16,
    body: String,
}

#[tauri::command]
async fn secure_fetch(url: String, options: FetchOptions) -> Result<FetchResponse, String> {
    // Only skip cert validation for localhost
    let is_localhost = url.contains("://localhost") || url.contains("://127.0.0.1");

    let client = reqwest::Client::builder()
        .danger_accept_invalid_certs(is_localhost)
        .build()
        .map_err(|e| e.to_string())?;

    let mut request = match options.method.as_str() {
        "GET" => client.get(&url),
        "POST" => client.post(&url),
        "PUT" => client.put(&url),
        "DELETE" => client.delete(&url),
        _ => return Err("Unsupported HTTP method".to_string()),
    };

    for (key, value) in options.headers {
        request = request.header(key, value);
    }

    if let Some(body) = options.body {
        request = request.body(body);
    }

    let response = request.send().await.map_err(|e| e.to_string())?;
    let status = response.status().as_u16();
    let ok = response.status().is_success();
    let body = response.text().await.map_err(|e| e.to_string())?;

    Ok(FetchResponse { ok, status, body })
}

#[tauri::command]
async fn secure_upload(
    url: String,
    file_path: String,
    file_name: String,
    api_key: String,
    update: bool,
) -> Result<FetchResponse, String> {
    // Only skip cert validation for localhost
    let is_localhost = url.contains("://localhost") || url.contains("://127.0.0.1");

    let client = reqwest::Client::builder()
        .danger_accept_invalid_certs(is_localhost)
        .build()
        .map_err(|e| e.to_string())?;

    let file_content = std::fs::read(&file_path).map_err(|e| e.to_string())?;

    // Determine MIME type based on file extension
    let mime_type = mime_guess::from_path(&file_path)
        .first_or_octet_stream()
        .to_string();

    let form = reqwest::multipart::Form::new()
        .part(
            "file",
            reqwest::multipart::Part::bytes(file_content)
                .file_name(file_name)
                .mime_str(&mime_type)
                .map_err(|e| e.to_string())?
        )
        .text("update", update.to_string());

    let response = client
        .post(&url)
        .header("X-API-Key", api_key)
        .multipart(form)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let status = response.status().as_u16();
    let ok = response.status().is_success();
    let body = response.text().await.map_err(|e| e.to_string())?;

    Ok(FetchResponse { ok, status, body })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![secure_fetch, secure_upload])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
