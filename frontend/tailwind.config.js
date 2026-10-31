/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: '#263B35',
          dark: '#1A2924',
          light: '#2F4A42',
        },
        ivory: {
          DEFAULT: '#F5EFE2',
          light: '#FAF8F3',
          dark: '#E8E2D5',
        },
        terracotta: {
          DEFAULT: '#B77B42',
          light: '#D09863',
          dark: '#9C6636',
        },
        gold: {
          DEFAULT: '#C5A45D',
          light: '#D8BD7C',
          dark: '#A88B4B',
        },
        indigo: {
          DEFAULT: '#34445B',
          light: '#455A7B',
          dark: '#283447',
        },
        stone: {
          DEFAULT: '#8B7D6B',
          light: '#A89A88',
          dark: '#6C6050',
        },
        sage: {
          DEFAULT: '#7A8F89',
          light: '#94ACA6',
          dark: '#5E7470',
        },
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans:  ['"Inter"', 'system-ui', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',
        '128': '32rem',
        '144': '36rem',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
      },
      boxShadow: {
        'soft': '0 8px 32px rgba(0, 0, 0, 0.08)',
        'medium': '0 12px 48px rgba(0, 0, 0, 0.12)',
        'lift': '0 20px 60px rgba(0, 0, 0, 0.15)',
      },
      backgroundImage: {
        'gradient-heritage': 'linear-gradient(135deg, #263B35 0%, #34445B 100%)',
        'gradient-gold': 'linear-gradient(135deg, #C5A45D 0%, #D8BD7C 100%)',
        'gradient-terracotta': 'linear-gradient(135deg, #B77B42 0%, #D09863 100%)',
      },
    },
  },
  plugins: [],
};
