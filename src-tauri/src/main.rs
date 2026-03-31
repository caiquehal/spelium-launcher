#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::env;
use std::path::{Path, PathBuf};
use tokio::process::Command;
use std::process::Stdio;
use tauri::{AppHandle, Emitter, Manager, State};
use tauri::tray::{TrayIconBuilder, TrayIconEvent, MouseButton};
use tokio::fs;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use rand::{distributions::Alphanumeric, Rng};
use zip::ZipArchive;
use sha2::{Digest, Sha256};
use sysinfo::System;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

mod mojang;

struct AppState {
    pub api_client: Client,
    pub is_game_running: Arc<AtomicBool>,
}

#[derive(Serialize, Deserialize, Debug)]
struct LoginResponse {
    success: bool,
    token: Option<String>,
    message: Option<String>,
}

#[derive(Serialize, Clone)]
pub struct ProgressEvent {
    pub status: String,
    pub message: String,
    pub progress: u8,
}

fn generate_random_temp_dir() -> PathBuf {
    let rand_string: String = rand::thread_rng()
        .sample_iter(&Alphanumeric)
        .take(16)
        .map(char::from)
        .collect();
    env::temp_dir().join(format!("spelium_ghost_{}", rand_string))
}

// Tüm kütüphane (.jar) dosyalarını özyinelemeli (recursive) olarak toplar
fn gather_libraries(dir: &Path, jars: &mut Vec<String>) {
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                gather_libraries(&path, jars);
            } else if path.extension().unwrap_or_default() == "jar" {
                if let Some(p) = path.to_str() {
                    jars.push(p.to_string());
                }
            }
        }
    }
}

async fn extract_ghost_mods(pak_path: &Path, extract_to: &Path) -> Result<(), String> {
    if !pak_path.exists() {
        return Err("spelium_core.pak (Mod Paketi) bulunamadı!".into());
    }

    fs::create_dir_all(extract_to).await.map_err(|e| e.to_string())?;

    let pak_file_path = pak_path.to_path_buf();
    let extract_to_path = extract_to.to_path_buf();

    tokio::task::spawn_blocking(move || -> Result<(), String> {
        let pak_file = std::fs::File::open(&pak_file_path).map_err(|e| e.to_string())?;
        let mut archive = ZipArchive::new(pak_file).map_err(|e| e.to_string())?;

        for i in 0..archive.len() {
            let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
            let outpath = match file.enclosed_name() {
                Some(path) => extract_to_path.join(path),
                None => continue,
            };

            if (*file.name()).ends_with('/') {
                std::fs::create_dir_all(&outpath).map_err(|e| e.to_string())?;
            } else {
                if let Some(p) = outpath.parent() {
                    if !p.exists() {
                        std::fs::create_dir_all(p).map_err(|e| e.to_string())?;
                    }
                }
                let mut outfile = std::fs::File::create(&outpath).map_err(|e| e.to_string())?;
                std::io::copy(&mut file, &mut outfile).map_err(|e| e.to_string())?;
            }
        }
        Ok(())
    })
    .await
    .map_err(|e| e.to_string())??;

    Ok(())
}

async fn compute_hash(path: &Path) -> Result<String, String> {
    if !path.exists() {
        return Ok("".to_string());
    }
    let mut file = fs::File::open(path).await.map_err(|e| e.to_string())?;
    let mut hasher = Sha256::new();
    let mut buffer = [0; 8192];
    loop {
        let n = file.read(&mut buffer).await.map_err(|e| e.to_string())?;
        if n == 0 { break; }
        hasher.update(&buffer[..n]);
    }
    Ok(hex::encode(hasher.finalize()))
}

