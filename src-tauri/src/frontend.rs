//! Frontend servido de pasta externa (atualizações sem reinstalar).
//!
//! - Esquema `forgeboard://localhost/` lê `%APPDATA%/…/frontend/` (Linux/macOS:
//!   equivalente via `app_data_dir`), populado dos recursos embutidos no
//!   primeiro boot ou quando a versão diverge do bundle.
//! - `frontend_check` / `frontend_apply` implementam o update incremental:
//!   baixa `forgeboard-web-<tag>.zip` da release, troca a pasta com backup
//!   e recarrega — sem MSI, sem admin.
//! - Migração de dados: o IndexedDB do esquema antigo (`http_tauri.localhost`)
//!   é copiado para o novo (`http_forgeboard.localhost`) uma única vez.
//!   localStorage não migra (espelhos rederivados do IDB no boot).

use std::io::Cursor;
use std::path::{Component, Path, PathBuf};
use std::sync::OnceLock;
use tauri::{AppHandle, Manager};

pub const SCHEME: &str = "forgeboard";
const SEED_DIR: &str = "frontend-seed";
const LIVE_DIR: &str = "frontend";
const BACKUP_DIR: &str = "frontend.bak";
const VERSION_FILE: &str = "version.json";
const MARKER_MIGRATED: &str = ".idb-migrated";
const MANIFEST_URL: &str =
  "https://github.com/aliefauzifauzieali-svg/ForgeBoard/releases/latest/download/latest.json";

static FRONTEND_DIR: OnceLock<PathBuf> = OnceLock::new();

fn data_root(app: &AppHandle) -> Option<PathBuf> {
  app.path().app_data_dir().ok()
}

fn live_dir(app: &AppHandle) -> Option<PathBuf> {
  data_root(app).map(|d| d.join(LIVE_DIR))
}

fn seed_dir(app: &AppHandle) -> Option<PathBuf> {
  let resource = app.path().resource_dir().ok()?.join(SEED_DIR);
  if resource.join("index.html").is_file() {
    return Some(resource);
  }
  None
}

fn read_version(dir: &Path) -> Option<String> {
  let raw = std::fs::read_to_string(dir.join(VERSION_FILE)).ok()?;
  serde_json::from_str::<serde_json::Value>(&raw)
    .ok()?
    .get("version")?
    .as_str()
    .map(|s| s.to_owned())
}

fn package_version(app: &AppHandle) -> String {
  app.package_info().version.to_string()
}

fn copy_dir_recursive(src: &Path, dst: &Path) -> std::io::Result<()> {
  std::fs::create_dir_all(dst)?;
  for entry in std::fs::read_dir(src)? {
    let entry = entry?;
    let from = entry.path();
    let to = dst.join(entry.file_name());
    if from.is_dir() {
      copy_dir_recursive(&from, &to)?;
    } else {
      std::fs::copy(&from, &to)?;
    }
  }
  Ok(())
}

fn write_version(dir: &Path, version: &str) {
  let _ = std::fs::write(
    dir.join(VERSION_FILE),
    serde_json::json!({ "version": version }).to_string(),
  );
}

/// Copia o IndexedDB do esquema antigo para o novo (uma vez). Retorna
/// quantos diretórios de origem foram migrados.
fn migrate_indexeddb(app: &AppHandle) -> usize {
  let profile = profile_dir(app);
  let idb = match profile {
    Some(p) => p.join("EBWebView").join("Default").join("IndexedDB"),
    None => return 0,
  };
  if !idb.is_dir() {
    return 0;
  }
  let marker = idb.join(MARKER_MIGRATED);
  if marker.is_file() {
    return 0;
  }
  let mut moved = 0;
  let entries = std::fs::read_dir(&idb).map(|r| r.collect::<Vec<_>>()).unwrap_or_default();
  for entry in entries.into_iter().flatten() {
    let name = entry.file_name().to_string_lossy().into_owned();
    if !name.starts_with("http_tauri.localhost") {
      continue;
    }
    let target_name = name.replacen("http_tauri.localhost", "http_forgeboard.localhost", 1);
    let target = idb.join(&target_name);
    if target.exists() {
      continue;
    }
    if copy_dir_recursive(&entry.path(), &target).is_ok() {
      moved += 1;
    }
  }
  let _ = std::fs::write(&marker, "1");
  moved
}

/// Localiza o perfil WebView2 (onde mora o IndexedDB por origem).
fn profile_dir(app: &AppHandle) -> Option<PathBuf> {
  // Layout observado: <app_local_data>/EBWebView/Default.
  if let Ok(local) = app.path().app_local_data_dir() {
    let candidate = local.join("EBWebView").join("Default");
    if candidate.join("IndexedDB").is_dir() {
      if let Some(profile) = candidate
        .parent()
        .and_then(|p| p.parent())
        .map(|p| p.to_path_buf())
      {
        return Some(profile);
      }
    }
  }
  // Alternativa: <app_data>/EBWebView/Default.
  if let Some(root) = data_root(app) {
    let candidate = root.join("EBWebView").join("Default");
    if candidate.join("IndexedDB").is_dir() {
      return Some(root);
    }
  }
  None
}

