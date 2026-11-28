export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        brand: {
          bg: '#F5FAF7',
          soft: '#DDF3E7',
          hover: '#C8E9D8',
          line: '#E3EDE6',
          primary: '#4F9D91',
          deep: '#2F7A6E',
          ink: '#244B3A',
          body: '#3D5F4E',
          muted: '#5F7D6E',
        },
      },
      keyframes: {
        fade: {
          from: { opacity: 0, transform: 'translateY(6px)' },
          to: { opacity: 1, transform: 'none' },
        },
        pop: {
          from: { opacity: 0, transform: 'scale(0.97) translateY(6px)' },
          to: { opacity: 1, transform: 'scale(1) translateY(0)' },
        },
        checkPop: {
          '0%': { transform: 'scale(0.85)' },
          '55%': { transform: 'scale(1.12)' },
          '100%': { transform: 'scale(1)' },
        },
        badgeFlip: {
          '0%': { transform: 'rotateY(0deg) scale(0.8)' },
          '50%': { transform: 'rotateY(180deg) scale(1.1)' },
          '100%': { transform: 'rotateY(360deg) scale(1)' },
        },
        confettiBurst: {
          '0%': { opacity: 1, transform: 'translate(0, 0) scale(1)' },
          '100%': { opacity: 0, transform: 'translate(var(--tx), var(--ty)) scale(0.4)' },
        },
      },
      animation: {
        fade: 'fade .28s ease-out',
        pop: 'pop .2s ease-out',
        'check-pop': 'checkPop .28s cubic-bezier(0.22, 1, 0.36, 1)',
        'badge-flip': 'badgeFlip .65s cubic-bezier(0.22, 1, 0.36, 1)',
        confetti: 'confettiBurst .8s ease-out forwards',
      },
    },
  },
  plugins: [],
}
