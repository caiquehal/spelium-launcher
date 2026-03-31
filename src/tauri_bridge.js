// Spelium Tauri Native Köprüsü
// Spelium Tauri 'Dumb Client' Entegrasyonu

import { invoke } from '@tauri-apps/api/core';

/**
 * Kullanıcı giriş yaptığında (Oyna butonuna basıldığında) React tarafından çağrılır.
 * Matematiksel veya mantıksal hiçbir işlem Frontend'de yapılmaz.
 * Sadece Tauri backend'ine tetikleme gönderilir.
 * 
 * @param {string} username - Kullanıcı Adı
 * @param {string} password - Şifre (Sadece invoke üzerinden Rust'a aktarılmalı)
 */
export async function launchSpelium(username, password) {
  try {
    // Rust (Backend) tarafındaki `launch_game` fonksiyonuna bilgileri yolluyoruz.
    // Şifre diskte saklanmadan doğrudan Rust memory alanına gidiyor.
    const response = await invoke('launch_game', { 
        username: username, 
        password: password 
    });
    
    // İşlem başarılıysa bu loga ulaşırız: "Oyun basariyla sonlandi. Temizlik yapildi."
    console.log("[Tauri-Bridge]: ", response);
    return { success: true, message: response };

  } catch (error) {
    // Rust tarafında token alınamazsa, zip çıkartılamazsa veya oyun çökerse buraya düşeriz.
    console.error("[Tauri-Bridge] Hata:", error);
    return { success: false, message: error };
  }
}
