use std::fs;
use std::io::Write;

use tauri_plugin_window_state::StateFlags;

const DIAG_FILE: &str = "/tmp/orbit-diag.log";

/// Append a diagnostic line (debugging helper).
#[tauri::command]
fn log_diag(message: String) {
    if let Ok(mut f) = fs::OpenOptions::new().create(true).append(true).open(DIAG_FILE) {
        let _ = writeln!(f, "{}", message);
    }
}

/// Write an arbitrary local file (used for data export / backups).
#[tauri::command]
fn write_file(path: String, contents: String) -> Result<(), String> {
    fs::write(&path, contents).map_err(|e| e.to_string())
}

/// Read an arbitrary local file (used for data import).
#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

/// Copy an arbitrary local file (used for local database backups).
#[tauri::command]
fn copy_file(src: String, dest: String) -> Result<(), String> {
    fs::copy(&src, &dest).map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(
            tauri_plugin_window_state::Builder::new()
                .with_state_flags(StateFlags::all().difference(StateFlags::DECORATIONS))
                .build(),
        )
        .invoke_handler(tauri::generate_handler![log_diag, write_file, read_file, copy_file])
        .run(tauri::generate_context!())
        .expect("error while running Orbit");
}
