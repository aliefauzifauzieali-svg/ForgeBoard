//! Frontend servido de pasta externa (atualizações sem reinstalar).
//!
//! - Esquema `forgeboard://localhost/` lê `%APPDATA%/…/frontend/` (Linux/macOS:
//!   equivalente via `app_data_dir`), populado dos recursos embutidos no
//!   primeiro boot ou quando a versão diverge do bundle.
//! - Atualização do app (binário completo): plugin oficial
//!   `tauri-plugin-updater` acionado pelo frontend
//!   (`checkBinaryUpdate`/`installBinaryUpdate` em `desktopUpdater.ts`).
//!   Não há mais OTA só-de-frontend: o instalador é a única via.
//! - Migração de dados: o IndexedDB do esquema antigo (`http_tauri.localhost`)
//!   é copiado para o novo (`http_forgeboard.localhost`) uma única vez.
//!   localStorage não migra (espelhos rederivados do IDB no boot).

use std::path::{Component, Path, PathBuf};
use std::sync::OnceLock;
use tauri::{AppHandle, Manager};

pub const SCHEME: &str = "forgeboard";
const SEED_DIR: &str = "frontend-seed";
const LIVE_DIR: &str = "frontend";
const VERSION_FILE: &str = "version.json";
const MARKER_MIGRATED: &str = ".idb-migrated";

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

/// Decisão de seed: nunca apaga pasta mais nova (é assim que updates
/// incrementais sobrevivem a reinícios). Só popula quando falta tudo.
#[derive(Debug, PartialEq, Eq)]
enum SeedDecision {
  /// Pasta íntegra na versão corrente: não toca.
  UpToDate,
  /// Sem `version.json` ou sem `index.html`: popula dos recursos.
  SeedFresh,
  /// Pasta válida de outra versão (ex.: update aplicado): preserva.
  KeepNewer,
}

fn decide_seed(installed: Option<&str>, pkg: &str, has_index: bool) -> SeedDecision {
  if !has_index {
    return SeedDecision::SeedFresh;
  }
  match installed {
    None => SeedDecision::SeedFresh,
    Some(v) if v == pkg => SeedDecision::UpToDate,
    Some(_) => SeedDecision::KeepNewer,
  }
}

/// Garante a pasta do frontend populada. Idempotente e sem downgrade:
/// uma pasta válida nunca é apagada (updates sobrevivem ao reboot).
pub fn ensure_frontend(app: &AppHandle) -> Option<PathBuf> {
  let live = live_dir(app)?;
  let pkg = package_version(app);
  let has_index = live.join("index.html").is_file();
  match decide_seed(read_version(&live).as_deref(), pkg.as_str(), has_index) {
    SeedDecision::SeedFresh => {
      if let Some(seed) = seed_dir(app) {
        let _ = std::fs::remove_dir_all(&live);
        if copy_dir_recursive(&seed, &live).is_ok() {
          write_version(&live, &pkg);
          migrate_indexeddb(app);
        }
      }
    }
    SeedDecision::UpToDate | SeedDecision::KeepNewer => {}
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
  fn decide_seed_nunca_apaga_pasta_valida() {
    use SeedDecision::*;
    // Pasta íntegra na versão do bundle: não toca.
    assert_eq!(decide_seed(Some("1.5.2"), "1.5.2", true), UpToDate);
    // Pasta de update aplicado (mais nova que o bundle): PRESERVA.
    // (Era o bug: reabrir o app apagava o update e oferecia de novo.)
    assert_eq!(decide_seed(Some("1.5.4"), "1.5.2", true), KeepNewer);
    // Sem version.json ou sem index.html: popula do zero.
    assert_eq!(decide_seed(None, "1.5.2", true), SeedFresh);
    assert_eq!(decide_seed(Some("1.5.2"), "1.5.2", false), SeedFresh);
  }
}
