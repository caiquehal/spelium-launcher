/**
 * ============================================
 * TEOWARE LAUNCHER - Giriş Ekranı (Login)
 * ============================================
 * 
 * Özel kimlik doğrulama ile giriş formu.
 * Kullanıcı adı + şifre, "Beni Hatırla", 
 * "Şifremi Unuttum" ve "Kayıt Ol" seçenekleri.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  /**
   * Giriş formunu gönder
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Kullanıcı adı ve şifre gerekli.');
      return;
    }

    setIsLoading(true);

    try {
      if (window.teoware) {
        const result = await window.teoware.auth.login(username, password, rememberMe);
        if (result.success) {
          onLogin(result.playerName, result.sessionToken);
        } else {
          setError(result.error || 'Giriş başarısız.');
        }
      } else {
        // Geliştirme modu (Electron dışı)
        setTimeout(() => {
          onLogin(username, 'dev-token-' + Date.now());
        }, 1000);
      }
    } catch (err) {
      setError('Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Harici link aç
   */
  const openExternal = (url) => {
    if (window.teoware) {
      window.teoware.app.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="h-full flex items-center justify-center relative">
      {/* Arka plan efektleri */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Mor gradient blob */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-teo-purple/10 rounded-full blur-[120px] animate-float" />
        {/* Mavi gradient blob */}
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-teo-blue/10 rounded-full blur-[120px] animate-float" style={{ animationDelay: '3s' }} />
        {/* Cyan gradient blob */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-teo-cyan/5 rounded-full blur-[100px]" />
        
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(168,85,247,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,0.5) 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      {/* Login formu */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-center mb-8"
        >
          <h1 className="text-6xl font-display font-black bg-gradient-to-r from-teo-purple via-teo-blue to-teo-cyan bg-clip-text text-transparent mb-2">
            TEOWARE
          </h1>
          <p className="text-teo-muted text-sm tracking-widest uppercase font-medium">
            Minecraft Launcher
          </p>
        </motion.div>

        {/* Form kartı */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="glass-strong rounded-2xl p-8 neon-border"
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Hata mesajı */}
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </motion.div>
            )}

            {/* Kullanıcı adı */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-teo-muted" htmlFor="username">
                Kullanıcı Adı
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-teo-muted">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
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
                  className="w-full bg-teo-dark/60 border border-teo-border/50 rounded-xl pl-11 pr-4 py-3 text-teo-text placeholder-teo-muted/50 focus:border-teo-purple/50 focus:ring-1 focus:ring-teo-purple/30 transition-all duration-300 disabled:opacity-50"
                  autoComplete="off"
                  spellCheck="false"
                />
              </div>
            </div>

            {/* Şifre */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-teo-muted" htmlFor="password">
                Şifre
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-teo-muted">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
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
                  className="w-full bg-teo-dark/60 border border-teo-border/50 rounded-xl pl-11 pr-12 py-3 text-teo-text placeholder-teo-muted/50 focus:border-teo-purple/50 focus:ring-1 focus:ring-teo-purple/30 transition-all duration-300 disabled:opacity-50"
                />
                {/* Şifreyi göster/gizle */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-teo-muted hover:text-teo-text transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Beni Hatırla + Şifremi Unuttum */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer group" htmlFor="rememberMe">
                <div className="relative">
                  <input
                    id="rememberMe"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded-md border-2 transition-all duration-300 flex items-center justify-center ${
                    rememberMe 
                      ? 'bg-teo-purple border-teo-purple' 
                      : 'border-teo-border group-hover:border-teo-purple/50'
                  }`}>
                    {rememberMe && (
                      <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-sm text-teo-muted group-hover:text-teo-text transition-colors">
                  Beni Hatırla
                </span>
              </label>

              <button
                type="button"
                onClick={() => openExternal('https://teoware.net/forgot-password')}
                className="text-sm text-teo-purple hover:text-teo-purple-light transition-colors"
              >
                Şifremi Unuttum
              </button>
            </div>

            {/* Giriş Yap butonu */}
            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full relative overflow-hidden bg-gradient-to-r from-teo-purple to-teo-blue text-white font-semibold py-3.5 rounded-xl transition-all duration-300 hover:shadow-neon-purple disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Giriş yapılıyor...</span>
                </div>
              ) : (
                'Giriş Yap'
              )}
            </motion.button>

            {/* Kayıt Ol */}
            <div className="text-center pt-2">
              <span className="text-sm text-teo-muted">Hesabın yok mu? </span>
              <button
                type="button"
                onClick={() => openExternal('https://teoware.net/register')}
                className="text-sm font-semibold text-teo-purple hover:text-teo-purple-light transition-colors"
              >
                Kayıt Ol
              </button>
            </div>
          </form>
        </motion.div>

        {/* Alt bilgi */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="text-center mt-6 text-xs text-teo-muted/50"
        >
          Teoware © 2024 — Tüm hakları saklıdır.
        </motion.p>
      </motion.div>
    </div>
  );
}

export default Login;