/// Garante a pasta do frontend populada na versão do bundle. Idempotente.
pub fn ensure_frontend(app: &AppHandle) -> Option<PathBuf> {
  let live = live_dir(app)?;
  let pkg = package_version(app);
  let needs_seed = read_version(&live).as_deref() != Some(pkg.as_str());
  if needs_seed {
    if let Some(seed) = seed_dir(app) {
      let _ = std::fs::remove_dir_all(&live);
      if copy_dir_recursive(&seed, &live).is_ok() {
        write_version(&live, &pkg);
        migrate_indexeddb(app);
      }
    }
  }
  if live.join("index.html").is_file() {
    Some(live)
  } else {
    None
  }
}

fn frontend_dir_cached(app: &AppHandle) -> Option<PathBuf> {
  if let Some(dir) = FRONTEND_DIR.get() {
    return Some(dir.clone());
  }
  let dir = ensure_frontend(app)?;
  let _ = FRONTEND_DIR.set(dir.clone());
  Some(dir)
}

/// Mapeia caminho da URL para arquivo, sem escapar da pasta (traversal → None).
pub fn resolve_asset(frontend_dir: &Path, uri_path: &str) -> Option<PathBuf> {
  let rel = uri_path.trim_start_matches('/');
  let rel = if rel.is_empty() { "index.html" } else { rel };
  let mut out = frontend_dir.to_path_buf();
  for comp in Path::new(rel).components() {
    match comp {
      Component::Normal(part) => out.push(part),
      _ => return None,
    }
  }
  if !out.starts_with(frontend_dir) {
    return None;
  }
  Some(out)
}

pub fn mime_for(path: &Path) -> &'static str {
  match path.extension().and_then(|e| e.to_str()).unwrap_or("").to_ascii_lowercase().as_str() {
    "html" => "text/html",
    "js" | "mjs" => "text/javascript",
    "css" => "text/css",
    "json" | "map" => "application/json",
    "svg" => "image/svg+xml",
    "png" => "image/png",
    "ico" => "image/x-icon",
    "webp" => "image/webp",
    "woff2" => "font/woff2",
    "woff" => "font/woff",
    "ttf" => "font/ttf",
    "txt" => "text/plain",
    "webmanifest" => "application/manifest+json",
    _ => "application/octet-stream",
  }
}

pub fn serve_asset(app: &AppHandle, uri_path: &str) -> (Vec<u8>, &'static str, u16) {
  let not_found = (Vec::new(), "text/plain", 404u16);
  let Some(dir) = frontend_dir_cached(app) else {
    return not_found;
  };
  let mut path = match resolve_asset(&dir, uri_path) {
    Some(p) => p,
    None => return not_found,
  };
  // index.html ausente = instalação corrompida: tenta repovoar uma vez.
  if !path.is_file() {
    if path.file_name().is_some_and(|n| n == "index.html") {
      let _ = std::fs::remove_dir_all(&dir);
      if ensure_frontend(app).is_some() {
        path = dir.join("index.html");
      }
    }
    if !path.is_file() {
      return not_found;
    }
  }
  match std::fs::read(&path) {
    Ok(bytes) => {
      let mime = mime_for(&path);
      (bytes, mime, 200u16)
    }
    Err(_) => not_found,
  }
}

fn parse_triplet(v: &str) -> [u64; 3] {
  let mut out = [0u64; 3];
  for (i, part) in v.split('.').take(3).enumerate() {
    out[i] = part.parse().unwrap_or(0);
  }
  out
}

/// -1/0/1 comparando `a.b.c` numericamente.
pub fn compare_versions(a: &str, b: &str) -> i32 {
  let (pa, pb) = (parse_triplet(a), parse_triplet(b));
  if pa == pb {
    0
  } else if pa < pb {
    -1
  } else {
    1
  }
}

fn web_zip_url(version: &str) -> String {
  format!(
    "https://github.com/aliefauzifauzieali-svg/ForgeBoard/releases/download/v{version}/forgeboard-web-v{version}.zip"
  )
}

#[derive(serde::Serialize)]
pub struct FrontendStatus {
  pub available: bool,
  pub version: Option<String>,
  /// Versão do bundle nativo (para avisar de instalador novo).
  pub bundle_version: String,
  /// true quando o manifesto supera o bundle (mudança nativa possível).
  pub bundle_update: bool,
}

