/** @type {import('tailwindcss').Config} */
const v = (n) => `hsl(var(--${n}) / <alpha-value>)`;
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    container: { center: true, padding: '1rem', screens: { '2xl': '1320px' } },
    extend: {
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'var(--font-gujarati)', 'Inter', 'system-ui', 'sans-serif'],
        gu: ['var(--font-gujarati)', 'var(--font-geist-sans)', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
      },
      colors: {
        background: v('background'), foreground: v('foreground'),
        card: { DEFAULT: v('card'), foreground: v('card-foreground') },
        muted: { DEFAULT: v('muted'), foreground: v('muted-foreground') },
        border: v('border'), input: v('input'), ring: v('ring'),
        primary: { DEFAULT: v('primary'), foreground: v('primary-foreground') },
        accent: { DEFAULT: v('accent'), foreground: v('accent-foreground') },
        brand: { red: '#E31E24', navy: '#1B2A5C', grey: '#4A4A4A', cream: '#F5F0E6' },
        agri: v('agri'), industry: v('industry'),
      },
      borderRadius: { xl: '0.875rem', '2xl': '1.125rem', '3xl': '1.5rem' },
      boxShadow: {
        soft: '0 1px 2px rgb(0 0 0 / 0.04), 0 4px 16px -4px rgb(0 0 0 / 0.08)',
        lift: '0 2px 4px rgb(0 0 0 / 0.04), 0 16px 40px -12px rgb(0 0 0 / 0.18)',
        glow: '0 0 0 1px hsl(var(--primary) / 0.25), 0 8px 30px -8px hsl(var(--primary) / 0.45)',
      },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        ticker: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
      },
      animation: { shimmer: 'shimmer 1.6s infinite', ticker: 'ticker 80s linear infinite' },
    },
  },
  plugins: [],
};
