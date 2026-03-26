/**
 * ============================================
 * TEOWARE LAUNCHER - Özel Kimlik Doğrulama (Auth)
 * ============================================
 * 
 * api.teoware.net ile iletişim kurar.
 * Kullanıcı girişi, oturum kontrolü ve oturum yönetimi.
 */

const https = require('https');
const http = require('http');
const { saveToStore, loadFromStore, clearStore } = require('./store');

const API_BASE = 'https://api.teoware.net';

/**
 * API'ye HTTP isteği gönder
 * @param {string} endpoint - API endpoint (örn: /auth/login)
 * @param {string} method - HTTP metodu
 * @param {Object} body - İstek gövdesi
 * @returns {Promise<Object>} API yanıtı
 */
function apiRequest(endpoint, method = 'POST', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, API_BASE);
    const protocol = url.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'TeowareLauncher/1.0',
      },
      timeout: 10000,
    };

    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          reject(new Error('Sunucudan geçersiz yanıt alındı.'));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error('Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.'));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Bağlantı zaman aşımına uğradı.'));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

/**
 * Kullanıcı girişi yap
 * @param {string} username - Kullanıcı adı
 * @param {string} password - Şifre
 * @returns {Promise<Object>} { success, sessionToken, playerName, error }
 */
async function login(username, password) {
  try {
    const response = await apiRequest('/auth/login', 'POST', { username, password });
    
    if (response.success || response.status === 'ok') {
      return {
        success: true,
        sessionToken: response.sessionToken || response.token,
        playerName: response.playerName || response.player_name || username,
      };
    }
    
    return {
      success: false,
      error: response.message || response.error || 'Giriş başarısız.',
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Oturum geçerliliğini kontrol et
 * @param {string} sessionToken - Oturum token'ı
 * @returns {Promise<Object>} { success }
 */
async function checkSession(sessionToken) {
  try {
    const response = await apiRequest('/auth/verify', 'POST', { token: sessionToken });
    return { success: response.success || response.status === 'ok' };
  } catch (error) {
    // API'ye ulaşılamazsa oturumu geçerli kabul et (offline çalışma)
    console.warn('[Auth] Oturum doğrulanamadı, offline devam ediliyor.');
    return { success: true };
  }
}

/**
 * Oturumu kaydet (AES-256 şifreli)
 * @param {string} sessionToken
 * @param {string} playerName
 */
function saveSession(sessionToken, playerName) {
  saveToStore({ sessionToken, playerName, savedAt: Date.now() });
}

/**
 * Kaydedilmiş oturumu yükle
 * @returns {Object|null} { sessionToken, playerName } veya null
 */
function loadSession() {
  return loadFromStore();
}

/**
 * Oturumu temizle (çıkış)
 */
function clearSession() {
  clearStore();
}

/**
 * Çıkış yap
 */
async function logout() {
  clearSession();
  return { success: true };
}

module.exports = { login, logout, checkSession, saveSession, loadSession, clearSession };
