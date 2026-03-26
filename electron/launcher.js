/**
 * ============================================
 * TEOWARE LAUNCHER - Minecraft Başlatma Motoru
 * ============================================
 * 
 * JVM optimizasyonu, RAM yönetimi ve child_process ile
 * Minecraft (Fabric 1.21.x) başlatma mantığı.
 */

const { spawn } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');

// Minecraft ve Fabric sürüm bilgileri
const MC_VERSION = '1.21';
const FABRIC_VERSION = '0.16.0'; // Fabric loader sürümü

/**
 * Sistemdeki toplam RAM'e göre en ideal RAM miktarını hesapla
 * 
 * Strateji:
 *  - 4GB veya altı → 2GB
 *  - 8GB → 3GB
 *  - 12GB → 4GB
 *  - 16GB → 6GB
 *  - 32GB+ → 8GB
 * 
 * @returns {number} MB cinsinden optimal RAM
 */
function getOptimalRam() {
  const totalMemGB = os.totalmem() / (1024 ** 3);
  
  if (totalMemGB <= 4) return 2048;
  if (totalMemGB <= 8) return 3072;
  if (totalMemGB <= 12) return 4096;
  if (totalMemGB <= 16) return 6144;
  if (totalMemGB <= 24) return 8192;
  return 8192; // 24GB+ sistemler için de 8GB yeterli
}

/**
 * JVM başlatma argümanlarını oluştur
 * Java 21 ZGC + Aikar's Flags + Spelium optimizasyonları
 * 
 * @param {number} ramMB - Ayrılacak RAM miktarı (MB)
 * @param {string} sessionToken - Güvenlik token'ı
 * @returns {string[]} JVM argüman dizisi
 */
function buildJvmArgs(ramMB, sessionToken) {
  return [
    // RAM ayarları
    `-Xms${ramMB}M`,
    `-Xmx${ramMB}M`,

    // Z Garbage Collector (Java 21+) - Düşük gecikme süresi
    '-XX:+UseZGC',
    '-XX:+ZGenerational',

    // Aikar's Flags - Minecraft için optimize edilmiş
    '-XX:+AlwaysPreTouch',
    '-XX:+DisableExplicitGC',
    '-XX:+ParallelRefProcEnabled',
    '-XX:+PerfDisableSharedMem',
    '-XX:+UnlockExperimentalVMOptions',

    // Büyük sayfalar ve bellek optimizasyonu
    '-XX:+UseLargePages',
    '-XX:LargePageSizeInBytes=2m',

    // ZGC spesifik                    
    '-XX:ZCollectionInterval=5',
    '-XX:ZFragmentationLimit=10',
    
    // Networking optimizasyonu
    '-Djava.net.preferIPv4Stack=true',

    // Spelium session token (sunucu tarafı doğrulama için)
    `-Dspelium.session=${sessionToken}`,
    `-Dspelium.version=1.0.0`,
  ];
}

/**
 * Java yolunu bul (javaw.exe)
 * Öncelik: JAVA_HOME > PATH > Yaygın kurulum yolları
 * 
 * @returns {string|null} Java yolu veya null
 */
function findJavaPath() {
  // 1. JAVA_HOME ortam değişkeni
  if (process.env.JAVA_HOME) {
    const javawPath = path.join(process.env.JAVA_HOME, 'bin', 'javaw.exe');
    if (fs.existsSync(javawPath)) return javawPath;
  }

  // 2. Yaygın Java 21 kurulum yolları (Windows)
  const commonPaths = [
    path.join('C:', 'Program Files', 'Java', 'jdk-21', 'bin', 'javaw.exe'),
    path.join('C:', 'Program Files', 'Eclipse Adoptium', 'jdk-21*', 'bin', 'javaw.exe'),
    path.join('C:', 'Program Files', 'Microsoft', 'jdk-21*', 'bin', 'javaw.exe'),
    path.join('C:', 'Program Files', 'BellSoft', 'LibericaJDK-21', 'bin', 'javaw.exe'),
    path.join('C:', 'Program Files', 'Java', 'jre-21', 'bin', 'javaw.exe'),
  ];

  for (const p of commonPaths) {
    // Glob destekli kontrol
    const dir = path.dirname(p);
    const parentDir = path.dirname(dir);
    if (fs.existsSync(parentDir)) {
      try {
        const entries = fs.readdirSync(parentDir);
        for (const entry of entries) {
          const candidate = path.join(parentDir, entry, 'bin', 'javaw.exe');
          if (fs.existsSync(candidate)) return candidate;
        }
      } catch { /* devam */ }
    }
    if (fs.existsSync(p)) return p;
  }

  // 3. PATH'te javaw var mı kontrol et
  // (Kullanıcı Java'yı PATH'e eklemiş olabilir)
  return 'javaw'; // PATH'ten çalışmasını dene
}

