import type { Config } from 'tailwindcss'

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
        ink: '#0f172a',
        accent: '#7c3aed',
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
    },
  },
  // answer-{index} is built at runtime, so Tailwind cannot see it in the source
  safelist: ['answer-0', 'answer-1', 'answer-2', 'answer-3'],
  plugins: [],
}
export default config
