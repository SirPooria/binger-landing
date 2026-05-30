/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: '#050505',
        accent: '#ccff00',
        card: '#1a1a1a',
        border: 'rgba(255,255,255,0.1)',
        muted: '#6b7280',
      },
      fontFamily: {
        vazir: ['Vazirmatn'],
        sans: ['Vazirmatn'],
      },
    },
  },
  plugins: [],
};
