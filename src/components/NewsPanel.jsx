/**
 * ============================================
 * TEOWARE LAUNCHER - Haber Paneli (NewsPanel)
 * ============================================
 * 
 * Sunucudan çekilen güncel duyuruları gösterir.
 * Sağ tarafta kayan haber kartları.
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// Varsayılan haberler (API erişilemezse kullanılır)
const DEFAULT_NEWS = [
  {
    id: 1,
    title: '🏟️ 2. Sezon Başladı!',
    date: '2024-12-15',
    description: 'Yeni haritalar, silahlar ve eşsiz ödüller sizi bekliyor. Arena savaşlarında yerinizi alın!',
    type: 'event',
  },
  {
    id: 2,
    title: '⚔️ Yeni Faction Mekaniği',
    date: '2024-12-10',
    description: 'Faction\'lar artık ittifak kurabilir ve ortak saldırılar düzenleyebilir!',
    type: 'update',
  },
  {
    id: 3,
    title: '🗺️ Pompei Haritası Güncellendi',
    date: '2024-12-05',
    description: 'Pompei haritasına yeni gizli bölgeler ve hazineler eklendi.',
    type: 'map',
  },
  {
    id: 4,
    title: '🎁 Kış Festivali',
    date: '2024-12-01',
    description: 'Noel temalı özel skinler ve ödüller ile kış festivali başladı!',
    type: 'event',
  },
];

function NewsPanel() {
  const [news, setNews] = useState(DEFAULT_NEWS);

  // Sunucudan haberleri çek
  useEffect(() => {
    async function fetchNews() {
      try {
        const response = await fetch('https://api.spelium.net/launcher/news');
        if (response.ok) {
          const data = await response.json();
          if (data.news && data.news.length > 0) {
            setNews(data.news);
          }
        }
      } catch (error) {
        // API erişilemezse varsayılan haberler kullanılır
        console.log('[News] API erişilemedi, varsayılan haberler kullanılıyor.');
      }
    }
    fetchNews();
  }, []);

  // Haber tipi renkleri
  const getTypeBadge = (type) => {
    const badges = {
      event: { bg: 'bg-spel-purple/20', text: 'text-spel-purple-light', label: 'Etkinlik' },
      update: { bg: 'bg-spel-blue/20', text: 'text-spel-blue', label: 'Güncelleme' },
      map: { bg: 'bg-spel-cyan/20', text: 'text-spel-cyan', label: 'Harita' },
      default: { bg: 'bg-spel-muted/20', text: 'text-spel-muted', label: 'Duyuru' },
    };
    return badges[type] || badges.default;
  };

  // Tarih formatla
  const formatDate = (dateStr) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Başlık */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className="w-1.5 h-4 bg-gradient-to-b from-spel-purple to-spel-blue rounded-full" />
        <h3 className="text-sm font-display font-semibold text-spel-text tracking-wide">
          HABERLER
        </h3>
      </div>

      {/* Haber listesi */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 scrollbar-thin">
        {news.map((item, index) => {
          const badge = getTypeBadge(item.type);
          return (
            <motion.div
              key={item.id || index}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
              className="glass rounded-xl p-3.5 hover:border-spel-purple/30 transition-all duration-300 cursor-default group"
            >
              {/* Üst kısım: badge + tarih */}
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${badge.bg} ${badge.text}`}>
                  {badge.label}
                </span>
                <span className="text-[10px] text-spel-muted">
                  {formatDate(item.date)}
                </span>
              </div>

              {/* Başlık */}
              <h4 className="text-sm font-semibold text-spel-text mb-1 group-hover:text-spel-purple-light transition-colors">
                {item.title}
              </h4>

              {/* Açıklama */}
              <p className="text-xs text-spel-muted leading-relaxed line-clamp-2">
                {item.description}
              </p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default NewsPanel;
