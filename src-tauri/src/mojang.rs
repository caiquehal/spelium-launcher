use reqwest::Client;
use serde_json::Value;
use std::path::Path;
use tauri::{AppHandle, Emitter};
use tokio::fs;
use crate::ProgressEvent;
use tokio::task::JoinSet;
use std::sync::Arc;

const VERSION_MANIFEST_URL: &str = "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json";
const FABRIC_META_URL: &str = "https://meta.fabricmc.net/v2/versions/loader/1.21.11/0.18.5/profile/json";
const RESOURCES_URL: &str = "https://resources.download.minecraft.net/";
const JAVA_21_URL: &str = "https://api.adoptium.net/v3/binary/latest/21/ga/windows/x64/jre/hotspot/normal/eclipse?project=jdk";

pub async fn download_minecraft_and_fabric(base_dir: &Path, app: &AppHandle, client: &Client) -> Result<(), String> {
    let _ = app.emit("game-status", ProgressEvent {
        status: "checking".into(),
        message: "Mojang Manifestosu aranıyor...".into(),
        progress: 5,
    });

    let manifest_res = client.get(VERSION_MANIFEST_URL).send().await.map_err(|e| e.to_string())?;
    let manifest: Value = manifest_res.json().await.map_err(|e| e.to_string())?;
    
    // 1.21 metadata URL'sini bul
    let mut version_json_url = String::new();
    if let Some(versions) = manifest["versions"].as_array() {
        for v in versions {
            if v["id"] == "1.21.11" {
                version_json_url = v["url"].as_str().unwrap_or("").to_string();
                break;
            }
        }
    }

    if version_json_url.is_empty() {
        return Err("1.21.11 sürümü Mojang manifestosunda bulunamadı!".into());
    }

    let _ = app.emit("game-status", ProgressEvent {
        status: "checking".into(),
        message: "1.21.11 Vanilla istemcisi analiz ediliyor...".into(),
        progress: 10,
    });

    let v_json: Value = client.get(&version_json_url).send().await.map_err(|e| e.to_string())?.json().await.map_err(|e| e.to_string())?;

    // Client.jar indir
    let client_jar_url = v_json["downloads"]["client"]["url"].as_str().unwrap_or("");
    let versions_dir = base_dir.join("versions").join("1.21.11");
    let mc_jar_path = versions_dir.join("1.21.11.jar");

    if !mc_jar_path.exists() && !client_jar_url.is_empty() {
        fs::create_dir_all(&versions_dir).await.map_err(|e| e.to_string())?;
        download_file_single(client, client_jar_url, &mc_jar_path, app, "1.21.11.jar indiriliyor").await?;
    }

    // Fabric meta indir
    let _ = app.emit("game-status", ProgressEvent {
        status: "checking".into(),
        message: "Fabric 0.18.5 kütüphaneleri analiz ediliyor...".into(),
        progress: 15,
    });

    let f_json: Value = client.get(FABRIC_META_URL).send().await.map_err(|e| e.to_string())?.json().await.unwrap_or(Value::Null);

    // Tüm kütüphaneleri birleştir (Vanilla + Fabric)
    let mut libraries_to_download = Vec::new();
    let libraries_dir = base_dir.join("libraries");

    // Vanilla Libraries
    if let Some(libs) = v_json["libraries"].as_array() {
        for lib in libs {
            if let Some(dl) = lib["downloads"].get("artifact") {
                let path = dl["path"].as_str().unwrap_or("");
                let url = dl["url"].as_str().unwrap_or("");
                if !path.is_empty() && !url.is_empty() {
                    let local_path = libraries_dir.join(path);
                    if !local_path.exists() {
                        libraries_to_download.push((url.to_string(), local_path));
                    }
                }
            }
        }
    }

    // Fabric Libraries
    if let Some(libs) = f_json["libraries"].as_array() {
        for lib in libs {
            // "name": "net.fabricmc:sponge-mixin:0.15.2+mixin.0.8.7"
            let name = lib["name"].as_str().unwrap_or("");
            let url_base = lib["url"].as_str().unwrap_or("https://maven.fabricmc.net/");
            
            let parts: Vec<&str> = name.split(':').collect();
            if parts.len() >= 3 {
                let group = parts[0].replace('.', "/");
                let artifact = parts[1];
                let version = parts[2];
                let file_name = format!("{}-{}.jar", artifact, version);
                let path = format!("{}/{}/{}/{}", group, artifact, version, file_name);
                
                let local_path = libraries_dir.join(&path);
                if !local_path.exists() {
                    let full_url = format!("{}{}", url_base, path);
                    libraries_to_download.push((full_url, local_path));
                }
            }
        }
    }

    let libs_count = libraries_to_download.len();
    if libs_count > 0 {
        let _ = app.emit("game-status", ProgressEvent {
            status: "patching".into(),
            message: format!("Kütüphaneler indiriliyor (0/{})", libs_count),
            progress: 20,
        });

        let client_cloned = client.clone();
        
        let mut completed = 0;
        let total = libs_count;
        let app_handle = Arc::new(app.clone());

        for chunk in libraries_to_download.chunks(20) {
            let mut mini_set = JoinSet::<()>::new();
            for (url, p) in chunk {
                let u = url.clone();
                let path = p.clone();
                let c = client_cloned.clone();
                mini_set.spawn(async move {
                    if let Some(parent) = path.parent() {
                        let _ = fs::create_dir_all(parent).await;
                    }
                    if let Ok(res) = c.get(&u).send().await {
                        if res.status().is_success() {
                            if let Ok(bytes) = res.bytes().await {
                                let _ = fs::write(path, bytes).await;
                            }
                        }
                    }
                });
            }
            while let Some(_) = mini_set.join_next().await {
                completed += 1;
                let pct = 20 + ((completed as f32 / total as f32) * 30.0) as u8;
                let _ = app_handle.emit("game-status", ProgressEvent {
                    status: "patching".into(),
                    message: format!("Kütüphaneler indiriliyor ({}/{})", completed, total),
                    progress: pct,
                });
            }
        }
    }

    // Assets Download
    if let Some(asset_index) = v_json["assetIndex"].as_object() {
        let ai_url = asset_index["url"].as_str().unwrap_or("");
        let asset_index_id = v_json["assetIndex"]["id"].as_str().unwrap_or("1.21.11");
        
        let indexes_dir = base_dir.join("assets").join("indexes");
        fs::create_dir_all(&indexes_dir).await.map_err(|e| e.to_string())?;
        
        let index_file = indexes_dir.join(format!("{}.json", asset_index_id));
        
        // Her halükarda assetleri çek
        let ai_json: Value = client.get(ai_url).send().await.map_err(|e| e.to_string())?.json().await.unwrap_or(Value::Null);
        fs::write(&index_file, serde_json::to_string(&ai_json).unwrap_or("{}".into())).await.map_err(|e| e.to_string())?;

        let mut assets_to_download = Vec::new();
        let objects_dir = base_dir.join("assets").join("objects");

        if let Some(objects) = ai_json["objects"].as_object() {
            for (_, val) in objects {
                let hash = val["hash"].as_str().unwrap_or("");
                if hash.len() > 2 {
                    let folder = &hash[0..2];
                    let local_path = objects_dir.join(folder).join(hash);
                    if !local_path.exists() {
                        let url = format!("{}{}/{}", RESOURCES_URL, folder, hash);
                        assets_to_download.push((url, local_path));
                    }
                }
            }
        }

        let assets_count = assets_to_download.len();
        if assets_count > 0 {
            let mut completed = 0;
            let app_handle = Arc::new(app.clone());
            let client_cloned = client.clone();

            for chunk in assets_to_download.chunks(50) {
                let mut mini_set = JoinSet::<()>::new();
                for (url, p) in chunk {
                    let u = url.clone();
                    let path = p.clone();
                    let c = client_cloned.clone();
                    mini_set.spawn(async move {
                        if let Some(parent) = path.parent() {
                            let _ = fs::create_dir_all(parent).await;
                        }
                        if let Ok(res) = c.get(&u).send().await {
                            if res.status().is_success() {
                                if let Ok(bytes) = res.bytes().await {
                                    let _ = fs::write(path, bytes).await;
                                }
                            }
                        }
                    });
                }
                while let Some(_) = mini_set.join_next().await {
                    completed += 1;
                    if completed % 10 == 0 || completed == assets_count {
                        let pct = 50 + ((completed as f32 / assets_count as f32) * 45.0) as u8;
                        let _ = app_handle.emit("game-status", ProgressEvent {
                            status: "patching".into(),
                            message: format!("Assetler indiriliyor ({}/{})", completed, assets_count),
                            progress: pct,
                        });
                    }
                }
            }
        }
    }

    Ok(())
}

