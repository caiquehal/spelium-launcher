/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Spelium neon theme
        'spel-dark': '#0a0a0f',
        'spel-darker': '#050508',
        'spel-card': '#12121a',
        'spel-border': '#1e1e2e',
        'spel-surface': '#16161f',
        'spel-purple': '#a855f7',
        'spel-purple-dark': '#7c3aed',
        'spel-purple-light': '#c084fc',
        'spel-blue': '#3b82f6',
        'spel-blue-dark': '#2563eb',
        'spel-cyan': '#06b6d4',
        'spel-text': '#e2e8f0',
        'spel-muted': '#64748b',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'neon-purple': '0 0 20px rgba(168, 85, 247, 0.4), 0 0 60px rgba(168, 85, 247, 0.15)',
        'neon-blue': '0 0 20px rgba(59, 130, 246, 0.4), 0 0 60px rgba(59, 130, 246, 0.15)',
        'neon-glow': '0 0 30px rgba(168, 85, 247, 0.5), 0 0 80px rgba(59, 130, 246, 0.2)',
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(168, 85, 247, 0.4), 0 0 60px rgba(168, 85, 247, 0.15)' },
          '50%': { boxShadow: '0 0 40px rgba(168, 85, 247, 0.6), 0 0 100px rgba(168, 85, 247, 0.3)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};
