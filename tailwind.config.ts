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
        prayerSection: {
          pre: colorVar('--prayer-section-pre'),
          fajr: colorVar('--prayer-section-fajr'),
          dhuhr: colorVar('--prayer-section-dhuhr'),
          asr: colorVar('--prayer-section-asr'),
          maghrib: colorVar('--prayer-section-maghrib'),
          isha: colorVar('--prayer-section-isha'),
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
        sage: {
          50:  colorVar('--sage-50'),
          200: colorVar('--sage-200'),
          500: colorVar('--sage-500'),
          800: colorVar('--sage-800'),
        },
        semantic: {
          'success-fill':   colorVar('--success-fill'),
          'success-text':   colorVar('--success-text'),
          'success-border': colorVar('--success-border'),
          'attention-fill':   colorVar('--attention-fill'),
          'attention-text':   colorVar('--attention-text'),
          'attention-border': colorVar('--attention-border'),
          'neutral-fill':   colorVar('--neutral-fill'),
          'neutral-text':   colorVar('--neutral-text'),
          'neutral-border': colorVar('--neutral-border'),
          'error-fill':   colorVar('--error-fill'),
          'error-text':   colorVar('--error-text'),
          'error-solid':  colorVar('--error-solid'),
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
        /** Neutral elevation for controls (light + dark: low-contrast depth) */
        'control': '0 1px 2px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.04)',
        'control-hover': '0 2px 8px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)',
        'control-pressed': '0 1px 1px rgba(0,0,0,0.06)',
        'btn-primary': '0 1px 2px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.05)',
        'btn-primary-hover': '0 3px 10px rgba(0,0,0,0.09), 0 1px 2px rgba(0,0,0,0.04)',
        'btn-primary-active': '0 1px 1px rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [],
}

export default config
