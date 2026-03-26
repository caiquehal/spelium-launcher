/**
 * ============================================
 * TEOWARE LAUNCHER - Preload Script
 * ============================================
 * 
 * contextBridge ile güvenli IPC köprüsü.
 * Renderer process sadece burada tanımlanan API'lere erişebilir.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('teoware', {
  // =============================================
  // Pencere Kontrolleri
  // =============================================
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
  },

  // =============================================
  // Kimlik Doğrulama (Auth)
  // =============================================
  auth: {
    /** Kullanıcı girişi */
    login: (username, password, rememberMe) =>
      ipcRenderer.invoke('auth:login', { username, password, rememberMe }),

    /** Kayıtlı oturumu kontrol et */
    checkSession: () => ipcRenderer.invoke('auth:check-session'),

    /** Çıkış yap */
    logout: () => ipcRenderer.invoke('auth:logout'),
  },

  // =============================================
  // Oyun Yönetimi
  // =============================================
  game: {
    /** Oyunu başlat */
    launch: (playerName, sessionToken) =>
      ipcRenderer.invoke('game:launch', { playerName, sessionToken }),

    /** Oyun durumu güncellemelerini dinle */
    onStatus: (callback) => {
      const handler = (event, data) => callback(data);
      ipcRenderer.on('game:status', handler);
      // Cleanup fonksiyonu döndür
      return () => ipcRenderer.removeListener('game:status', handler);
    },
  },

  // =============================================
  // Uygulama Yardımcıları
  // =============================================
  app: {
    /** Sistem bilgilerini al */
    getSystemInfo: () => ipcRenderer.invoke('app:get-system-info'),

    /** Harici link aç (tarayıcıda) */
    openExternal: (url) => ipcRenderer.invoke('app:open-external', url),
  },
});
