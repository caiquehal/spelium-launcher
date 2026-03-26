/**
 * ============================================
 * TEOWARE LAUNCHER - Dosya Yönetimi ve Patching
 * ============================================
 * 
 * Sunucudaki files.json ile yerel dosyaları karşılaştırır.
 * Eksik veya uyumsuz hash'li dosyaları otomatik indirir.
 * Fabric, Sodium/Indium modları ve Resource Pack yönetimi.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const API_BASE = 'https://spelium.com';
const FILES_ENDPOINT = '/launcher/files.json';

/**
 * Dosyanın SHA-256 hash'ini hesapla
 * @param {string} filePath - Dosya yolu
 * @returns {Promise<string>} SHA-256 hash
 */
function computeHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', (error) => reject(error));
  });
}

/**
 * URL'den JSON veri çek
 * @param {string} url - Tam URL
 * @returns {Promise<Object>} JSON yanıt
 */
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
    const protocol = fullUrl.startsWith('https') ? https : http;
    
    protocol.get(fullUrl, { timeout: 15000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Geçersiz JSON yanıtı'));
        }
      });
    }).on('error', reject)
      .on('timeout', function() { this.destroy(); reject(new Error('Zaman aşımı')); });
  });
}

/**
 * Dosya indir (progress callback destekli)
 * @param {string} url - İndirilecek dosyanın URL'si
 * @param {string} dest - Hedef dosya yolu
 * @param {Function} onProgress - İlerleme callback (downloaded, total)
 * @returns {Promise<void>}
 */
function downloadFile(url, dest, onProgress = null) {
  return new Promise((resolve, reject) => {
    // Hedef dizini oluştur
    const dir = path.dirname(dest);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const protocol = url.startsWith('https') ? https : http;

    protocol.get(url, { timeout: 60000 }, (res) => {
      // Yönlendirme (redirect) desteği
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        downloadFile(res.headers.location, dest, onProgress).then(resolve).catch(reject);
        return;
      }

      if (res.statusCode !== 200) {
        reject(new Error(`İndirme başarısız: HTTP ${res.statusCode}`));
        return;
      }

      const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
      let downloadedBytes = 0;

      const fileStream = fs.createWriteStream(dest);
      
      res.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        if (onProgress && totalBytes > 0) {
          onProgress(downloadedBytes, totalBytes);
        }
      });

      res.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });

      fileStream.on('error', (err) => {
        fs.unlink(dest, () => {}); // Bozuk dosyayı sil
        reject(err);
      });

    }).on('error', reject)
      .on('timeout', function() { 
        this.destroy(); 
        reject(new Error('İndirme zaman aşımına uğradı')); 
      });
  });
}

/**
 * Dosyaları kontrol et ve güncelle
 * 
 * 1. api.spelium.com/launcher/files.json'dan güncel dosya listesini çek
 * 2. Yerel dosyaların hash'lerini kontrol et
 * 3. Eksik veya uyumsuz dosyaları indir
 * 
 * files.json formatı:
 * {
 *   "files": [
 *     {
 *       "path": "mods/sodium-0.5.8.jar",
 *       "hash": "abc123...",
 *       "url": "https://cdn.spelium.com/files/mods/sodium-0.5.8.jar",
 *       "size": 1234567
 *     }
 *   ]
 * }
 * 
 * @param {string} gameDir - .spelium oyun dizini
 * @param {Function} onProgress - İlerleme callback
 * @returns {Promise<Object>} { success, error }
 */
async function checkAndPatchFiles(gameDir, onProgress = () => {}) {
  try {
    // Adım 1: Sunucudan dosya listesini çek
    onProgress({ message: 'Dosya listesi alınıyor...', percent: 5 });
    
    let fileManifest;
    try {
      fileManifest = await fetchJson(FILES_ENDPOINT);
    } catch (error) {
      console.warn('[Patcher] Dosya listesi alınamadı:', error.message);
      // API'ye ulaşılamazsa mevcut dosyalarla devam et
      onProgress({ message: 'Çevrimdışı mod - mevcut dosyalar kullanılıyor', percent: 100 });
      return { success: true };
    }

    const files = fileManifest.files || [];
    
    if (files.length === 0) {
      onProgress({ message: 'Dosyalar güncel', percent: 100 });
      return { success: true };
    }

    // Adım 2: Hangi dosyaların güncellenmesi gerektiğini bul
    onProgress({ message: 'Dosyalar kontrol ediliyor...', percent: 10 });
    
    const filesToDownload = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const localPath = path.join(gameDir, file.path);

      let needsDownload = false;

      if (!fs.existsSync(localPath)) {
        // Dosya eksik
        needsDownload = true;
      } else if (file.hash) {
        // Hash kontrolü
        const localHash = await computeHash(localPath);
        if (localHash !== file.hash) {
          needsDownload = true;
        }
      }

      if (needsDownload) {
        filesToDownload.push(file);
      }

      // İlerleme güncelle (kontrol aşaması %10-%40 arası)
      const checkProgress = 10 + ((i + 1) / files.length) * 30;
      onProgress({ 
        message: `Kontrol ediliyor: ${file.path}`, 
        percent: Math.round(checkProgress) 
      });
    }

    // Adım 3: Eksik/güncellenmiş dosyaları indir
    if (filesToDownload.length === 0) {
      onProgress({ message: 'Tüm dosyalar güncel!', percent: 100 });
      return { success: true };
    }

    onProgress({ 
      message: `${filesToDownload.length} dosya güncellenecek...`, 
      percent: 40 
    });

    for (let i = 0; i < filesToDownload.length; i++) {
      const file = filesToDownload[i];
      const localPath = path.join(gameDir, file.path);
      const fileName = path.basename(file.path);

      onProgress({ 
        message: `İndiriliyor: ${fileName} (${i + 1}/${filesToDownload.length})`,
        percent: Math.round(40 + ((i + 1) / filesToDownload.length) * 55),
      });

      try {
        await downloadFile(file.url, localPath);
      } catch (error) {
        console.error(`[Patcher] İndirme hatası (${fileName}):`, error.message);
        return { 
          success: false, 
          error: `"${fileName}" dosyası indirilemedi: ${error.message}` 
        };
      }
    }

    // Adım 4: Tamamlandı
    onProgress({ message: 'Dosyalar eşitlendi!', percent: 100 });
    return { success: true };

  } catch (error) {
    console.error('[Patcher] Hata:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = { checkAndPatchFiles, computeHash, downloadFile };