/**
 * Minecraft'ı Fabric Loader ile başlat
 * 
 * @param {string} gameDir - .spelium oyun dizini
 * @param {string} playerName - Oyuncu adı (Offline mode)
 * @param {string} sessionToken - Güvenlik oturum token'ı
 * @returns {Promise<Object>} { success, pid, error }
 */
async function launchMinecraft(gameDir, playerName, sessionToken) {
  return new Promise((resolve) => {
    const javaPath = findJavaPath();
    const ramMB = getOptimalRam();
    const jvmArgs = buildJvmArgs(ramMB, sessionToken);

    // Minecraft dizin yapısı
    const versionsDir = path.join(gameDir, 'versions', MC_VERSION);
    const librariesDir = path.join(gameDir, 'libraries');
    const assetsDir = path.join(gameDir, 'assets');
    const nativesDir = path.join(gameDir, 'natives');
    const modsDir = path.join(gameDir, 'mods');

    // Gerekli dizinleri oluştur
    [versionsDir, librariesDir, assetsDir, nativesDir, modsDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    // Classpath oluştur (tüm JAR dosyalarını topla)
    let classpath = '';
    try {
      const jars = collectJars(librariesDir);
      const versionJar = path.join(versionsDir, `${MC_VERSION}.jar`);
      if (fs.existsSync(versionJar)) {
        jars.push(versionJar);
      }
      classpath = jars.join(path.delimiter);
    } catch (error) {
      console.error('[Launcher] Classpath oluşturulamadı:', error.message);
    }

    // Fabric Loader ana sınıfı
    const mainClass = 'net.fabricmc.loader.impl.launch.knot.KnotClient';

    // Minecraft argümanları (Offline Mode)
    const gameArgs = [
      '--username', playerName,
      '--version', MC_VERSION,
      '--gameDir', gameDir,
      '--assetsDir', assetsDir,
      '--assetIndex', MC_VERSION,
      '--accessToken', '0',           // Offline mode
      '--userType', 'legacy',
      '--versionType', 'Spelium',
    ];

    // Tam komut
    const fullArgs = [
      ...jvmArgs,
      `-Djava.library.path=${nativesDir}`,
      '-cp', classpath,
      mainClass,
      ...gameArgs,
    ];

    console.log(`[Launcher] Başlatılıyor: ${javaPath}`);
    console.log(`[Launcher] RAM: ${ramMB}MB | Oyuncu: ${playerName}`);

    try {
      const child = spawn(javaPath, fullArgs, {
        cwd: gameDir,
        detached: true,        // Bağımsız süreç (Launcher kapansa da oyun devam eder)
        stdio: 'ignore',
      });

      child.unref(); // Electron sürecinden ayır

      child.on('error', (error) => {
        console.error('[Launcher] Java başlatılamadı:', error.message);
        resolve({ 
          success: false, 
          error: 'Java bulunamadı. Lütfen Java 21 yükleyin.' 
        });
      });

      // Kısa bir süre bekle, hata olmadıysa başarılı
      setTimeout(() => {
        resolve({ success: true, pid: child.pid });
      }, 2000);

    } catch (error) {
      resolve({ success: false, error: error.message });
    }
  });
}

/**
 * Belirtilen dizindeki tüm JAR dosyalarını topla (recursive)
 * @param {string} dir - Taranacak dizin
 * @returns {string[]} JAR dosya yolları
 */
function collectJars(dir) {
  const jars = [];
  if (!fs.existsSync(dir)) return jars;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      jars.push(...collectJars(fullPath));
    } else if (entry.name.endsWith('.jar')) {
      jars.push(fullPath);
    }
  }
  return jars;
}

/**
 * Sistem bilgilerini döndür
 * @returns {Object} Sistem bilgileri
 */
function getSystemInfo() {
  const totalMemGB = (os.totalmem() / (1024 ** 3)).toFixed(1);
  const optimalRamMB = getOptimalRam();
  const javaPath = findJavaPath();

  return {
    os: `${os.type()} ${os.release()}`,
    arch: os.arch(),
    totalRam: `${totalMemGB} GB`,
    allocatedRam: `${(optimalRamMB / 1024).toFixed(1)} GB`,
    cpuModel: os.cpus()[0]?.model || 'Bilinmiyor',
    cpuCores: os.cpus().length,
    javaPath: javaPath,
    gameDir: path.join(os.homedir(), '.spelium'),
  };
}

module.exports = { launchMinecraft, getOptimalRam, getSystemInfo, findJavaPath, buildJvmArgs };
