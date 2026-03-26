/**
 * ============================================
 * SPELIUM LAUNCHER - TitleBar (Frameless Pencere)
 * ============================================
 * Koyu tema, Spelium logosu, minimize/close butonları
 */

import React from 'react';
import speliumLogo from '../assets/spelium.png';

function TitleBar() {
  const handleMinimize = () => window.spelium?.window.minimize();
  const handleClose = () => window.spelium?.window.close();

  return (
    <div className="drag-region h-9 flex items-center justify-between px-4 bg-sp-bg-dark/95 border-b border-sp-border/40 z-50 shrink-0">
      {/* Sol: Logo */}
      <div className="flex items-center gap-2.5">
        <div className="w-5 h-5 flex items-center justify-center drop-shadow-md">
          <img src={speliumLogo} alt="Spelium" className="w-full h-full object-contain" />
        </div>
        <span className="text-[11px] font-display font-semibold text-sp-text-dim tracking-[0.15em] uppercase">
          Spelium Launcher
        </span>
      </div>

      {/* Sağ: Pencere kontrolleri */}
      <div className="flex items-center gap-0.5 no-drag">
        {/* Minimize */}
        <button
          onClick={handleMinimize}
          className="w-8 h-7 flex items-center justify-center rounded hover:bg-white/8 transition-colors duration-150 group"
          title="Küçült"
        >
          <svg className="w-3 h-3 text-sp-text-muted group-hover:text-sp-text" viewBox="0 0 12 12" fill="none">
            <rect y="5" width="12" height="1.5" rx="0.75" fill="currentColor" />
          </svg>
        </button>

        {/* Close */}
        <button
          onClick={handleClose}
          className="w-8 h-7 flex items-center justify-center rounded hover:bg-red-500/70 transition-colors duration-150 group"
          title="Kapat"
        >
          <svg className="w-3 h-3 text-sp-text-muted group-hover:text-white" viewBox="0 0 12 12" fill="none">
            <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default TitleBar;
