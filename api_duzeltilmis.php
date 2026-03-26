<?php
// Spelium Launcher - Minexon Bağlantı API'si
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Electron Launcher'dan istek gelebilmesi için

// 1. Veritabanı Bilgilerini Buraya Gir
$host = 'localhost'; 
$dbname = 'spelium_server'; // cPanel'deki veritabanı adın
$user = 'spelium_user'; 
$pass = 'p3sKZI9fgzG?7rrc';
$table = 'accounts'; // Veya Minexon'un kullandığı tablo adı (accounts vb.)

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die(json_encode(['status' => 'error', 'message' => 'Veritabanı bağlantı hatası!']));
}

/* ==========================================================
   GET İSTEKLERİ (DASHBOARD VERİSİ)
   ========================================================== */
if (isset($_GET['action']) && $_GET['action'] == 'get_dashboard_data') {
    $username = $_GET['username'] ?? '';
    
    // 1. Haberleri Çek (Senin yeni newsList tablon)
    $stmtNews = $pdo->query("SELECT title, text, image, date FROM newsList ORDER BY id DESC LIMIT 5");
    $newsList = $stmtNews->fetchAll(PDO::FETCH_ASSOC);

    // Haber verilerini Launcher için temizle ve URL'leri düzelt
    foreach ($newsList as &$news) {
        $news['image'] = "https://spelium.com" . $news['image']; // NOT: spelium.net değil, spelium.com yaptık
        $news['text'] = strip_tags($news['text']); 
    }

    // 2. Oyuncu Avatarını Çek
    $avatarUrl = "https://mc-heads.net/avatar/Steve/100"; 
    if (!empty($username)) {
        $stmtUser = $pdo->prepare("SELECT imageAvatar FROM accounts WHERE username = ?");
        $stmtUser->execute([$username]);
        $userRowAcc = $stmtUser->fetch(PDO::FETCH_ASSOC);
        
        if ($userRowAcc && !empty($userRowAcc['imageAvatar']) && $userRowAcc['imageAvatar'] !== '-') {
            $avatarUrl = "https://spelium.com/" . $userRowAcc['imageAvatar'];
        } else {
            $avatarUrl = "https://mc-heads.net/avatar/" . $username . "/100";
        }
    }

    echo json_encode([
        'status' => 'success',
        'news' => $newsList,
        'avatar' => $avatarUrl
    ]);
    exit; // Dashboard isteği ise burada işlemi bitir! Diğer kısımlara(Login'e) geçme!
}

/* ==========================================================
   POST İSTEKLERİ (GİRİŞ - LOGIN)
   ========================================================== */
$username = $_POST['username'] ?? '';
$password = $_POST['password'] ?? '';

if (empty($username) || empty($password)) {
    echo json_encode(['status' => 'error', 'message' => 'Kullanıcı adı veya şifre boş olamaz!']);
    exit;
}

// 3. Kullanıcıyı Veritabanında Bul
$stmt = $pdo->prepare("SELECT id, username, password FROM $table WHERE username = ?");
$stmt->execute([$username]);
$userRow = $stmt->fetch(PDO::FETCH_ASSOC);

if ($userRow) {
    // 4. AuthMe Şifre Doğrulama Algoritması ($SHA$salt$hash)
    $storedPassword = $userRow['password'];
    $parts = explode('$', $storedPassword);
    
    if (count($parts) === 4 && $parts[1] === 'SHA') {
        $salt = $parts[2];
        $actualHash = $parts[3];
        
        // Kullanıcının girdiği şifreyi aynı Salt ile şifreleyip test et
        $checkHash = hash('sha256', hash('sha256', $password) . $salt);
        
        if ($checkHash === $actualHash) {
            $sessionToken = "Spelium_" . bin2hex(random_bytes(16));
            
            echo json_encode([
                'status' => 'success',
                'message' => 'Giriş Başarılı',
                'username' => $userRow['username'],
                'token' => $sessionToken
            ]);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Hatalı şifre!']);
        }
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Şifreleme formatı desteklenmiyor.']);
    }
} else {
    echo json_encode(['status' => 'error', 'message' => 'Böyle bir kullanıcı bulunamadı!']);
}
?>
