/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.md',
    './docs/**/*.md',
    './.vitepress/**/*.{vue,ts,mts,js}'
  ],
  darkMode: 'class',
  corePlugins: {
    preflight: false
  },
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'SF Pro Display',
          'PingFang SC',
          'Microsoft YaHei',
          'system-ui',
          'sans-serif'
        ],
        mono: [
          'JetBrains Mono',
          'SFMono-Regular',
          'Cascadia Code',
          'Consolas',
          'monospace'
        ]
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' }
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.45' },
          '50%': { opacity: '1' }
        },
        dash: {
          to: { strokeDashoffset: '-24' }
        }
      },
      animation: {
        float: 'float 7s ease-in-out infinite',
        'pulse-soft': 'pulseSoft 2.4s ease-in-out infinite',
        dash: 'dash 1.2s linear infinite'
      }
    }
  },
  plugins: []
}
