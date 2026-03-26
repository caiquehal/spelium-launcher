/**
 * ============================================
 * TEOWARE LAUNCHER - Özel Başlık Çubuğu (TitleBar)
 * ============================================
 * 
 * Frameless pencere için custom title bar.
 * Teoware logosu + pencere kontrol butonları.
 */

import React from 'react';

function TitleBar() {
  const handleMinimize = () => window.teoware?.window.minimize();
  const handleMaximize = () => window.teoware?.window.maximize();
  const handleClose = () => window.teoware?.window.close();

  return (
    <div className="drag-region h-10 flex items-center justify-between px-4 bg-teo-darker/90 border-b border-teo-border/50 z-50 shrink-0">
      {/* Sol: Logo */}
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded bg-gradient-to-br from-teo-purple to-teo-blue flex items-center justify-center">
          <span className="text-[10px] font-black text-white">T</span>
        </div>
        <span className="text-xs font-display font-semibold text-teo-muted tracking-wider uppercase">
          Teoware Launcher
        </span>
      </div>

      {/* Sağ: Pencere kontrolleri */}
      <div className="flex items-center gap-1 no-drag">
        {/* Minimize */}
        <button
          onClick={handleMinimize}
          className="w-8 h-7 flex items-center justify-center rounded hover:bg-white/10 transition-colors duration-200 group"
          title="Küçült"
        >
          <svg className="w-3 h-3 text-teo-muted group-hover:text-teo-text" viewBox="0 0 12 12" fill="none">
            <rect y="5" width="12" height="1.5" rx="0.75" fill="currentColor" />
          </svg>
        </button>

        {/* Maximize */}
        <button
          onClick={handleMaximize}
          className="w-8 h-7 flex items-center justify-center rounded hover:bg-white/10 transition-colors duration-200 group"
          title="Büyüt"
        >
          <svg className="w-3 h-3 text-teo-muted group-hover:text-teo-text" viewBox="0 0 12 12" fill="none">
            <rect x="1" y="1" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
        </button>

        {/* Close */}
        <button
          onClick={handleClose}
          className="w-8 h-7 flex items-center justify-center rounded hover:bg-red-500/80 transition-colors duration-200 group"
          title="Kapat"
        >
          <svg className="w-3 h-3 text-teo-muted group-hover:text-white" viewBox="0 0 12 12" fill="none">
            <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default TitleBar;
