/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background:  'hsl(var(--background))',
        foreground:  'hsl(var(--foreground))',
        card:        { DEFAULT: 'hsl(var(--card))',    foreground: 'hsl(var(--card-fg))' },
        muted:       { DEFAULT: 'hsl(var(--muted))',   foreground: 'hsl(var(--muted-fg))' },
        border:      'hsl(var(--border))',
        primary:     { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-fg))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))' },
      },
      borderRadius: { DEFAULT: 'var(--radius)', lg: 'var(--radius-lg)' },
      fontFamily: {
        sans:    ['var(--font-body)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        mono:    ['var(--font-mono)', 'monospace'],
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          from: { opacity: '0', transform: 'translateX(-6px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          from: { backgroundPosition: '200% 0' },
          to:   { backgroundPosition: '-200% 0' },
        },
      },
      animation: {
        'fade-up':  'fade-up 0.22s cubic-bezier(0.16,1,0.3,1) both',
        'slide-in': 'slide-in 0.18s cubic-bezier(0.16,1,0.3,1) both',
        shimmer:    'shimmer 1.8s ease-in-out infinite',
      },
    },
  },
}
