import type { Config } from 'tailwindcss'

const colorVar = (name: string) => `rgb(var(${name}) / <alpha-value>)`

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
    './hooks/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Noor design tokens — update these to retheme the whole app
        brand: {
          50: colorVar('--brand-50'),
          100: colorVar('--brand-100'),
          200: colorVar('--brand-200'),
          300: colorVar('--brand-300'),
          400: colorVar('--brand-400'),
          500: colorVar('--brand-500'),
          600: colorVar('--brand-600'),
          700: colorVar('--brand-700'),
          800: colorVar('--brand-800'),
          900: colorVar('--brand-900'),
        },
        faith: {
          light: colorVar('--faith-light'),
          border: colorVar('--faith-border'),
          text: colorVar('--faith-text'),
          DEFAULT: colorVar('--faith'),
        },
        tasks: {
          light: colorVar('--tasks-light'),
          border: colorVar('--tasks-border'),
          text: colorVar('--tasks-text'),
          DEFAULT: colorVar('--tasks'),
        },
        fitness: {
          light: colorVar('--fitness-light'),
          border: colorVar('--fitness-border'),
          text: colorVar('--fitness-text'),
          DEFAULT: colorVar('--fitness'),
        },
        family: {
          light: colorVar('--family-light'),
          border: colorVar('--family-border'),
          text: colorVar('--family-text'),
          DEFAULT: colorVar('--family'),
        },
        surface: {
          bg: colorVar('--surface-bg'),
          card: colorVar('--surface-card'),
          raised: colorVar('--surface-raised'),
          border: colorVar('--surface-border'),
          muted: colorVar('--surface-muted'),
        },
        ink: {
          primary: colorVar('--ink-primary'),
          secondary: colorVar('--ink-secondary'),
          muted: colorVar('--ink-muted'),
          faint: colorVar('--ink-faint'),
          ghost: colorVar('--ink-ghost'),
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'app': '14px',
        'card': '12px',
        'pill': '20px',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px 0 rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px 0 rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [],
}

export default config
