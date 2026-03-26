/**
 * ============================================
 * TEOWARE LAUNCHER - İlerleme Çubuğu (ProgressBar)
 * ============================================
 * 
 * Animasyonlu progress bar.
 * Dinamik durum metinleri ile dosya indirme takibi.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function ProgressBar({ progress = 0, message = '', visible = false }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
          className="w-full"
        >
          {/* Durum metni */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-teo-muted truncate max-w-[80%]">
              {message}
            </span>
            <span className="text-xs font-mono text-teo-purple">
              {Math.round(progress)}%
            </span>
          </div>
          
          {/* Progress bar */}
          <div className="relative h-2 bg-teo-dark/80 rounded-full overflow-hidden border border-teo-border/30">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                background: 'linear-gradient(90deg, #a855f7, #3b82f6, #06b6d4)',
                backgroundSize: '200% 100%',
              }}
              initial={{ width: '0%' }}
              animate={{ 
                width: `${progress}%`,
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
              }}
              transition={{ 
                width: { duration: 0.5, ease: 'easeOut' },
                backgroundPosition: { duration: 3, repeat: Infinity, ease: 'linear' },
              }}
            />
            {/* Parlama efekti */}
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full opacity-50"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                width: '30%',
              }}
              animate={{ left: ['-30%', '130%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ProgressBar;
