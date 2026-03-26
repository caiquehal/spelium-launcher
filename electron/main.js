/**
 * ============================================
 * TEOWARE LAUNCHER - Electron Ana Süreç (Main Process)
 * ============================================
 * 
 * Bu dosya Electron uygulamasının ana sürecidir.
 * IPC haberleşmesi, pencere yönetimi ve modül koordinasyonu burada yapılır.
 */

const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { login, logout, checkSession, saveSession, loadSession, clearSession } = require('./auth');
const { launchMinecraft, getSystemInfo, getGameDirectory } = require('./launcher');
const { checkAndPatchFiles } = require('./patcher');

let mainWindow = null;

/**
 * Ana pencereyi oluştur
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 1024,
    minHeight: 600,
    frame: false,            // Frameless (özel başlık çubuğu kullanacağız)
    transparent: false,
    resizable: true,
    backgroundColor: '#0a0a0f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    icon: path.join(__dirname, '..', 'public', 'icon.png'),
    show: false,             // Hazır olunca göster (flicker önleme)
  });

  // Dev veya Prod moduna göre yükle
  if (process.env.NODE_ENV === 'development' || process.argv.includes('--dev')) {
    mainWindow.loadURL('http://localhost:5173');
    // mainWindow.webContents.openDevTools(); // Geliştirme sırasında aç
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  // Pencere hazır olduğunda göster
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// =============================================
// IPC HANDLERS - Pencere Kontrolleri
// =============================================
ipcMain.handle('window:minimize', () => {
  mainWindow?.minimize();
});

ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.handle('window:close', () => {
  mainWindow?.close();
});

// =============================================
// IPC HANDLERS - Kimlik Doğrulama (Auth)
// =============================================

/**
 * Kullanıcı girişi
 * @param {string} username - Kullanıcı adı
 * @param {string} password - Şifre
 * @param {boolean} rememberMe - Beni hatırla
 */
ipcMain.handle('auth:login', async (event, { username, password, rememberMe }) => {
  try {
    const result = await login(username, password);
    
    if (result.success && rememberMe) {
      // Oturumu AES şifreleyerek diske kaydet
      saveSession(result.sessionToken, result.playerName);
    }
    
    return result;
  } catch (error) {
    console.error('[Auth] Giriş hatası:', error.message);
    return { success: false, error: error.message || 'Sunucuya bağlanılamadı.' };
  }
});

/**
 * Kayıtlı oturumu kontrol et (uygulama açılışında)
 */
ipcMain.handle('auth:check-session', async () => {
  try {
    const session = loadSession();
    if (!session) return { success: false };
    
    // Sunucudan oturum geçerliliğini kontrol et
    const result = await checkSession(session.sessionToken);
    if (result.success) {
      return { 
        success: true, 
        sessionToken: session.sessionToken, 
        playerName: session.playerName 
      };
    }
    
    // Oturum geçersizse temizle
    clearSession();
    return { success: false };
  } catch (error) {
    console.error('[Auth] Oturum kontrolü hatası:', error.message);
    return { success: false };
  }
});

/**
 * Çıkış yap
 */
ipcMain.handle('auth:logout', async () => {
  clearSession();
  return { success: true };
});

// =============================================
// IPC HANDLERS - Oyun Başlatma
// =============================================

/**
 * Bozuk oyun dosyalarını sil
 */
ipcMain.handle('game:force-reset', async () => {
  try {
    const gameDir = getGameDirectory();
    const foldersToWipe = ['versions', 'libraries', 'assets', 'natives', 'mods', 'resourcepacks'];
    
    for (const folder of foldersToWipe) {
      const folderPath = path.join(gameDir, folder);
      if (fs.existsSync(folderPath)) {
        fs.rmSync(folderPath, { recursive: true, force: true });
      }
    }
    return { success: true };
  } catch (error) {
    console.error('[Game] Force Reset hatası:', error.message);
    return { success: false, error: error.message };
  }
});

/**
 * Oyunu başlat
 * Dosya kontrolü → Patching → Minecraft Launch
 */
ipcMain.handle('game:launch', async (event, { username, token, ram }) => {
  try {
    // Adım 1: Dosyaları kontrol et ve güncelle (İsteğe bağlı)
    mainWindow?.webContents.send('game:status', { 
      status: 'checking', 
      message: 'Dosyalar kontrol ediliyor...',
      progress: 0 
    });

    const patchResult = await checkAndPatchFiles(getGameDirectory(), (progress) => {
      mainWindow?.webContents.send('game:status', {
        status: 'patching',
        message: progress.message,
        progress: progress.percent,
      });
    });

    if (!patchResult.success) {
      return { success: false, error: patchResult.error };
    }

    // Adım 2: Minecraft'ı başlat (MCLC)
    mainWindow?.webContents.send('game:status', { 
      status: 'launching', 
      message: 'Oyun başlatılıyor...',
      progress: 100 
    });

    const launchResult = await launchMinecraft(username, token, ram, mainWindow);
    return launchResult;
  } catch (error) {
    console.error('[Game] Başlatma hatası:', error.message);
    return { success: false, error: error.message };
  }
});

/**
 * Sistem bilgilerini al (RAM, Java yolu vb.)
 */
ipcMain.handle('app:get-system-info', () => {
  return getSystemInfo();
});

/**
 * Harici link aç (Kayıt Ol, Şifremi Unuttum vb.)
 */
ipcMain.handle('app:open-external', (event, url) => {
  shell.openExternal(url);
});

// =============================================
// UYGULAMA YAŞAM DÖNGÜSÜ
// =============================================
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
