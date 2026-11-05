import type { Config } from 'tailwindcss';

const c = (name: string) => `rgb(var(--c-${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['selector', '[data-theme="dim"]'],
  theme: {
    extend: {
      colors: {
        bg: c('bg'),
        surface: c('surface'),
        surface2: c('surface2'),
        ink: c('ink'),
        muted: c('muted'),
        line: c('line'),
        brass: c('brass'),
        cyan: c('cyan'),
        magenta: c('magenta'),
        ok: c('ok'),
        warn: c('warn'),
        bad: c('bad'),
      },
      fontFamily: {
        display: ['"Fraunces Variable"', 'Georgia', 'serif'],
        sans: ['"Manrope Variable"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono Variable"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 0 rgb(var(--c-line) / .6), 0 12px 32px -12px rgb(var(--c-shadow) / .35)',
        glow: '0 0 0 1px rgb(var(--c-cyan) / .35), 0 0 32px -4px rgb(var(--c-cyan) / .45)',
      },
      keyframes: {
        swing: { '0%,100%': { transform: 'rotate(-14deg)' }, '50%': { transform: 'rotate(14deg)' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        spin3d: { to: { transform: 'rotateX(-24deg) rotateY(360deg)' } },
        shimmer: { to: { backgroundPosition: '-200% 0' } },
        ping2: {
          '0%': { transform: 'scale(.6)', opacity: '.8' },
          '100%': { transform: 'scale(1.8)', opacity: '0' },
        },
        orbit: { to: { transform: 'rotate(360deg)' } },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'none' },
        },
        dash: { to: { strokeDashoffset: '-200' } },
      },
      animation: {
        swing: 'swing 3.2s ease-in-out infinite',
        float: 'float 5s ease-in-out infinite',
        spin3d: 'spin3d 7s linear infinite',
        shimmer: 'shimmer 1.8s linear infinite',
        ping2: 'ping2 2s cubic-bezier(0,0,.2,1) infinite',
        orbit: 'orbit 3.6s linear infinite',
        fadeUp: 'fadeUp .6s cubic-bezier(.2,.7,.2,1) both',
        dash: 'dash 3s linear infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