async fn download_file_single(client: &Client, url: &str, target: &Path, app: &AppHandle, msg: &str) -> Result<(), String> {
    let _ = app.emit("game-status", ProgressEvent {
        status: "patching".into(),
        message: msg.to_string(),
        progress: 15,
    });
    
    let res = client.get(url).send().await.map_err(|e| format!("İndirme hatası: {}", e))?;
    if res.status().is_success() {
        let bytes = res.bytes().await.map_err(|e| e.to_string())?;
        fs::write(target, bytes).await.map_err(|e| format!("Dosya yazılamadı: {}", e))?;
    }
    Ok(())
}

pub fn find_javaw(dir: &Path) -> Option<std::path::PathBuf> {
    if !dir.exists() || !dir.is_dir() {
        return None;
    }
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() && path.file_name().unwrap_or_default() == "javaw.exe" {
                return Some(path);
            } else if path.is_dir() {
                if let Some(p) = find_javaw(&path) {
                    return Some(p);
                }
            }
        }
    }
    None
}

pub async fn download_java_runtime(base_dir: &Path, app: &AppHandle, client: &Client) -> Result<String, String> {
    let java_dir = base_dir.join("runtime").join("java-21");
    
    // Mevcut (Portable) kurulum var mı diye basitçe kontrol
    if let Some(existing_javaw) = find_javaw(&java_dir) {
        return Ok(existing_javaw.to_str().unwrap().to_string());
    }


    // Yoksa baştan indiriyoruz
    let _ = app.emit("game-status", ProgressEvent {
        status: "patching".into(),
        message: "Java 21 Runtime (JRE) aranıyor...".into(),
        progress: 0,
    });

    let res = client.get(JAVA_21_URL).send().await.map_err(|e| format!("Java indirelemedi: {}", e))?;
    
    if !res.status().is_success() {
        return Err("Java JRE 21 indirmesi basarisiz oldu.".into());
    }
    
    let total_size = res.content_length().unwrap_or(45_000_000) as f64;
    let mut stream = res.bytes_stream();
    let mut downloaded = 0.0;
    
    use futures_util::StreamExt;
    let mut bytes = Vec::new();

    while let Some(item) = stream.next().await {
        let chunk = item.map_err(|e| e.to_string())?;
        bytes.extend_from_slice(&chunk);
        downloaded += chunk.len() as f64;
        
        let pct = ((downloaded / total_size) * 99.0) as u8;
        let down_mb = (downloaded / 1024.0 / 1024.0).round();
        let tot_mb = (total_size / 1024.0 / 1024.0).round();
        
        let _ = app.emit("game-status", ProgressEvent {
            status: "patching".into(),
            message: format!("Java 21 JRE İndiriliyor ({} MB / {} MB)", down_mb, tot_mb),
            progress: pct,
        });
    }

    let _ = app.emit("game-status", ProgressEvent {
        status: "patching".into(),
        message: "Java 21 ZIP dosyasından çıkartılıyor...".into(),
        progress: 100,
    });

    let extract_dir = java_dir.clone();
    tokio::task::spawn_blocking(move || -> Result<(), String> {
        let _ = std::fs::create_dir_all(&extract_dir);
        let cursor = std::io::Cursor::new(bytes);
        
        // zip < 0.6 => ZipArchive::new(cursor) returns ZipError, we map_err
        let mut archive = zip::ZipArchive::new(cursor).map_err(|e| format!("ZIP okunurken hata: {}", e))?;
        
        for i in 0..archive.len() {
            let mut file = archive.by_index(i).map_err(|_| "ZIP dosyası okunamadı".to_string())?;
            let outpath = match file.enclosed_name() {
                Some(path) => extract_dir.join(path),
                None => continue,
            };
            
            if file.name().ends_with('/') {
                let _ = std::fs::create_dir_all(&outpath);
            } else {
                if let Some(p) = outpath.parent() {
                    let _ = std::fs::create_dir_all(p);
                }
                if let Ok(mut outfile) = std::fs::File::create(&outpath) {
                    let _ = std::io::copy(&mut file, &mut outfile);
                }
            }
        }
        Ok(())
    }).await.map_err(|e| e.to_string())??;

    if let Some(javaw) = find_javaw(&java_dir) {
         Ok(javaw.to_str().unwrap().to_string())
    } else {
         Err("Java indirildi ancak çıkartılan dosyalar içinde javaw.exe bulunamadı!".into())
    }
}
