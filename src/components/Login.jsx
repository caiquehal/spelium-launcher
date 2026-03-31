/**
 * ============================================
 * SPELIUM LAUNCHER - Giriş Ekranı (Login)
 * ============================================
 * Karanlık mitoloji teması, altın vurgular.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { open } from '@tauri-apps/plugin-shell';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Kullanıcı adı ve şifre gerekli.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('https://spelium.com/api.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
      });
      
      const data = await response.json();
      
      if (data.status === 'success') {
        const token = data.token || 'session-token';
        const pName = data.username || username;
        if (rememberMe) {
          localStorage.setItem('spelium_session', token);
          localStorage.setItem('spelium_player', pName);
        }
        onLogin(pName, token);
      } else {
        setError(data.message || 'Giriş başarısız!');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Sunucuya bağlanılamadı. Lütfen tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  };

  const openExternal = async (url) => {
    try {
      await open(url);
    } catch (err) {
      console.error('URL açılamadı:', err);
    }
  };

  return (
    <div className="h-full flex items-center justify-center relative">
      {/* Arka plan */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-sp-blue/10 rounded-full blur-[130px]" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-sp-gold/6 rounded-full blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'linear-gradient(rgba(212,168,67,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(212,168,67,0.4) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* Form */}
      <motion.div
        initial={{ opacity: 0, y: 25, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-sm mx-4"
      >
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-center mb-7"
        >
          <h1 className="text-5xl font-display font-black bg-gradient-to-r from-sp-gold-dark via-sp-gold to-sp-gold-light bg-clip-text text-transparent mb-1">
            SPELIUM
          </h1>
          <p className="text-sp-text-muted text-[11px] tracking-[0.25em] uppercase font-medium">
            Macera Seni Bekliyor
          </p>
        </motion.div>

        {/* Kart */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass-strong rounded-2xl p-7"
          style={{ boxShadow: '0 0 40px rgba(0,0,0,0.3), 0 0 80px rgba(30,58,95,0.08)' }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Hata */}
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-2.5 text-red-400 text-xs flex items-center gap-2"
              >
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </motion.div>
            )}

            {/* Kullanıcı adı */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-sp-text-dim uppercase tracking-wider" htmlFor="username">Kullanıcı Adı</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-sp-text-muted">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
                  </svg>
                </div>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Kullanıcı adını gir"
                  disabled={isLoading}
                  className="w-full bg-sp-bg/70 border border-sp-border/40 rounded-xl pl-10 pr-4 py-2.5 text-sm text-sp-text placeholder-sp-text-muted/40 focus:border-sp-gold/40 focus:ring-1 focus:ring-sp-gold/20 transition-all duration-200 disabled:opacity-40"
                  autoComplete="off"
                  spellCheck="false"
                />
              </div>
            </div>

            {/* Şifre */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-sp-text-dim uppercase tracking-wider" htmlFor="password">Şifre</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-sp-text-muted">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Şifreni gir"
                  disabled={isLoading}
                  className="w-full bg-sp-bg/70 border border-sp-border/40 rounded-xl pl-10 pr-11 py-2.5 text-sm text-sp-text placeholder-sp-text-muted/40 focus:border-sp-gold/40 focus:ring-1 focus:ring-sp-gold/20 transition-all duration-200 disabled:opacity-40"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sp-text-muted hover:text-sp-text transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Beni Hatırla + Şifremi Unuttum */}
            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer group" htmlFor="rememberMe">
                <input id="rememberMe" type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="sr-only" />
                <div className={`w-4 h-4 rounded border-2 transition-all duration-200 flex items-center justify-center ${
                  rememberMe ? 'bg-sp-gold border-sp-gold' : 'border-sp-border group-hover:border-sp-gold/40'
                }`}>
                  {rememberMe && (
                    <svg className="w-2.5 h-2.5 text-sp-bg-dark" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span className="text-[11px] text-sp-text-muted group-hover:text-sp-text-dim transition-colors">Beni Hatırla</span>
              </label>
              <button type="button" onClick={() => openExternal('https://spelium.com/sifremi-unuttum')} className="text-[11px] text-sp-blue-bright hover:text-sp-blue-glow transition-colors">
                Şifremi Unuttum
              </button>
            </div>

            {/* Giriş butonu */}
            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.985 }}
              className="w-full bg-gradient-to-r from-sp-gold-dark via-sp-gold to-sp-gold-light text-sp-bg-dark font-bold py-3 rounded-xl transition-shadow hover:shadow-gold-glow disabled:opacity-40 disabled:cursor-not-allowed text-sm tracking-wide"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-sp-bg-dark/30 border-t-sp-bg-dark rounded-full animate-spin" />
                  Giriş yapılıyor...
                </div>
              ) : (
                'Giriş Yap'
              )}
            </motion.button>

            {/* Kayıt Ol */}
            <div className="text-center pt-1">
              <span className="text-[11px] text-sp-text-muted">Hesabın yok mu? </span>
              <button type="button" onClick={() => openExternal('https://spelium.com/kayit-ol')} className="text-[11px] font-semibold text-sp-gold hover:text-sp-gold-light transition-colors">
                Kayıt Ol
              </button>
            </div>
          </form>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-5 text-[10px] text-sp-text-muted/40"
        >
          Spelium © 2024 — Tüm hakları saklıdır.
        </motion.p>
      </motion.div>
    </div>
  );
}

export default Login;
