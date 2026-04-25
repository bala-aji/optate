import type { Config } from 'tailwindcss';

export default {
  prefix: 'optate-',
  content: [
    './src/**/*.{html,ts,tsx}',
    './entrypoints/**/*.{html,ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        earth: {
          terracotta: {
            DEFAULT: '#C75B39',
            light: '#D4724F',
            dark: '#A34A2E',
          },
          olive: {
            DEFAULT: '#6B8F5E',
            light: '#7FA671',
          },
          sand: '#F5F0E8',
          cream: '#FAF7F2',
          clay: {
            DEFAULT: '#A68B7C',
            light: '#C4B5A8',
          },
          espresso: '#2D2016',
          bark: '#3B2E24',
          loam: '#4A3C31',
          parchment: '#EDE6DB',
          amber: '#D4A03C',
          rust: '#B84233',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'Noto Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
