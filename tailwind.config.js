/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'Noto Sans Gujarati', 'system-ui', 'sans-serif'] },
      colors: { brand: { DEFAULT: '#D9480F', dark: '#9A3412' } },
    },
  },
  plugins: [],
};
