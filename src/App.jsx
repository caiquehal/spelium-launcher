/**
 * ============================================
 * TEOWARE LAUNCHER - Ana Uygulama Bileşeni
 * ============================================
 * 
 * Auth durumuna göre Login veya Dashboard gösterir.
 * Frameless pencere için özel TitleBar içerir.
 * Framer Motion ile sayfa geçiş animasyonları.
 */

import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import TitleBar from './components/TitleBar';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

function App() {
  // Auth durumu
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [sessionToken, setSessionToken] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Uygulama açılışında kayıtlı oturumu kontrol et
  useEffect(() => {
    async function checkSession() {
      try {
        if (window.spelium) {
          const result = await window.spelium.auth.checkSession();
          if (result.success) {
            setPlayerName(result.playerName);
            setSessionToken(result.sessionToken);
            setIsLoggedIn(true);
          }
        }
      } catch (error) {
        console.error('Oturum kontrolü hatası:', error);
      } finally {
        setIsLoading(false);
      }
    }
    checkSession();
  }, []);

  /**
   * Giriş başarılı olduğunda çağrılır
   */
  const handleLogin = (name, token) => {
    setPlayerName(name);
    setSessionToken(token);
    setIsLoggedIn(true);
  };

  /**
   * Çıkış yap
   */
  const handleLogout = async () => {
    try {
      if (window.spelium) {
        await window.spelium.auth.logout();
      }
    } catch (error) {
      console.error('Çıkış hatası:', error);
    }
    setIsLoggedIn(false);
    setPlayerName('');
    setSessionToken('');
  };

  // Yükleniyor ekranı
  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col bg-spel-dark">
        <TitleBar />
        <div className="flex-1 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            {/* Logo */}
            <h1 className="text-5xl font-display font-black bg-gradient-to-r from-spel-purple via-spel-blue to-spel-cyan bg-clip-text text-transparent neon-text mb-4">
              TEOWARE
            </h1>
            {/* Loading spinner */}
            <div className="flex justify-center">
              <div className="w-8 h-8 border-2 border-spel-purple/30 border-t-spel-purple rounded-full animate-spin" />
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-spel-dark overflow-hidden">
      {/* Özel Başlık Çubuğu */}
      <TitleBar />

      {/* İçerik Alanı */}
      <div className="flex-1 relative overflow-hidden">
        {/* Arka plan mesh efekti */}
        <div className="absolute inset-0 bg-mesh pointer-events-none" />

        <AnimatePresence mode="wait">
          {!isLoggedIn ? (
            <motion.div
              key="login"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
              className="h-full"
            >
              <Login onLogin={handleLogin} />
            </motion.div>
          ) : (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
              className="h-full"
            >
              <Dashboard
                playerName={playerName}
                sessionToken={sessionToken}
                onLogout={handleLogout}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;
