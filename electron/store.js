/**
 * ============================================
 * TEOWARE LAUNCHER - Şifreli Yerel Depolama (Store)
 * ============================================
 * 
 * AES-256-CBC ile oturum bilgilerini şifreler/çözer.
 * Makine-bazlı anahtar türetme kullanır.
 */

const crypto = require('crypto');
const os = require('os');
const fs = require('fs');
const path = require('path');

// Makine bazlı şifreleme anahtarı oluştur
// (hostname + username hash'i → her makinede farklı anahtar)
const MACHINE_KEY = crypto
  .createHash('sha256')
  .update(`teoware-${os.hostname()}-${os.userInfo().username}-launcher-key`)
  .digest();

const IV_LENGTH = 16;
const ALGORITHM = 'aes-256-cbc';

// Session dosyasının yolu
const SESSION_FILE = path.join(os.homedir(), '.teoware', 'session.enc');

/**
 * Veriyi AES-256-CBC ile şifrele
 * @param {string} text - Şifrelenecek metin
 * @returns {string} IV:EncryptedData formatında şifreli metin
 */
function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, MACHINE_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * AES-256-CBC şifreli veriyi çöz
 * @param {string} encryptedText - IV:EncryptedData formatında şifreli metin
 * @returns {string} Çözülmüş metin
 */
function decrypt(encryptedText) {
  const [ivHex, encrypted] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, MACHINE_KEY, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Oturum bilgilerini şifreli olarak kaydet
 * @param {Object} data - { sessionToken, playerName }
 */
function saveToStore(data) {
  const dir = path.dirname(SESSION_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  const encrypted = encrypt(JSON.stringify(data));
  fs.writeFileSync(SESSION_FILE, encrypted, 'utf8');
}

/**
 * Şifreli oturum bilgilerini oku
 * @returns {Object|null} { sessionToken, playerName } veya null
 */
function loadFromStore() {
  try {
    if (!fs.existsSync(SESSION_FILE)) return null;
    const encrypted = fs.readFileSync(SESSION_FILE, 'utf8');
    const decrypted = decrypt(encrypted);
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('[Store] Oturum okunamadı:', error.message);
    return null;
  }
}

/**
 * Oturum dosyasını sil
 */
function clearStore() {
  try {
    if (fs.existsSync(SESSION_FILE)) {
      fs.unlinkSync(SESSION_FILE);
    }
  } catch (error) {
    console.error('[Store] Oturum silinemedi:', error.message);
  }
}

module.exports = { encrypt, decrypt, saveToStore, loadFromStore, clearStore };
