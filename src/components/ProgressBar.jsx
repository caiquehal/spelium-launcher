/**
 * SPELIUM LAUNCHER - İlerleme Çubuğu (ProgressBar)
 * Altın gradient animasyonlu bar.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function ProgressBar({ progress = 0, message = '', visible = false }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 15 }}
          transition={{ duration: 0.25 }}
          className="w-full"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-medium text-sp-text-dim truncate max-w-[80%]">
              {message}
            </span>
            <span className="text-[11px] font-mono text-sp-gold">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="relative h-1.5 bg-sp-bg-dark rounded-full overflow-hidden border border-sp-border/20">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                background: 'linear-gradient(90deg, #B8922F, #D4A843, #E8C45A)',
                backgroundSize: '200% 100%',
              }}
              initial={{ width: '0%' }}
              animate={{
                width: `${progress}%`,
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
              }}
              transition={{
                width: { duration: 0.4, ease: 'easeOut' },
                backgroundPosition: { duration: 3, repeat: Infinity, ease: 'linear' },
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ProgressBar;
