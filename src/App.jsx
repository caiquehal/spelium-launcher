/**
 * ============================================
 * SPELIUM LAUNCHER - Ana Uygulama Bileşeni
 * ============================================
 * Auth durumuna göre Login veya Dashboard gösterir.
 */

import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { invoke } from '@tauri-apps/api/core';
import TitleBar from './components/TitleBar';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [sessionToken, setSessionToken] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkSession() {
      try {
        const token = localStorage.getItem('spelium_session');
        const pName = localStorage.getItem('spelium_player');
        
        if (token && pName) {
          setPlayerName(pName);
          setSessionToken(token);
          setIsLoggedIn(true);
        }
      } catch (error) {
        console.error('Oturum kontrolü hatası:', error);
      } finally {
        setIsLoading(false);
        // React'in DOM'u çizmesi için ufak bir pay bırakıp native pencereyi "şak" diye açıyoruz
        setTimeout(() => {
          invoke('restore_window');
        }, 100);
      }
    }
    checkSession();
  }, []);

  const handleLogin = (name, token) => {
    setPlayerName(name);
    setSessionToken(token);
    setIsLoggedIn(true);
  };

  const handleLogout = async () => {
    localStorage.removeItem('spelium_session');
    localStorage.removeItem('spelium_player');
    setIsLoggedIn(false);
    setPlayerName('');
    setSessionToken('');
  };

  // Yükleniyor ekranı
  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col bg-sp-bg">
        <TitleBar />
        <div className="flex-1 flex items-center justify-center">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
            <h1 className="text-4xl font-display font-black bg-gradient-to-r from-sp-gold via-sp-gold-light to-sp-gold bg-clip-text text-transparent mb-4">
              SPELIUM
            </h1>
            <div className="w-7 h-7 border-2 border-sp-gold/30 border-t-sp-gold rounded-full animate-spin mx-auto" />
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-sp-bg overflow-hidden">
      <TitleBar />
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {!isLoggedIn ? (
            <motion.div
              key="login"
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.35, ease: 'easeInOut' }}
              className="h-full"
            >
              <Login onLogin={handleLogin} />
            </motion.div>
          ) : (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.35, ease: 'easeInOut' }}
              className="h-full"
            >
              <Dashboard playerName={playerName} sessionToken={sessionToken} onLogout={handleLogout} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;
