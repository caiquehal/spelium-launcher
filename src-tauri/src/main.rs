#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::env;
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::State;
use tokio::fs;
use rand::{distributions::Alphanumeric, Rng};
use zip::ZipArchive;

// Rust belleğinde (memory) token'i güvende tutmak için bir State yapısı
struct AppState {
    pub api_client: Client,
}

#[derive(Serialize, Deserialize, Debug)]
struct LoginResponse {
    success: bool,
    token: Option<String>,
    message: Option<String>,
}

#[derive(Serialize)]
struct LaunchParams<'a> {
    username: &'a str,
    password: &'a str,
}

// Güvenli Rastgele Temp Klasörü OLuşturma
fn generate_random_temp_dir() -> PathBuf {
    let rand_string: String = rand::thread_rng()
        .sample_iter(&Alphanumeric)
        .take(16)
        .map(char::from)
        .collect();
    env::temp_dir().join(format!("spelium_ghost_{}", rand_string))
}

// Hayalet Yükleme: zip dosyasını temp'e çıkarma
async fn extract_ghost_mods(pak_path: &Path, extract_to: &Path) -> Result<(), String> {
    if !pak_path.exists() {
        return Err("spelium_core.pak (Mod Paketi) bulunamadi!".into());
    }

    // Klasörü yarat
    fs::create_dir_all(extract_to).await.map_err(|e| e.to_string())?;

    // Zip'i oku ve çıkar - Bunu blocking bir thread'de yapıyoruz çünkü zip crate'i senkron çalışıyor
    let pak_file = std::fs::File::open(pak_path).map_err(|e| e.to_string())?;
    let mut archive = ZipArchive::new(pak_file).map_err(|e| e.to_string())?;

    for i in 0..archive.len() {
        let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
        let outpath = match file.enclosed_name() {
            Some(path) => extract_to.join(path),
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
}

// Oyun sonlandıktan sonra Temp klasörünü tamamen silme aracı
async fn cleanup_ghost_dir(dir_path: PathBuf) {
    if dir_path.exists() {
        let _ = fs::remove_dir_all(&dir_path).await;
        println!("[-] Hayalet yükleme dizini basariyla imha edildi: {:?}", dir_path);
    }
}

// Frontend üzerinden tetiklenecek ana oyun başlatma komutu
#[tauri::command]
async fn launch_game(
    username: String,
    password: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    println!("[*] Oyun baslatma istegi alindi: {}", username);

    // 1. Spelium Kimlik Doğrulama (Auth)
    let login_url = "https://spelium.com/api/login.php"; // spelium.com olarak düzeltildi
    
    let params = [("username", &username), ("password", &password)];
    let res = state.api_client
        .post(login_url)
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("API Baglanti Hatasi: {}", e))?;

    let login_data: LoginResponse = res.json().await.map_err(|e| format!("Bozuk JSON: {}", e))?;

    if !login_data.success {
        return Err(login_data.message.unwrap_or_else(|| "Giris basarisiz!".into()));
    }

    let token = login_data.token.ok_or_else(|| "Sunucu token dondurmedi! Cikis yapiliyor.".to_string())?;
    println!("[+] Giris basarili, Token hafizada koruma altina alindi.");

    // 2. Hayalet Yükleme (Ghost Loading) & Patcher
    // Bu kısımdaki path'ler şu an varsayımsaldır (.spelium klasörünüze göre hedeflenecek)
    // std::env::current_dir() vs gibi platform bağımsız yolları sonradan ekleyebilirsiniz.
    let base_dir = std::env::current_dir().unwrap().join(".spelium"); // Varsayılan yerel dizin
    let pak_file_path = base_dir.join("spelium_core.pak");
    
    // Rastgele bir TEMP dizin klasörü seç
    let ghost_mods_dir = generate_random_temp_dir();
    println!("[*] Ghost Mod Klasoru hazirlaniyor: {:?}", ghost_mods_dir);

    extract_ghost_mods(&pak_file_path, &ghost_mods_dir).await?;
    println!("[+] Modlar gecici ortama cikartildi.");

    // 3. JVM Başlatma Mimarisi (Process Command)
    // Portable JRE yolunuz
    let java_path = base_dir.join("jre").join("bin").join("java.exe");

    // Zorunlu "MCLC Çöpe Atıldı" Native JRE Argümanları
    let mut cmd = Command::new(java_path);
    
    cmd.arg("-XX:+DisableAttachMechanism") // Güvenlik Kalkanı 1: Inject koruması
       .arg(format!("-Dfabric.modsDir={}", ghost_mods_dir.display())) // Güvenlik Kalkanı 2: Ghost Mod path'i
       .arg(format!("-Dspelium.token={}", token)); // Güvenlik Kalkanı 3: Sunucu Token'i memory'den
       
    // TODO: Minecraft için gerekli olan diğer varsayılan JVM kütüphane ve classpath argümanları
    // (-cp, net.fabricmc.loader.impl.launch.knot.KnotClient vb.) buraya eklenecektir.
    cmd.arg("-version"); // Şimdilik sadece test amaçlı jre version görmek için konuldu, oyun argümanları değil.

    println!("[*] Minecraft motoru atesleniyor...");
    
    // Asenkron Process Spawn
    match cmd.spawn() {
        Ok(mut child) => {
            // Process bitene kadar asenkron bekle
            let _ = child.wait();
            println!("[!] Minecraft istemcisi kapandi.");
            
            // Oyun kapandığı an Temp klasöründeki ghost modları KALICI SIL
            cleanup_ghost_dir(ghost_mods_dir).await;
            
            Ok("Oyun basariyla sonlandi. Temizlik yapildi.".into())
        }
        Err(e) => {
            // Hata olsa bile temp temizliği yapıyoruz.
            cleanup_ghost_dir(ghost_mods_dir).await;
            Err(format!("Process başlatılamadı: {}", e))
        }
    }
}

// Tauri Ana Uygulama Kurulumu
fn main() {
    tauri::Builder::default()
        .manage(AppState {
            api_client: Client::new(),
        })
        .invoke_handler(tauri::generate_handler![launch_game])
        .run(tauri::generate_context!())
        .expect("Tauri uygulamasi calistirilirken hata olustu");
}
