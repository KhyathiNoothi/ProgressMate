export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {
    colors: { navy: { 900: '#0a0f24', 800: '#0f1630', 700: '#182246' } },
    keyframes: { fade: { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'none' } } },
    animation: { fade: 'fade .35s ease-out' } } },
  plugins: [],
}
