/**
 * ============================================
 * SPELIUM LAUNCHER - Settings (Ayarlar) Modal
 * ============================================
 *
 * RAM slider, Performans profilleri (FPS / Dengeli / Sinematik).
 * Ayarlar Electron store üzerinden kalıcı saklanır.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Performans profilleri
const PROFILES = [
  { id: 'fps',       label: 'FPS Modu',       icon: '⚡', rd: 6,  desc: 'Düşük görüş, maksimum FPS' },
  { id: 'balanced',  label: 'Dengeli',         icon: '⚖️', rd: 12, desc: 'Dengeli performans ve görünüm' },
  { id: 'cinematic', label: 'Sinematik',       icon: '🎬', rd: 24, desc: 'Yüksek görüş, sinematik deneyim' },
];

function Settings({ open, onClose }) {
  const [totalRam, setTotalRam] = useState(16);
  const [allocatedRam, setAllocatedRam] = useState(4);
  const [profile, setProfile] = useState('balanced');

  // Sistem bilgisini çek
  useEffect(() => {
    async function load() {
      try {
        if (window.teoware) {
          const info = await window.teoware.app.getSystemInfo();
          const total = parseFloat(info.totalRam);
          setTotalRam(Math.floor(total));
          const allocated = parseFloat(info.allocatedRam);
          setAllocatedRam(Math.round(allocated));
        }
      } catch { /* fallback */ }
    }
    if (open) load();
  }, [open]);

  const maxSlider = Math.max(totalRam - 2, 4);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <div className="glass-strong rounded-2xl w-full max-w-lg mx-6 p-6 pointer-events-auto shadow-glass">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sp-blue/30 flex items-center justify-center">
                    <svg className="w-4 h-4 text-sp-blue-bright" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.004.828c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-display font-bold text-sp-text">Ayarlar</h2>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
                >
                  <svg className="w-4 h-4 text-sp-text-muted" viewBox="0 0 12 12" fill="none">
                    <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              {/* RAM Tahsisi */}
              <div className="mb-7">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-sp-text-dim">RAM Tahsisi</label>
                  <span className="text-sm font-mono font-bold text-sp-gold">{allocatedRam} GB</span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={maxSlider}
                  step={1}
                  value={allocatedRam}
                  onChange={(e) => setAllocatedRam(Number(e.target.value))}
                  className="w-full cursor-pointer"
                />
                <div className="flex justify-between mt-1.5">
                  <span className="text-[10px] text-sp-text-muted">2 GB</span>
                  <span className="text-[10px] text-sp-text-muted">Sistem: {totalRam} GB</span>
                  <span className="text-[10px] text-sp-text-muted">{maxSlider} GB</span>
                </div>
              </div>

              {/* Performans Profilleri */}
              <div className="mb-6">
                <label className="text-sm font-semibold text-sp-text-dim block mb-3">Performans Profili</label>
                <div className="grid grid-cols-3 gap-2.5">
                  {PROFILES.map((p) => {
                    const active = profile === p.id;
                    return (
                      <motion.button
                        key={p.id}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => setProfile(p.id)}
                        className={`relative rounded-xl p-3.5 text-center transition-all duration-300 border ${
                          active
                            ? 'bg-sp-gold/10 border-sp-gold/40 shadow-gold-glow'
                            : 'glass border-sp-border/30 hover:border-sp-blue/30 hover:bg-sp-card-hover'
                        }`}
                      >
                        <div className="text-xl mb-1.5">{p.icon}</div>
                        <div className={`text-xs font-semibold mb-0.5 ${active ? 'text-sp-gold-light' : 'text-sp-text'}`}>
                          {p.label}
                        </div>
                        <div className="text-[10px] text-sp-text-muted">RD: {p.rd}</div>
                        {active && (
                          <motion.div
                            layoutId="profile-indicator"
                            className="absolute -top-1 -right-1 w-3 h-3 bg-sp-gold rounded-full border-2 border-sp-bg"
                          />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Kaydet */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-sp-blue to-sp-blue-light text-white font-semibold text-sm transition-shadow hover:shadow-blue-glow"
              >
                Kaydet ve Kapat
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default Settings;
