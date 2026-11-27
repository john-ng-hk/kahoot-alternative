import type { Config } from 'tailwindcss'

// Brand colours are CSS variables (RGB channels) defined in src/app/globals.css.
// To rebrand, edit those variables and public/brand/*.
const config: Config = {
  content: [
    './src/mdx-components.tsx',
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: 'rgb(var(--brand-ink) / <alpha-value>)',
        brand: {
          DEFAULT: 'rgb(var(--brand-primary) / <alpha-value>)',
          dark: 'rgb(var(--brand-primary-dark) / <alpha-value>)',
          light: 'rgb(var(--brand-primary-light) / <alpha-value>)',
        },
        answer: {
          red: '#dc2626',
          blue: '#2563eb',
          yellow: '#fbbf24',
          green: '#15803d',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        pop: {
          '0%': { opacity: '0', transform: 'scale(0.6)' },
          '70%': { opacity: '1', transform: 'scale(1.08)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        grow: {
          from: { transform: 'scaleY(0)' },
          to: { transform: 'scaleY(1)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.45' },
        },
      },
      animation: {
        'fade-up': 'fade-up 450ms ease-out backwards',
        pop: 'pop 450ms ease-out backwards',
        grow: 'grow 600ms ease-out backwards',
        'pulse-soft': 'pulse-soft 1.8s ease-in-out infinite',
      },
    },
  },
  // answer-{index} is built at runtime, so Tailwind cannot see it in the source
  safelist: ['answer-0', 'answer-1', 'answer-2', 'answer-3'],
  plugins: [],
}
export default config