/// Versão do manifesto vs. instalada (pasta) e vs. bundle (nativo).
/// O zip (`v<versão>` + `forgeboard-web-<tag>.zip`, publicado pelo CI) é
/// derivado por convenção em `frontend_apply`.
#[tauri::command]
pub async fn frontend_check(app: AppHandle) -> Result<FrontendStatus, String> {
  let installed = live_dir(&app)
    .and_then(|d| read_version(&d))
    .unwrap_or_else(|| "0.0.0".to_owned());
  let bundle = package_version(&app);
  let body = reqwest::get(MANIFEST_URL)
    .await
    .map_err(|e| format!("falha ao buscar manifesto: {e}"))?
    .error_for_status()
    .map_err(|e| format!("manifesto HTTP inválido: {e}"))?
    .json::<serde_json::Value>()
    .await
    .map_err(|e| format!("manifesto inválido: {e}"))?;
  let latest = body
    .get("version")
    .and_then(|v| v.as_str())
    .unwrap_or_default();
  if latest.is_empty() {
    return Err("manifesto sem versão".to_owned());
  }
  Ok(FrontendStatus {
    available: compare_versions(&installed, latest) < 0,
    version: Some(latest.to_owned()),
    bundle_update: compare_versions(&bundle, latest) < 0,
    bundle_version: bundle,
  })
}

/// Baixa o zip da versão, extrai para pasta temporária e troca com backup.
/// Em erro, restaura o backup. Requer `frontend_check` prévio implícito.
#[tauri::command]
pub async fn frontend_apply(app: AppHandle, version: String) -> Result<(), String> {
  let Some(root) = data_root(&app) else {
    return Err("diretório de dados indisponível".to_owned());
  };
  let live = root.join(LIVE_DIR);
  let next = root.join("frontend.next");
  let backup = root.join(BACKUP_DIR);
  let _ = std::fs::remove_dir_all(&next);

  let url = web_zip_url(&version);
  let bytes = reqwest::get(&url)
    .await
    .map_err(|e| format!("falha ao baixar: {e}"))?
    .error_for_status()
    .map_err(|e| format!("download HTTP inválido: {e}"))?
    .bytes()
    .await
    .map_err(|e| format!("falha ao ler download: {e}"))?;

  let mut archive =
    zip::ZipArchive::new(Cursor::new(bytes)).map_err(|e| format!("zip inválido: {e}"))?;
  for i in 0..archive.len() {
    let mut file = archive.by_index(i).map_err(|e| format!("zip inválido: {e}"))?;
    let Some(path) = file.enclosed_name() else {
      continue;
    };
    let out = next.join(path);
    if file.is_dir() {
      std::fs::create_dir_all(&out).map_err(|e| format!("falha ao extrair: {e}"))?;
    } else {
      if let Some(parent) = out.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("falha ao extrair: {e}"))?;
      }
      let mut target = std::fs::File::create(&out).map_err(|e| format!("falha ao extrair: {e}"))?;
      std::io::copy(&mut file, &mut target).map_err(|e| format!("falha ao extrair: {e}"))?;
    }
  }
  if !next.join("index.html").is_file() {
    let _ = std::fs::remove_dir_all(&next);
    return Err("pacote sem index.html".to_owned());
  }

  let _ = std::fs::remove_dir_all(&backup);
  let had_live = live.is_dir();
  if had_live {
    std::fs::rename(&live, &backup).map_err(|e| format!("falha no backup: {e}"))?;
  }
  let swapped = std::fs::rename(&next, &live).is_ok();
  if !swapped {
    if had_live {
      let _ = std::fs::rename(&backup, &live);
    }
    let _ = std::fs::remove_dir_all(&next);
    return Err("falha ao trocar a pasta".to_owned());
  }
  write_version(&live, &version);
  let _ = std::fs::remove_dir_all(&backup);
  Ok(())
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn resolve_bloqueia_traversal() {
    let base = Path::new("/data/frontend");
    assert!(resolve_asset(base, "/../secret").is_none());
    assert!(resolve_asset(base, "/a/../../b").is_none());
    assert!(resolve_asset(base, "").is_some());
    let index = resolve_asset(base, "/").unwrap();
    assert!(index.ends_with("index.html"));
    let js = resolve_asset(base, "/assets/app.js").unwrap();
    assert!(js.ends_with("app.js"));
  }

  #[test]
  fn mime_por_extensao() {
    assert_eq!(mime_for(Path::new("a.html")), "text/html");
    assert_eq!(mime_for(Path::new("a.JS")), "text/javascript");
    assert_eq!(mime_for(Path::new("a.css")), "text/css");
    assert_eq!(mime_for(Path::new("a.json")), "application/json");
    assert_eq!(mime_for(Path::new("a.svg")), "image/svg+xml");
    assert_eq!(mime_for(Path::new("a.png")), "image/png");
    assert_eq!(mime_for(Path::new("a.xyz")), "application/octet-stream");
  }

  #[test]
  fn compara_versoes() {
    assert_eq!(compare_versions("1.5.1", "1.5.1"), 0);
    assert_eq!(compare_versions("1.5.0", "1.5.1"), -1);
    assert_eq!(compare_versions("1.10.0", "1.9.9"), 1);
    assert_eq!(compare_versions("2.0", "10.0.0"), -1);
  }

  #[test]
  fn zip_url_por_convencao() {
    assert_eq!(
      web_zip_url("1.5.1"),
      "https://github.com/aliefauzifauzieali-svg/ForgeBoard/releases/download/v1.5.1/forgeboard-web-v1.5.1.zip"
    );
  }
}
