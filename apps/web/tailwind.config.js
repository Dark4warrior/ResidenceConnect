/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Palette alignée sur le design system mobile (theme/index.ts)
        brand: {
          DEFAULT: '#2563eb',
          dark: '#1d4ed8',
          light: '#dbeafe',
        },
      },
    },
  },
  plugins: [],
};
