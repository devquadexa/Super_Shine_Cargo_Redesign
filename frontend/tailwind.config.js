/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      // ── Global font ──────────────────────────────────────────────
      // Modern sans-serif used across the entire system. Inter (loaded
      // in index.css) with system-font fallbacks keeps letters and
      // numbers consistent. `serif` is mapped to the same stack so any
      // legacy `font-serif` usage stays on the modern font.
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
        serif: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
      },
      // ── Brand color theme ────────────────────────────────────────
      // The `blue` scale is remapped to the login page dark-blue theme.
      // Primary brand color (#1E3F63) = blue-600, lighter accent
      // (#2F5E8F, the login gradient top) = blue-500. Every existing
      // `blue-*` utility class across the app now resolves to this scale.
      colors: {
        blue: {
          50: '#eef3f8',
          100: '#d8e3ef',
          200: '#b3c8de',
          300: '#85a4c4',
          400: '#527da3',
          500: '#2f5e8f',
          600: '#1e3f63',
          700: '#193552',
          800: '#142a42',
          900: '#101f31',
          950: '#0b1c33',
        },
      },
      animation: {
        blob: 'blob 7s infinite',
      },
      keyframes: {
        blob: {
          '0%, 100%': {
            transform: 'translate(0, 0) scale(1)',
          },
          '33%': {
            transform: 'translate(30px, -50px) scale(1.1)',
          },
          '66%': {
            transform: 'translate(-20px, 20px) scale(0.9)',
          },
        },
      },
    },
  },
  plugins: [],
}
