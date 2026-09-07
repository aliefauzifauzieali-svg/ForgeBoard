mod frontend;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_updater::Builder::new().build())
    .plugin(tauri_plugin_process::init())
    .register_asynchronous_uri_scheme_protocol(frontend::SCHEME, |ctx, request, responder| {
      let path = request.uri().path().to_owned();
      let (bytes, mime, status) = frontend::serve_asset(ctx.app_handle(), &path);
      let mut builder = tauri::http::Response::builder().status(status);
      if status == 200 {
        builder = builder.header(tauri::http::header::CONTENT_TYPE, mime);
      }
      let response = builder.body(bytes).unwrap_or_default();
      responder.respond(response);
    })
    .invoke_handler(tauri::generate_handler![
      frontend::frontend_check,
      frontend::frontend_apply
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      // Pré-aquece a pasta do frontend (o handler também garante).
      frontend::ensure_frontend(app.handle());
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
