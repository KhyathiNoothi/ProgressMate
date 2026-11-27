export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {
    colors: { brand: {
      bg: '#F5FAF7', soft: '#DDF3E7', hover: '#C8E9D8', line: '#E3EDE6',
      primary: '#4F9D91', deep: '#2F7A6E', ink: '#244B3A', body: '#3D5F4E', muted: '#5F7D6E',
    } },
    keyframes: { fade: { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'none' } } },
    animation: { fade: 'fade .35s ease-out' } } },
  plugins: [],
}
