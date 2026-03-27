/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta inspirada no dashboard confortável (tons quentes e suaves)
        crown: {
          50: '#fefaf1',
          100: '#fcf3df',
          200: '#f6e2b8',
          300: '#eecf8d',
          400: '#e1b860',
          500: '#cfa24b',
          600: '#b0833c',
          700: '#8f6731',
          800: '#704f27',
          900: '#5a3f20',
          950: '#362414',
        },
        throne: {
          50: '#fbf7f2',
          100: '#f4ede2',
          200: '#e7daca',
          300: '#d5c3ad',
          400: '#bda48a',
          500: '#a4886d',
          600: '#8a6f57',
          700: '#6f5845',
          800: '#584536',
          900: '#46362b',
          950: '#2b211b',
        },
        ink: {
          50: '#f5f5f4',
          100: '#e7e5e4',
          200: '#d6d3d1',
          300: '#a8a29e',
          400: '#78716c',
          500: '#57534e',
          600: '#44403c',
          700: '#2c2520',
          800: '#221c17',
          900: '#18130f',
          950: '#0f0a07',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Cal Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};
