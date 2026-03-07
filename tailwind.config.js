/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        teal: {
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
        },
        ocean: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          500: '#0ea5e9',
          600: '#0284c7',
        },
      },
      boxShadow: {
        card: '0 10px 40px -15px rgba(15, 23, 42, 0.25)',
      },
      backgroundImage: {
        'gradient-teal-blue': 'linear-gradient(135deg, #0d9488 0%, #0ea5e9 100%)',
      },
    },
  },
  plugins: [],
}
