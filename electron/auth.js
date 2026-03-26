/**
 * ============================================
 * SPELIUM LAUNCHER - Özel Kimlik Doğrulama (Auth)
 * ============================================
 *
 * spelium.com/api.php ile iletişim kurar.
 * PHP API, AuthMe ($SHA$salt$hash) algoritmasını kullanır.
 * İstek: POST form-encoded (username, password)
 * Yanıt: { status, username, token }
 */

const https = require('https');
const { saveToStore, loadFromStore, clearStore } = require('./store');

const API_URL = 'https://spelium.com/api.php';

// Demo kullanıcı (test amaçlı – canlıya geçince kaldırılabilir)
const DEMO_USER = { username: 'test', password: 'test' };

/**
 * spelium.com/api.php'ye form-encoded POST isteği gönder
 * @param {string} username
 * @param {string} password
 * @returns {Promise<Object>} Sunucu yanıtı (JSON parse edilmiş)
 */
function postLogin(username, password) {
  return new Promise((resolve, reject) => {
    const body = `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
    const urlObj = new URL(API_URL);

    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
        'User-Agent': 'SpeliumLauncher/1.0',
      },
      timeout: 12000,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error('Sunucudan geçersiz yanıt alındı.'));
        }
      });
    });

    req.on('error', () => {
      reject(new Error('Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.'));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Bağlantı zaman aşımına uğradı.'));
    });

    req.write(body);
    req.end();
  });
}

/**
 * Kullanıcı girişi
 * @param {string} username
 * @param {string} password
 * @returns {Promise<{ success, sessionToken, playerName, error }>}
 */
async function login(username, password) {
  // Demo kullanıcı bypass (test aşaması için)
  if (username === DEMO_USER.username && password === DEMO_USER.password) {
    return {
      success: true,
      sessionToken: 'demo-token-' + Date.now(),
      playerName: 'DemoPlayer',
    };
  }

  try {
    const res = await postLogin(username, password);

    // spelium.com/api.php yanıt formatı:
    // Başarılı: { status: 'success', username: '...', token: '...' }
    // Hatalı:   { status: 'error', message: '...' }
    if (res.status === 'success') {
      return {
        success: true,
        sessionToken: res.token,
        playerName: res.username || username,
      };
    }

    return {
      success: false,
      error: res.message || 'Giriş başarısız.',
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Kayıtlı oturum token'ını doğrula
 * (spelium.com/api.php'de ayrı bir verify endpoint yoksa
 *  mevcut token geçerli kabul edilir – offline-safe)
 */
async function checkSession(sessionToken) {
  // Token varsa geçerli say (API'ye tekrar hit etmeye gerek yok)
  return { success: !!sessionToken };
}

/** Oturumu AES-256 ile diske kaydet */
function saveSession(sessionToken, playerName) {
  saveToStore({ sessionToken, playerName, savedAt: Date.now() });
}

/** Kayıtlı oturumu oku */
function loadSession() {
  return loadFromStore();
}

/** Oturumu temizle */
function clearSession() {
  clearStore();
}

/** Çıkış yap */
async function logout() {
  clearSession();
  return { success: true };
}

module.exports = { login, logout, checkSession, saveSession, loadSession, clearSession };