async fn patch_game_files(base_dir: &Path, app: &AppHandle, client: &Client) -> Result<(), String> {
    let _ = app.emit("game-status", ProgressEvent {
        status: "checking".to_string(),
        message: "Kurulum yöneticisi başlatılıyor...".to_string(),
        progress: 0,
    });

    let manifest_url = "https://spelium.com/launcher/files.json";
    let res = client.get(manifest_url).send().await;
    
    // Eğer manifest bağlantısı yoksa pas geçip devam edebiliriz (Patcher devre dışı çalışır)
    if res.is_err() {
        println!("[Patcher] Sunucuya ulaşılamadı, yerel dosyalarla devam edilecek.");
        return Ok(());
    }
    
    let res = res.unwrap();
    if !res.status().is_success() {
        println!("[Patcher] Manifest 404/500 verdi, atlanıyor.");
        return Ok(());
    }

    let json_val: serde_json::Value = res.json().await.unwrap_or(serde_json::Value::Null);

    let files = if json_val.is_array() {
        json_val.as_array().unwrap().clone()
    } else if let Some(arr) = json_val.get("files").and_then(|v| v.as_array()) {
        arr.clone()
    } else {
        println!("[Patcher] JSON yapısı anlaşılamadı, geçiliyor.");
        return Ok(());
    };

    let total_files = files.len();
    if total_files == 0 { return Ok(()); }

    let mut needs_download = Vec::new();
    for (i, file_val) in files.iter().enumerate() {
        let path_str = file_val.get("path").and_then(|v| v.as_str()).unwrap_or("");
        let url_str = file_val.get("url").and_then(|v| v.as_str()).unwrap_or("");
        let hash_str = file_val.get("hash").and_then(|v| v.as_str()).unwrap_or("");

        if path_str.is_empty() || url_str.is_empty() { continue; }

        let target_path = base_dir.join(path_str);
        
        let local_hash = compute_hash(&target_path).await.unwrap_or_default();
        if local_hash != hash_str {
            needs_download.push((target_path, url_str.to_string(), path_str.to_string()));
        }

        let pct = ((i as f32 / total_files as f32) * 20.0) as u8;
        let _ = app.emit("game-status", ProgressEvent {
            status: "checking".to_string(),
            message: format!("Kontrol: {}", path_str),
            progress: pct,
        });
    }

    let download_count = needs_download.len();
    if download_count > 0 {
        for (i, (target_path, url, path_str)) in needs_download.iter().enumerate() {
            let pct = 20 + ((i as f32 / download_count as f32) * 80.0) as u8;
            let _ = app.emit("game-status", ProgressEvent {
                status: "patching".to_string(),
                message: format!("İndiriliyor: {} ({}/{})", path_str, i + 1, download_count),
                progress: pct,
            });

            if let Some(parent) = target_path.parent() {
                let _ = fs::create_dir_all(parent).await;
            }

            if let Ok(mut res) = client.get(url).send().await {
                if res.status().is_success() {
                    if let Ok(mut file) = fs::File::create(target_path).await {
                        while let Ok(Some(chunk)) = res.chunk().await {
                            let _ = file.write_all(&chunk).await;
                        }
                    }
                }
            }
        }
    }

    let _ = app.emit("game-status", ProgressEvent {
        status: "checking".to_string(),
        message: "Eşitleme tamamlandı, Patcher kapanıyor...".to_string(),
        progress: 100,
    });

    Ok(())
}

async fn cleanup_ghost_dir(dir_path: PathBuf) {
    if dir_path.exists() {
        let _ = fs::remove_dir_all(&dir_path).await;
        println!("[-] Hayalet yükleme dizini basariyla imha edildi: {:?}", dir_path);
    }
}

#[tauri::command]
async fn force_reset(_app: AppHandle) -> Result<String, String> {
    let app_data = env::var("APPDATA").map_err(|_| "APPDATA bulunamadı!".to_string())?;
    let base_dir = PathBuf::from(app_data).join(".spelium");
    
    let dirs_to_delete = ["versions", "libraries", "assets", "mods"];
    for d in dirs_to_delete.iter() {
        let path = base_dir.join(d);
        if path.exists() {
            let _ = fs::remove_dir_all(&path).await;
        }
    }
    Ok("Dosyalar başarıyla temizlendi.".to_string())
}

#[tauri::command]
fn get_total_ram() -> f64 {
    let mut sys = System::new();
    sys.refresh_memory();
    (sys.total_memory() as f64) / (1024.0 * 1024.0 * 1024.0)
}

