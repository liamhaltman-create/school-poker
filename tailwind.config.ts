// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './hooks/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        felt: {
          DEFAULT: '#1a4731',
          dark: '#132e22',
          light: '#1e5a3a',
        },
        chip: {
          red: '#dc2626',
          blue: '#2563eb',
          black: '#111827',
          green: '#16a34a',
          white: '#f3f4f6',
        }
      },
      animation: {
        'card-deal': 'cardDeal 0.3s ease-out',
        'chip-toss': 'chipToss 0.4s ease-out',
        'winner-pulse': 'winnerPulse 0.5s ease-in-out 3',
      },
      keyframes: {
        cardDeal: {
          '0%': { transform: 'translateY(-20px) rotate(-5deg)', opacity: '0' },
          '100%': { transform: 'translateY(0) rotate(0)', opacity: '1' },
        },
        chipToss: {
          '0%': { transform: 'scale(0) translateY(-10px)', opacity: '0' },
          '60%': { transform: 'scale(1.2) translateY(5px)' },
          '100%': { transform: 'scale(1) translateY(0)', opacity: '1' },
        },
        winnerPulse: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(250, 204, 21, 0)' },
          '50%': { boxShadow: '0 0 0 8px rgba(250, 204, 21, 0.3)' },
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      }
    },
  },
  plugins: [],
}

export default config
