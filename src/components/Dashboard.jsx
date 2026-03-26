/**
 * ============================================
 * TEOWARE LAUNCHER - Ana Ekran (Dashboard)
 * ============================================
 * 
 * Devasa "OYNA" butonu, haber paneli, oyuncu bilgileri,
 * ilerleme çubuğu ve arka plan efektleri.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import NewsPanel from './NewsPanel';
import ProgressBar from './ProgressBar';

function Dashboard({ playerName, sessionToken, onLogout }) {
  const [gameStatus, setGameStatus] = useState('idle'); // idle | checking | patching | launching | playing
  const [statusMessage, setStatusMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [systemInfo, setSystemInfo] = useState(null);
  const [hoverPlay, setHoverPlay] = useState(false);

  // Sistem bilgilerini al
  useEffect(() => {
    async function loadSystemInfo() {
      try {
        if (window.spelium) {
          const info = await window.spelium.app.getSystemInfo();
          setSystemInfo(info);
        }
      } catch (error) {
        console.error('Sistem bilgisi alınamadı:', error);
      }
    }
    loadSystemInfo();
  }, []);

  // Oyun durumu güncellemelerini dinle
  useEffect(() => {
    if (!window.spelium) return;

    const cleanup = window.spelium.game.onStatus((data) => {
      setStatusMessage(data.message || '');
      setProgress(data.progress || 0);
      
      if (data.status === 'checking') setGameStatus('checking');
      else if (data.status === 'patching') setGameStatus('patching');
      else if (data.status === 'launching') setGameStatus('launching');
    });

    return cleanup;
  }, []);

  /**
   * Oyunu başlat
   */
  const handlePlay = useCallback(async () => {
    if (gameStatus !== 'idle') return;
    
    setGameStatus('checking');
    setStatusMessage('Dosyalar kontrol ediliyor...');
    setProgress(0);

    try {
      if (window.spelium) {
        const result = await window.spelium.game.launch(playerName, sessionToken);
        if (result.success) {
          setGameStatus('playing');
          setStatusMessage('Oyun başlatıldı!');
          setProgress(100);
          
          // 3 saniye sonra idle'a dön
          setTimeout(() => {
            setGameStatus('idle');
            setStatusMessage('');
            setProgress(0);
          }, 3000);
        } else {
          setStatusMessage(result.error || 'Oyun başlatılamadı.');
          setTimeout(() => {
            setGameStatus('idle');
            setStatusMessage('');
            setProgress(0);
          }, 4000);
        }
      } else {
        // Dev mode simülasyonu
        const steps = [
          { msg: 'Dosyalar kontrol ediliyor...', pct: 10 },
          { msg: 'Modlar eşitleniyor...', pct: 30 },
          { msg: 'Sodium 0.5.8 indiriliyor...', pct: 50 },
          { msg: 'Resource Pack güncelleniyor...', pct: 70 },
          { msg: 'Sunucuya bağlanılıyor...', pct: 90 },
          { msg: 'Oyun başlatılıyor...', pct: 100 },
        ];
        for (const step of steps) {
          await new Promise(r => setTimeout(r, 800));
          setStatusMessage(step.msg);
          setProgress(step.pct);
        }
        setGameStatus('playing');
        setStatusMessage('Oyun başlatıldı!');
        setTimeout(() => {
          setGameStatus('idle');
          setStatusMessage('');
          setProgress(0);
        }, 3000);
      }
    } catch (error) {
      setStatusMessage('Bir hata oluştu.');
      setTimeout(() => {
        setGameStatus('idle');
        setStatusMessage('');
        setProgress(0);
      }, 3000);
    }
  }, [gameStatus, playerName, sessionToken]);

  const isRunning = gameStatus !== 'idle';

  return (
    <div className="h-full flex flex-col relative">
      {/* ============================================
          ARKA PLAN EFEKTLERİ
          ============================================ */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Karanlık mesh gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-spel-darker via-spel-dark to-spel-darker" />
        
        {/* Mor blob - sol üst */}
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-spel-purple/8 rounded-full blur-[150px] animate-float" />
        
        {/* Mavi blob - sağ alt */}
        <div className="absolute -bottom-32 -right-32 w-[400px] h-[400px] bg-spel-blue/8 rounded-full blur-[120px] animate-float" style={{ animationDelay: '3s' }} />
        
        {/* Merkez glow */}
        <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-spel-purple/3 rounded-full blur-[200px]" />
        
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: 'linear-gradient(rgba(168,85,247,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,0.5) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Floating particles */}
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-spel-purple/40 rounded-full"
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
              animation: `particleFloat ${8 + i * 2}s ease-in-out infinite`,
              animationDelay: `${i * 1.5}s`,
            }}
          />
        ))}
      </div>

      {/* ============================================
          ANA İÇERİK
          ============================================ */}
      <div className="relative z-10 h-full flex">
        {/* SOL KISIM - Ana alan (Oyuncu bilgisi + OYNA butonu) */}
        <div className="flex-1 flex flex-col p-6">
          {/* Üst bar: Oyuncu bilgisi + Çıkış */}
          <div className="flex items-center justify-between mb-6">
            {/* Oyuncu bilgisi */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-spel-purple to-spel-blue flex items-center justify-center shadow-neon-purple">
                <span className="text-lg font-black text-white">
                  {playerName?.charAt(0)?.toUpperCase() || 'T'}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-spel-text">{playerName}</p>
                <p className="text-xs text-spel-muted">Çevrimiçi</p>
              </div>
            </motion.div>

            {/* Sistem bilgisi + Çıkış */}
            <div className="flex items-center gap-3">
              {systemInfo && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="hidden md:flex items-center gap-4 text-[11px] text-spel-muted"
                >
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    RAM: {systemInfo.allocatedRam}
                  </span>
                  <span>{systemInfo.cpuCores} Çekirdek</span>
                </motion.div>
              )}
              <button
                onClick={onLogout}
                className="text-xs text-spel-muted hover:text-red-400 transition-colors duration-200 px-3 py-1.5 rounded-lg hover:bg-red-400/10"
              >
                Çıkış Yap
              </button>
            </div>
          </div>

          {/* Orta alan - OYNA butonu */}
          <div className="flex-1 flex flex-col items-center justify-center">
            {/* Server Bilgisi */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center mb-8"
            >
              <h2 className="text-4xl md:text-5xl font-display font-black bg-gradient-to-r from-spel-purple via-spel-blue to-spel-cyan bg-clip-text text-transparent mb-2">
                TEOWARE
              </h2>
              <p className="text-sm text-spel-muted tracking-widest uppercase">
                MMORPG / Factions — 1.21.x
              </p>
            </motion.div>

            {/* OYNA butonu */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
              className="relative"
            >
              {/* Dış glow efekti */}
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r from-spel-purple to-spel-blue blur-xl transition-opacity duration-500 ${
                hoverPlay && !isRunning ? 'opacity-60' : 'opacity-30'
              } ${!isRunning ? 'animate-pulse-glow' : ''}`} />
              
              <motion.button
                onClick={handlePlay}
                disabled={isRunning}
                onMouseEnter={() => setHoverPlay(true)}
                onMouseLeave={() => setHoverPlay(false)}
                whileHover={!isRunning ? { scale: 1.05 } : {}}
                whileTap={!isRunning ? { scale: 0.95 } : {}}
                className={`relative z-10 px-20 py-5 rounded-2xl font-display font-black text-2xl tracking-wider transition-all duration-500 ${
                  isRunning
                    ? 'bg-spel-surface text-spel-muted cursor-wait border border-spel-border'
                    : 'bg-gradient-to-r from-spel-purple to-spel-blue text-white hover:shadow-neon-glow border border-white/10'
                }`}
              >
                {gameStatus === 'idle' && 'OYNA'}
                {gameStatus === 'checking' && (
                  <span className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-spel-purple/30 border-t-spel-purple rounded-full animate-spin" />
                    Kontrol Ediliyor...
                  </span>
                )}
                {gameStatus === 'patching' && (
                  <span className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-spel-blue/30 border-t-spel-blue rounded-full animate-spin" />
                    Güncelleniyor...
                  </span>
                )}
                {gameStatus === 'launching' && (
                  <span className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-spel-cyan/30 border-t-spel-cyan rounded-full animate-spin" />
                    Başlatılıyor...
                  </span>
                )}
                {gameStatus === 'playing' && '✓ Oyun Açıldı'}
              </motion.button>
            </motion.div>

            {/* Sunucu durumu */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex items-center gap-2 mt-6"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
              </span>
              <span className="text-xs text-spel-muted">
                play.spelium.net — <span className="text-green-400">Çevrimiçi</span>
              </span>
            </motion.div>
          </div>

          {/* Alt kısım - İlerleme çubuğu */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-auto"
          >
            <ProgressBar
              progress={progress}
              message={statusMessage}
              visible={isRunning}
            />
          </motion.div>
        </div>

        {/* SAĞ KISIM - Haber paneli */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="w-72 lg:w-80 border-l border-spel-border/30 p-4 overflow-hidden"
        >
          <NewsPanel />
        </motion.div>
      </div>
    </div>
  );
}

export default Dashboard;