#[tauri::command]
async fn launch_game(
    username: String,
    password: String, // Aslında token geliyor olabilir ama isimi bozmadık
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<String, String> {
    println!("[*] Oyun baslatma istegi alindi: {}", username);

    // TODO: Login işlemi artık React tarafında yapıyorsan, bu kısmı atlayabilirsin.
    // Ancak orijinal kodda bırakıldığı için dokunmuyoruz.
    let token = password.clone(); // Token'i frontend'den gönderiyorsan direkt al

    // '.spelium' dizini tespiti (Sabit Roaming)
    let app_data = env::var("APPDATA").map_err(|_| "APPDATA bulunamadı!".to_string())?;
    let base_dir = PathBuf::from(app_data).join(".spelium");
    
    // YENİ PATCHER (İndirme Yöneticisi)
    println!("[*] Patcher baslatiliyor...");
    
    // Resmi Mojang ve Fabric kütüphanelerini eşitle
    mojang::download_minecraft_and_fabric(&base_dir, &app, &state.api_client).await?;
    
    // Spelium özel mod dosyalarını eşitle
    patch_game_files(&base_dir, &app, &state.api_client).await?;
    
    // Ghost Mod Dizini (Artık direkt Native Game_Dir / mods olarak kullanıyoruz)
    let ghost_mods_dir = base_dir.join("mods");
    let pak_file_path = base_dir.join("spelium_core.pak");

    // SADECE spelium_core.pak varsa eski modları temizle ve paketi çıkart.
    // Eğer pak yoksa dokunma ki geliştirici manuel attığı modlarla (src/mods'tan kopyaladığı vb.) oynayabilsin.
    if pak_file_path.exists() {
        let _ = fs::remove_dir_all(&ghost_mods_dir).await;
        let _ = fs::create_dir_all(&ghost_mods_dir).await;
        
        println!("[*] Ghost Mod Klasoru hazirlaniyor...");
        let _ = extract_ghost_mods(&pak_file_path, &ghost_mods_dir).await;
        println!("[+] Modlar gecici ortama cikartildi.");
    } else {
        println!("[!] spelium_core.pak bulunamadi. Mevcut .spelium/mods klasoru korunuyor.");
        if !ghost_mods_dir.exists() {
            let _ = fs::create_dir_all(&ghost_mods_dir).await;
        }

        // [DEVELOPER MODE]: Eğer "src/mods" klasörü mevcutsa (yani projeden çalıştırılıyorsa), içindekileri kopyala
        let dev_mods_dir = env::current_dir().unwrap_or_default().parent().unwrap_or(Path::new("")).join("src").join("mods");
        if dev_mods_dir.exists() {
            println!("[DEV] Proje dizinindeki src/mods bulundu, dosyalar kopyalaniyor...");
            if let Ok(mut entries) = fs::read_dir(&dev_mods_dir).await {
                while let Ok(Some(entry)) = entries.next_entry().await {
                    let path = entry.path();
                    if path.extension().unwrap_or_default() == "jar" {
                        let dest = ghost_mods_dir.join(entry.file_name());
                        // Eğer dosya yoksa veya boyutu farklıysa kopyala (optimizasyon)
                        let should_copy = match fs::metadata(&dest).await {
                            Ok(meta) => {
                                if let Ok(src_meta) = fs::metadata(&path).await {
                                    meta.len() != src_meta.len()
                                } else {
                                    true
                                }
                            },
                            Err(_) => true,
                        };
                        
                        if should_copy {
                            let _ = fs::copy(&path, &dest).await;
                        }
                    }
                }
            }
        }
    }

    // Java 21 Taşınabilir Runtime (Otomatik İndirir veya Bulur)
    let current_java = mojang::download_java_runtime(&base_dir, &app, &state.api_client).await?;

    let mc_jar = base_dir.join("versions").join("1.21.11").join("1.21.11.jar");
    let libraries_dir = base_dir.join("libraries");

    // Java komutunu oluştur, eski senkron process yerine tokio süreci!
    let mut cmd = Command::new(current_java);
    cmd.current_dir(&base_dir);

    // RAM ve Teoware Güvenlik Ayarları
    cmd.arg("-Xmx4G");
    cmd.arg("-Xms2G");
    cmd.arg("-XX:+DisableAttachMechanism");
    cmd.arg(format!("-Dspelium.token={}", token));

    // Kütüphaneleri özyinelemeli olarak topla (CRITICAL FIX FOR KNOTCLIENT)
    let mut class_paths = Vec::new();
    if mc_jar.exists() {
        class_paths.push(mc_jar.to_str().unwrap().to_string());
    }
    gather_libraries(&libraries_dir, &mut class_paths);
    
    // Sadece "libraries/*" çalışmaz. Tüm klasörleri noktalı virgül(;) ile birleştiriyoruz.
    let cp_string = class_paths.join(";");
    
    cmd.arg("-cp").arg(cp_string);
    cmd.arg("net.fabricmc.loader.impl.launch.knot.KnotClient");

    cmd.arg("--username").arg(&username);
    cmd.arg("--version").arg("Spelium-1.21.11");
    cmd.arg("--gameDir").arg(base_dir.display().to_string());
    cmd.arg("--assetsDir").arg(base_dir.join("assets").display().to_string());
    cmd.arg("--assetIndex").arg("1.21.11");
    cmd.arg("--uuid").arg("00000000-0000-0000-0000-000000000000");
    cmd.arg("--accessToken").arg(&token);
    cmd.arg("--userType").arg("msa");

    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped()); // Hataları terminalden görmek için stderr'i açtık

    println!("[*] Minecraft motoru ateşleniyor... (Arkaplan process'i Spawn ediliyor)");

    match cmd.spawn() {
        Ok(mut child) => {
            // Polling mekanizması için state'i anında True yapıyoruz
            state.is_game_running.store(true, Ordering::SeqCst);

            // Logları canlı olarak asenkron aktarmak için Piped kanalından alıyoruz
            if let Some(stdout) = child.stdout.take() {
                tokio::spawn(async move {
                    use tokio::io::{AsyncBufReadExt, BufReader};
                    let mut reader = BufReader::new(stdout).lines();
                    while let Ok(Some(line)) = reader.next_line().await {
                        println!("[Minecraft Log] {}", line);
                    }
                });
            }

            if let Some(stderr) = child.stderr.take() {
                tokio::spawn(async move {
                    use tokio::io::{AsyncBufReadExt, BufReader};
                    let mut reader = BufReader::new(stderr).lines();
                    while let Ok(Some(line)) = reader.next_line().await {
                        eprintln!("[Minecraft Hata] {}", line);
                    }
                });
            }

            // Rust UI'yi yönetmeli, böylece Race Condition olmaz
            let _ = app.emit("game-status", ProgressEvent {
                status: "playing".to_string(),
                message: "Minecraft çalışıyor...".to_string(),
                progress: 100,
            });

            // React'in arayüzü güncelleyebilmesi ve "Oyunda" frame'ini çizebilmesi için 
            // pencereyi OS seviyesinde uyutmadan hemen önce 150ms ufak bir pay bırakıyoruz.
            // Aksi takdirde pencere bir önceki "checking" evresinde (freeze) donuk kalır.
            tokio::time::sleep(tokio::time::Duration::from_millis(150)).await;

            // Native PENCERE GİZLEME (JS Eklenti kısıtlamalarına takılmamak için)
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.hide();
            }

            // UI Thread'in bloklanmasını önleyen kritik asenkron spawn
            let ghost_mods_dir_clone = ghost_mods_dir.clone();
            let app_handle = app.clone();
            tokio::spawn(async move {
                let _ = child.wait().await;
                
                // Polling döngüsünü bilgilendirmek için false
                let s = app_handle.state::<AppState>();
                s.is_game_running.store(false, Ordering::SeqCst);

                println!("[!] Minecraft istemcisi kapandı. Temizlik yapılıyor...");
                cleanup_ghost_dir(ghost_mods_dir_clone).await;
                
                // Native PENCERE GÖSTERME (Event'ten ÖNCE yapıyoruz ki Chromium gizli pencerede event'i yutmasın)
                if let Some(window) = app_handle.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }

                // Webview'in uykudan (Suspend) uyanması ve IPC mesajlarını kabul etmeye başlaması için yarım saniye bekle
                tokio::time::sleep(tokio::time::Duration::from_millis(300)).await;

                let _ = app_handle.emit("game-status", ProgressEvent {
                    status: "idle".to_string(),
                    message: "".to_string(),
                    progress: 0,
                });
            });

            Ok("Oyun başarıyla arka planda başlatıldı.".into())
        }
        Err(e) => {
            let _ = cleanup_ghost_dir(ghost_mods_dir).await;
            Err(format!("Process başlatılamadı: {}", e))
        }
    }
}

