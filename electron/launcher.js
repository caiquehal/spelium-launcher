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
const https = require('https');

/**
 * Fabric mod yükleyici profili (JSON) kurulu değilse indirir.
 * Bu sayede minecraft-launcher-core otomatik olarak Fabric kütüphanelerini indirebilir.
 */
async function ensureFabricProfile(gameDir, customVersion) {
  return new Promise((resolve) => {
    const versionDir = path.join(gameDir, 'versions', customVersion);
    const jsonPath = path.join(versionDir, `${customVersion}.json`);
    
    if (fs.existsSync(jsonPath)) {
      return resolve(true);
    }

    if (!fs.existsSync(versionDir)) {
      fs.mkdirSync(versionDir, { recursive: true });
    }

    const url = 'https://meta.fabricmc.net/v2/versions/loader/1.21/0.16.0/profile/json';
    
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        console.error('[Fabric] Meta API 200 dönmedi:', res.statusCode);
        return resolve(false);
      }
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const profile = JSON.parse(data);
          
          // KULLANICI İSTEĞİ: mixinextras indirmesini engelle
          if (profile.libraries && Array.isArray(profile.libraries)) {
            profile.libraries = profile.libraries.filter(lib => !lib.name.includes('mixinextras'));
          }

          fs.writeFileSync(jsonPath, JSON.stringify(profile, null, 2), 'utf-8');
          resolve(true);
        } catch (err) {
          console.error('[Fabric] JSON işleme hatası:', err.message);
          resolve(false);
        }
      });
    }).on('error', (err) => {
      console.error('[Fabric] İndirme hatası:', err.message);
      resolve(false);
    });
  });
}

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
    // Standart G1GC (ZGC bazı sistemlerde OpenGL siyah ekran sorununa yol açar)
    '-XX:+UseG1GC',
    '-XX:+UnlockExperimentalVMOptions',
    '-XX:G1NewSizePercent=20',
    '-XX:G1ReservePercent=20',
    '-XX:MaxGCPauseMillis=50',
    '-XX:G1HeapRegionSize=32M',

    // Aikar's Flags (Maksimum performans)
    '-XX:+AlwaysPreTouch',
    '-XX:+DisableExplicitGC',

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
   * Yoksa Fabric Meta API üzerinden JSON'u çekip oluşturacak.
   */
  let customVersion = 'fabric-loader-0.16.0-1.21';
  
  // Fabric profilini doğrula / indir
  const sendStatus = (status, progress = 0, message = '') => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('game:status', { status, progress, message });
    }
  };

  sendStatus('checking', 10, 'Fabric profil dosyaları denetleniyor...');
  const isCustom = await ensureFabricProfile(gameDir, customVersion);

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

  // Daha önce tanımlandı (yukarı taşındı)
  // const sendStatus = ...

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
    
    // Kullanıcı dostu çeviri
    let partName = e.type === 'assets' ? 'Oyun Varlıkları'
                 : e.type === 'classes' ? 'Ana Dosyalar'
                 : e.type === 'libraries' ? 'Kütüphaneler'
                 : e.type === 'natives' ? 'Yerel Dosyalar'
                 : 'Bileşenler';

    sendStatus('patching', percent, `${partName} yükleniyor...`);
  });

  launcher.on('progress', (e) => {
    // e = { type: 'classes', task: 50, total: 100 }
    let partName = e.type === 'assets' ? 'Oyun Varlıkları'
                 : e.type === 'classes' ? 'Ana Dosyalar'
                 : e.type === 'libraries' ? 'Kütüphaneler'
                 : e.type === 'natives' ? 'Yerel Dosyalar'
                 : 'Bileşenler';

    sendStatus('patching', Math.round((e.task / e.total) * 100), `${partName} indiriliyor...`);
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
