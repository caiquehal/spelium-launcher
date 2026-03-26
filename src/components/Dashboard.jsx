/**
 * ============================================
 * SPELIUM LAUNCHER - Dashboard (Ana Ekran)
 * ============================================
 *
 * Layout:
 *  Sol Üst  → Avatar + "Hoş geldin, [User]"
 *  Sağ Üst  → Web sitesi butonu + Ayarlar ikonu
 *  Üst Orta → Spelium logosu
 *  Merkez   → Haber Slider'ı (Framer Motion, auto-play)
 *  Alt Orta → Altın OYNA butonu
 *  En Alt   → Canlı oyuncu sayısı (mcsrvstat.us API)
 *
 * Veri Çekme: spelium.com/api.php?action=get_dashboard_data
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ProgressBar from './ProgressBar';
import Settings from './Settings';
import speliumLogo from '../assets/spelium.png';

/* ===== Haber Slider Bileşeni ===== */
function NewsSlider({ news, onReadMore }) {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef(null);

  // Otomatik kayma (5 saniyede bir)
  useEffect(() => {
    if (news.length <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrent((p) => (p + 1) % news.length);
    }, 5000);
    return () => clearInterval(timerRef.current);
  }, [news.length]);

  const goTo = (i) => {
    setCurrent(i);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrent((p) => (p + 1) % news.length);
    }, 5000);
  };

  if (!news.length) return null;

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      {/* Slider Container */}
      <div className="relative overflow-hidden rounded-2xl" style={{ aspectRatio: '16/7' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ duration: 0.45, ease: 'easeInOut' }}
            className="absolute inset-0"
          >
            {/* Görsel */}
            <img
              src={news[current].image}
              alt={news[current].title}
              className="absolute inset-0 w-full h-full object-cover"
              onError={(e) => { e.target.src = ''; e.target.style.background = '#1E3A5F'; }}
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

            {/* İçerik */}
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <div className="glass-gold rounded-xl p-4 max-w-[28rem]">
                <h3 
                  className="text-base font-display font-bold text-sp-text leading-tight mb-1.5"
                  dangerouslySetInnerHTML={{ __html: news[current].title }}
                />
                <p 
                  className="text-xs text-sp-text-dim leading-relaxed line-clamp-2"
                  dangerouslySetInnerHTML={{ __html: news[current].text }}
                />
                <button
                  onClick={() => onReadMore(news[current])}
                  className="mt-2 text-[10px] font-bold text-sp-gold hover:text-sp-gold-light uppercase tracking-widest transition-colors flex items-center gap-1"
                >
                  Devamını Oku 
                  <span className="text-sm leading-none">&rarr;</span>
                </button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dots */}
      {news.length > 1 && (
        <div className="flex justify-center gap-2 mt-3">
          {news.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === current
                  ? 'w-7 bg-sp-gold'
                  : 'w-3 bg-sp-text-muted/40 hover:bg-sp-text-muted/60'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ===== Ana Dashboard Bileşeni ===== */
function Dashboard({ playerName, sessionToken, onLogout }) {
  // State
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [avatar, setAvatar] = useState('');
  const [news, setNews] = useState([]);
  const [onlinePlayers, setOnlinePlayers] = useState(null);
  const [serverOnline, setServerOnline] = useState(false);
  const [gameStatus, setGameStatus] = useState('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [selectedNews, setSelectedNews] = useState(null);

  // Dashboard verisini çek
  useEffect(() => {
    async function fetchDashboard() {
      try {
        const url = playerName 
          ? `https://spelium.com/api.php?action=get_dashboard_data&username=${encodeURIComponent(playerName)}`
          : `https://spelium.com/api.php?action=get_dashboard_data`;
        
        const res = await fetch(url);
        const data = await res.json();
        if (data.status === 'success') {
          if (data.avatar) {
            let finalAvatar = data.avatar;
            // Eğer avatar bir HTML string ise (özel Minexon sistemi çekiyorsa) URL'yi ayıkla
            if (finalAvatar.includes('<')) {
              const urlMatch = finalAvatar.match(/url\(['"]?(.*?)['"]?\)/) || finalAvatar.match(/src=['"](.*?)['"]/);
              if (urlMatch && urlMatch[1]) {
                finalAvatar = urlMatch[1].startsWith('http') ? urlMatch[1] : `https://spelium.com${urlMatch[1]}`;
              } else {
                finalAvatar = ''; // Çıkarılamazsa hata vermesin, mc-heads fallback yapsın
              }
            }
            if (finalAvatar) setAvatar(finalAvatar);
          }
          if (data.news) setNews(data.news);
        }
      } catch (err) {
        console.log('[Dashboard] API verileri yüklenemedi, varsayılanlar kullanılıyor.');
        // Fallback haberler
        setNews([
          { title: "Babil'in Kapıları Aralandı", text: "Yıllarca süren sessizliğin ardından, kadim kapılar tekrar açıldı...", image: '' },
          { title: 'Yeni Sezon Başladı!', text: 'Arena savaşları, yeni haritalar ve ödüller sizi bekliyor.', image: '' },
        ]);
      }
    }
    fetchDashboard();
  }, []);

  // Canlı oyuncu sayısı (mcsrvstat.us API)
  useEffect(() => {
    async function fetchServerStatus() {
      try {
        const res = await fetch('https://api.mcsrvstat.us/3/mc.spelium.com');
        const data = await res.json();
        setServerOnline(data.online || false);
        setOnlinePlayers(data.players?.online ?? 0);
      } catch {
        setServerOnline(false);
        setOnlinePlayers(null);
      }
    }
    fetchServerStatus();
    const iv = setInterval(fetchServerStatus, 30000); // 30 saniyede bir güncelle
    return () => clearInterval(iv);
  }, []);

  // Oyun durum dinleyicisi
  useEffect(() => {
    if (!window.spelium) return;
    const cleanup = window.spelium.game.onStatus((data) => {
      setStatusMessage(data.message || '');
      setProgress(data.progress || 0);
      if (data.status === 'checking') setGameStatus('checking');
      else if (data.status === 'patching') setGameStatus('patching');
      else if (data.status === 'launching') setGameStatus('launching');
      else if (data.status === 'idle') setGameStatus('idle');
    });
    return cleanup;
  }, []);

  // Oyunu başlat
  const handlePlay = useCallback(async () => {
    if (gameStatus !== 'idle') return;
    setGameStatus('checking');
    setStatusMessage('Dosyalar kontrol ediliyor...');
    setProgress(0);

    try {
      if (window.spelium) {
        // RAM değerini localStorage'dan al, yoksa 4GB varsay
        const ramGB = parseInt(localStorage.getItem('spelium_ram') || '4', 10);
        
        const result = await window.spelium.game.launch(playerName, sessionToken, ramGB);
        if (result.success) {
          setGameStatus('playing');
          setStatusMessage('Oyun çalışıyor...');
          setProgress(100);
          window.spelium.window.minimize();
        } else {
          setStatusMessage(result.error || 'Oyun başlatılamadı.');
          setTimeout(() => { setGameStatus('idle'); setStatusMessage(''); setProgress(0); }, 4000);
        }
      } else {
        // Dev mode simülasyonu
        const steps = [
          { msg: 'Dosyalar kontrol ediliyor...', pct: 10 },
          { msg: 'Modlar eşitleniyor...', pct: 35 },
          { msg: 'Resource Pack güncelleniyor...', pct: 60 },
          { msg: 'Sunucuya bağlanılıyor...', pct: 85 },
          { msg: 'Oyun başlatılıyor...', pct: 100 },
        ];
        for (const step of steps) {
          await new Promise(r => setTimeout(r, 700));
          setStatusMessage(step.msg);
          setProgress(step.pct);
        }
        setGameStatus('playing');
        setStatusMessage('Oyun başlatıldı!');
        setTimeout(() => { setGameStatus('idle'); setStatusMessage(''); setProgress(0); }, 3000);
      }
    } catch {
      setStatusMessage('Bir hata oluştu.');
      setTimeout(() => { setGameStatus('idle'); setStatusMessage(''); setProgress(0); }, 3000);
    }
  }, [gameStatus, playerName, sessionToken]);

  const openExternal = (url) => {
    if (window.spelium) window.spelium.app.openExternal(url);
    else window.open(url, '_blank');
  };

  const isRunning = gameStatus !== 'idle';

  return (
    <div className="h-full flex flex-col relative overflow-hidden">
      {/* ── KUSURSUZ MERKEZLİ LOGO (TÜM GÖVDEYE GÖRE) ── */}
      <div className="absolute top-6 left-0 w-full flex justify-center pointer-events-none z-[100]">
        <img src={speliumLogo} alt="Spelium" className="h-[76px] object-contain drop-shadow-gold-glow pointer-events-auto" />
      </div>

      {/* ===== Arka plan efektleri ===== */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-sp-bg" />
        <div className="absolute inset-0 bg-mesh-dark" />
        {/* Subtle particles */}
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-sp-gold/20"
            style={{
              left: `${10 + i * 20}%`,
              top: `${15 + (i % 3) * 30}%`,
              animation: `particleFloat ${9 + i * 2}s ease-in-out infinite`,
              animationDelay: `${i * 2}s`,
            }}
          />
        ))}
      </div>

      {/* ===== İÇERİK ===== */}
      <div className="relative z-10 h-full flex flex-col px-6 pt-4 pb-5">

        {/* ── ÜST BAR (Absolute Grid) ── */}
        <div className="relative w-full h-12 mb-4 shrink-0 flex items-center">
          
          {/* Sol: Avatar + İsim */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="absolute left-0 flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-lg overflow-hidden border-2 border-sp-blue/50 bg-sp-card flex items-center justify-center shrink-0">
              <img 
                src={`https://minotar.net/helm/${playerName || 'Steve'}/100.png`} 
                alt="avatar" 
                className="w-full h-full object-cover rendering-pixelated"
              />
            </div>
            <div>
              <p className="text-xs text-sp-text-muted">Hoş geldin,</p>
              <p className="text-sm font-semibold text-sp-text">{playerName}</p>
            </div>
          </motion.div>

          {/* Sağ: Butonlar */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="absolute right-0 flex items-center gap-2"
          >
            <button
              onClick={() => openExternal('https://spelium.com')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-sp-text-dim hover:text-sp-text hover:bg-sp-card transition-all duration-200 border border-sp-border/40 hover:border-sp-blue/40"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
              Web Sitesi
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-sp-card transition-colors border border-sp-border/40 hover:border-sp-blue/40 group"
              title="Ayarlar"
            >
              <svg className="w-4 h-4 text-sp-text-muted group-hover:text-sp-text transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.004.828c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            {/* Çıkış */}
            <button
              onClick={onLogout}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-500/15 transition-colors border border-sp-border/40 hover:border-red-500/40 group"
              title="Çıkış Yap"
            >
              <svg className="w-4 h-4 text-sp-text-muted group-hover:text-red-400 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
            </button>
          </motion.div>
        </div>

        {/* ── İnce ayraç ── */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-sp-border/60 to-transparent mb-4 shrink-0" />

        {/* ── MERKEZ: Haber Slider ── */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="w-full mb-6"
          >
            <NewsSlider news={news} onReadMore={(article) => setSelectedNews(article)} />
          </motion.div>

          {/* ── OYNA Butonu ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.35, type: 'spring', stiffness: 180, damping: 18 }}
            className="relative mb-4"
          >
            {/* Dış glow */}
            <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r from-sp-gold-dark to-sp-gold blur-xl transition-opacity duration-700 ${
              !isRunning ? 'opacity-35 animate-pulse-gold' : 'opacity-0'
            }`} />

            <motion.button
              onClick={handlePlay}
              disabled={isRunning}
              whileHover={!isRunning ? { scale: 1.06 } : {}}
              whileTap={!isRunning ? { scale: 0.94 } : {}}
              className={`relative z-10 py-4.5 rounded-2xl font-display font-black text-xl tracking-[0.15em] transition-all duration-500 ${
                isRunning
                  ? 'bg-sp-surface text-sp-text-muted cursor-wait border border-sp-border'
                  : 'bg-gradient-to-r from-sp-gold-dark via-sp-gold to-sp-gold-light text-sp-bg-dark hover:shadow-gold-intense border border-sp-gold-light/30'
              }`}
              style={!isRunning 
                ? { paddingLeft: 'calc(6rem + 0.15em)', paddingRight: '6rem', paddingTop: '1.125rem', paddingBottom: '1.125rem' } 
                : { paddingLeft: 'calc(6rem + 0.15em)', paddingRight: '6rem', paddingTop: '1.125rem', paddingBottom: '1.125rem' }
              }
            >
              {gameStatus === 'idle' && 'OYNA'}
              {gameStatus === 'checking' && (
                <span className="flex items-center gap-3 text-sp-text-dim">
                  <div className="w-5 h-5 border-2 border-sp-gold/30 border-t-sp-gold rounded-full animate-spin" />
                  Kontrol Ediliyor...
                </span>
              )}
              {gameStatus === 'patching' && (
                <span className="flex items-center gap-3 text-sp-text-dim">
                  <div className="w-5 h-5 border-2 border-sp-blue-glow/30 border-t-sp-blue-glow rounded-full animate-spin" />
                  Güncelleniyor...
                </span>
              )}
              {gameStatus === 'launching' && (
                <span className="flex items-center gap-3 text-sp-text-dim">
                  <div className="w-5 h-5 border-2 border-sp-gold/30 border-t-sp-gold rounded-full animate-spin" />
                  Başlatılıyor...
                </span>
              )}
              {gameStatus === 'playing' && (
                <span className="text-green-400">✓ Oyun Açıldı</span>
              )}
            </motion.button>
          </motion.div>

          {/* ── Canlı sunucu durumu ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex items-center gap-2"
          >
            <span className="relative flex h-2 w-2">
              {serverOnline && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${serverOnline ? 'bg-green-400' : 'bg-red-400'}`} />
            </span>
            <span className="text-[11px] font-semibold text-sp-text-muted/80 tracking-wide uppercase">
              {onlinePlayers !== null ? (
                <span className={serverOnline ? 'text-green-400/90 font-bold tracking-wider' : 'text-red-400/90'}>
                  {serverOnline ? `Aktif Oyuncu: ${onlinePlayers}` : 'Sunucu Çevrimdışı'}
                </span>
              ) : (
                <span className="text-sp-text-muted tracking-wider">Bağlanılıyor...</span>
              )}
            </span>
          </motion.div>
        </div>

        {/* ── Alt: İlerleme çubuğu ── */}
        <div className="shrink-0 mt-auto pt-2">
          <ProgressBar progress={progress} message={statusMessage} visible={isRunning} />
        </div>
      </div>

      {/* Settings Modal */}
      <Settings open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* Haber Okuma Modalı */}
      <AnimatePresence>
        {selectedNews && (
          <div className="absolute inset-0 z-[60] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setSelectedNews(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-2xl max-h-[85vh] bg-sp-bg border border-sp-border/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="relative w-full h-48 sm:h-64 shrink-0">
                <img src={selectedNews.image} alt="News" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-sp-bg via-sp-bg/40 to-transparent" />
                <button
                  onClick={() => setSelectedNews(null)}
                  className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors backdrop-blur-md"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
              <div className="px-6 pb-8 pt-2 overflow-y-auto custom-scrollbar">
                <h2 
                  className="text-2xl font-display font-bold text-sp-gold mb-4"
                  dangerouslySetInnerHTML={{ __html: selectedNews.title }}
                />
                <div 
                  className="text-sm text-sp-text-dim leading-relaxed space-y-4"
                  dangerouslySetInnerHTML={{ __html: selectedNews.text.replace(/\n/g, '<br/>') }}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Dashboard;