#[tauri::command]
fn check_game_state(state: tauri::State<'_, AppState>) -> bool {
    state.is_game_running.load(Ordering::SeqCst)
}

#[tauri::command]
fn restore_window(app_handle: AppHandle) {
    if let Some(window) = app_handle.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // Pencere Boyutlandırma ve Gösterme Mantığı
            if let Some(window) = app.get_webview_window("main") {
                if let Ok(Some(monitor)) = window.primary_monitor() {
                    let screen_size = monitor.size();
                    let scale_factor = monitor.scale_factor();
                    
                    // Ekranın %70'ini hesapla (Logical birimler üzerinden)
                    let width = (screen_size.width as f64 / scale_factor * 0.7) as f64;
                    let height = (screen_size.height as f64 / scale_factor * 0.7) as f64;
                    
                    let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize {
                        width,
                        height,
                    }));
                    let _ = window.center();
                }
            }

            // Tray (Sistem Tepsisi) Ayarları
            if let Some(icon) = app.default_window_icon() {
                let _tray = TrayIconBuilder::new()
                    .icon(icon.clone())
                    .tooltip("Spelium Launcher")
                    .on_tray_icon_event(|tray, event| {
                        if let TrayIconEvent::Click { button: MouseButton::Left, .. } = event {
                            if let Some(window) = tray.app_handle().get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    })
                    .build(app)?;
            }
            Ok(())
        })
        .manage(AppState {
            api_client: Client::new(),
            is_game_running: Arc::new(AtomicBool::new(false)),
        })
        .invoke_handler(tauri::generate_handler![launch_game, force_reset, get_total_ram, check_game_state, restore_window])
        .run(tauri::generate_context!())
        .expect("Tauri uygulamasi calistirilirken hata olustu");
}
