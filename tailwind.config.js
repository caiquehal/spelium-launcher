/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Spelium Dark Mythic Theme
        'sp-bg': '#1A1A1A',
        'sp-bg-dark': '#111111',
        'sp-bg-light': '#222222',
        'sp-card': '#1E1E24',
        'sp-card-hover': '#26262E',
        'sp-border': '#2A2A35',
        'sp-surface': '#202028',

        // Deep Night Blue
        'sp-blue': '#1E3A5F',
        'sp-blue-light': '#2B5A8F',
        'sp-blue-glow': '#3B7DD8',
        'sp-blue-bright': '#5BA0E8',

        // Rich Gold
        'sp-gold': '#D4A843',
        'sp-gold-light': '#E8C45A',
        'sp-gold-dark': '#B8922F',
        'sp-gold-dim': '#9A7B28',

        // Text
        'sp-text': '#E8E8EC',
        'sp-text-dim': '#9A9AAA',
        'sp-text-muted': '#5A5A6A',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'gold-glow': '0 0 25px rgba(212, 168, 67, 0.35), 0 0 60px rgba(212, 168, 67, 0.12)',
        'gold-intense': '0 0 40px rgba(212, 168, 67, 0.5), 0 0 100px rgba(212, 168, 67, 0.2)',
        'blue-glow': '0 0 20px rgba(59, 125, 216, 0.3), 0 0 50px rgba(59, 125, 216, 0.1)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.4)',
      },
      animation: {
        'pulse-gold': 'pulseGold 2.5s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
        'slide-in': 'slideIn 0.5s ease-out',
      },
      keyframes: {
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 25px rgba(212, 168, 67, 0.35), 0 0 60px rgba(212, 168, 67, 0.12)' },
          '50%': { boxShadow: '0 0 50px rgba(212, 168, 67, 0.55), 0 0 120px rgba(212, 168, 67, 0.25)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
