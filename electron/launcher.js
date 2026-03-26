/**
 * ============================================
 * TEOWARE / SPELIUM LAUNCHER - Minecraft Başlatma Motoru
 * ============================================
 * 
 * minecraft-launcher-core paketi kullanılarak indirme
 * ve Fabric 1.21 başlatma işlemleri.
 */

const { Client, Authenticator } = require('minecraft-launcher-core');
const os = require('os');
const path = require('path');
const fs = require('fs');

/**
 * İşletim sistemine uygun oyun dizini döndürür.
 */
function getGameDirectory() {
  if (os.platform() === 'win32') {
    return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), '.spelium');
  } else if (os.platform() === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'spelium');
  }
  return path.join(os.homedir(), '.spelium');
}

/**
 * Sistem bilgilerini döndür
 */
function getSystemInfo() {
  const totalMemGB = (os.totalmem() / (1024 ** 3)).toFixed(1);
  return {
    os: `${os.type()} ${os.release()}`,
    arch: os.arch(),
    totalRam: totalMemGB,
    allocatedRam: Math.floor(os.totalmem() / (1024 ** 3) * 0.6), // %60
    cpuModel: os.cpus()[0]?.model || 'Bilinmiyor',
    cpuCores: os.cpus().length,
    gameDir: getGameDirectory(),
  };
}

/**
 * Minecraft'ı (veya Fabric) mclc ile başlat
 * 
 * @param {string} username - Oyuncu adı
 * @param {string} token - Spelium güvenlik token'ı
 * @param {number} ramGB - Ayrılacak RAM miktarı (GB)
 * @param {BrowserWindow} mainWindow - Progress için ana pencere referansı
 */
async function launchMinecraft(username, token, ramGB, mainWindow) {
  const launcher = new Client();
  const gameDir = getGameDirectory();

  // Çevrimdışı (Offline) Doğrulama
  let auth;
  try {
    auth = Authenticator.getAuth(username);
  } catch (error) {
    return { success: false, error: 'Kimlik doğrulama oluşturulamadı: ' + error.message };
  }

  // JVM Argümanları (Performans & Spelium Token)
  const customArgs = [
    // Z Garbage Collector (Java 21+ Düşük gecikme)
    '-XX:+UseZGC',
    '-XX:+ZGenerational',

    // Aikar's Flags (Maksimum performans)
    '-XX:+AlwaysPreTouch',
    '-XX:+DisableExplicitGC',
    '-XX:+ParallelRefProcEnabled',
    '-XX:+PerfDisableSharedMem',
    '-XX:+UnlockExperimentalVMOptions',
    '-XX:ZCollectionInterval=5',
    '-XX:ZFragmentationLimit=10',

    // Networking
    '-Djava.net.preferIPv4Stack=true',

    // SPELIUM GÜVENLİK TOKEN ENJEKSİYONU
    `-Dspelium.token=${token}`,
    `-Dspelium.version=1.0.0`
  ];

  // RAM ayarları
  const minRam = Math.max(1, Math.floor(ramGB / 2)) + 'G';
  const maxRam = Math.max(2, ramGB) + 'G';

  /*
   * Eğer ".spelium/versions/fabric-loader-0.16.0-1.21" adlı bir klasör(oyun) varsa onu başlatacak.
   * Yoksa "1.21" sürümünü baz alarak vanilla kurup başlatacak (çünkü MCLC Fabric'i otomatik kurmaz).
   */
  let customVersion = 'fabric-loader-0.16.0-1.21';
  let isCustom = false;
  
  const customJsonPath = path.join(gameDir, 'versions', customVersion, `${customVersion}.json`);
  if (fs.existsSync(customJsonPath)) {
    isCustom = true;
  }

  const opts = {
    clientPackage: null,
    authorization: auth,
    root: gameDir,
    version: {
      number: "1.21",
      type: "release",
      ...(isCustom && { custom: customVersion }) 
    },
    memory: {
      max: maxRam,
      min: minRam
    },
    customArgs: customArgs
  };

  // ----- MCLC EVENT İZLEYİCİLERİ -----
  const sendStatus = (status, progress = 0, message = '') => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('game:status', { status, progress, message });
    }
  };

  launcher.on('debug', (e) => {
    console.log('[MCLC Debug]', e);
  });

  launcher.on('data', (e) => {
    console.log('[MCLC Data]', e);
    // Konsol çıktılarını da arayüze bastırmak istersek
    // sendStatus('launching', 100, 'Oyun Başlatılıyor...');
  });

  launcher.on('download-status', (e) => {
    // e = { name: "minecraft.jar", type: "assets", current: 500, total: 1000 }
    const current = e.current || 0;
    const total = e.total || 0;
    const percent = total > 0 ? Math.round((current / total) * 100) : 0;
    
    sendStatus('patching', percent, `${e.type.toUpperCase()}: ${e.name} indiriliyor...`);
  });

  launcher.on('progress', (e) => {
    // e = { type: 'classes', task: 50, total: 100 } vs
    sendStatus('patching', Math.round((e.task / e.total) * 100), `${e.type} indiriliyor...`);
  });

  launcher.on('close', (e) => {
    console.log('[MCLC Close] Oyun Kapatıldı. Çıkış Kodu:', e);
    sendStatus('idle', 0, 'Oyun kapandı');
  });

  launcher.on('arguments', (args) => {
    console.log('[MCLC Başlatma Argümanları]\n', args.join(' '));
  });

  // BAŞLAT
  try {
    sendStatus('checking', 0, 'Oyun dosyaları doğrulanıyor...');
    // launcher.launch Promise(void) değil event emitter döndürür, ancak async yapıda bekletiyoruz
    await launcher.launch(opts);
    
    // Launch başarılı tetiklendi (oyun açıldı ve çalışıyor)
    return { success: true };
  } catch (error) {
    console.error('[MCLC Error]', error);
    return { success: false, error: error.message };
  }
}

module.exports = { launchMinecraft, getSystemInfo, getGameDirectory };
