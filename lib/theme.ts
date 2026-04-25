export type Theme = 'light' | 'dark' | 'pink'

export interface ThemeOption {
  value: Theme
  label: string
  description: string
  swatches: [string, string, string]
  colorScheme: 'light' | 'dark'
}

export const THEME_STORAGE_KEY = 'noor-theme'

export const THEME_OPTIONS: readonly ThemeOption[] = [
  {
    value: 'light',
    label: 'Light Mode',
    description: 'Warm parchment surfaces with quiet gold accents.',
    swatches: ['#FAF7F2', '#FFFFFF', '#B8904A'],
    colorScheme: 'light',
  },
  {
    value: 'dark',
    label: 'Dark Mode',
    description: 'Deep slate surfaces with softened contrast for focus.',
    swatches: ['#0E1216', '#141A20', '#DAB068'],
    colorScheme: 'dark',
  },
  {
    value: 'pink',
    label: 'Pink Mode',
    description: 'Soft blush surfaces with botanical rose accents.',
    swatches: ['#FCF4F7', '#FFF9FB', '#C97FA1'],
    colorScheme: 'light',
  },
] as const

const VALID_THEMES = new Set<Theme>(THEME_OPTIONS.map(option => option.value))

let themeTransitionTimer: number | null = null
let themeBloomTimer: number | null = null

export function resolveTheme(value: unknown): Theme | null {
  return typeof value === 'string' && VALID_THEMES.has(value as Theme)
    ? value as Theme
    : null
}

export function getThemeColorScheme(theme: Theme): 'light' | 'dark' {
  return theme === 'dark' ? 'dark' : 'light'
}

export function applyThemeToRoot(root: HTMLElement, theme: Theme) {
  root.dataset.theme = theme
  root.classList.toggle('dark', theme === 'dark')
  root.style.colorScheme = getThemeColorScheme(theme)
}

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function clearThemeEffects() {
  if (typeof window === 'undefined') {
    return
  }

  if (themeTransitionTimer != null) {
    window.clearTimeout(themeTransitionTimer)
    themeTransitionTimer = null
  }

  if (themeBloomTimer != null) {
    window.clearTimeout(themeBloomTimer)
    themeBloomTimer = null
  }
}

function triggerThemeEffects(root: HTMLElement, theme: Theme) {
  if (typeof window === 'undefined' || prefersReducedMotion()) {
    root.removeAttribute('data-theme-transition')
    root.removeAttribute('data-theme-bloom')
    return
  }

  clearThemeEffects()
  root.dataset.themeTransition = 'true'
  themeTransitionTimer = window.setTimeout(() => {
    root.removeAttribute('data-theme-transition')
    themeTransitionTimer = null
  }, 220)

  if (theme === 'pink') {
    root.dataset.themeBloom = 'pink'
    themeBloomTimer = window.setTimeout(() => {
      root.removeAttribute('data-theme-bloom')
      themeBloomTimer = null
    }, 560)
    return
  }

  root.removeAttribute('data-theme-bloom')
}

export function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return resolveTheme(window.localStorage.getItem(THEME_STORAGE_KEY))
  } catch {
    return null
  }
}

export function getSystemTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'light'
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyTheme(theme: Theme, options?: { animate?: boolean; persist?: boolean }) {
  if (typeof document === 'undefined') {
    return
  }

  const root = document.documentElement
  applyThemeToRoot(root, theme)

  if (options?.persist !== false && typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      // Ignore privacy/quota errors.
    }
  }

  if (options?.animate !== false) {
    triggerThemeEffects(root, theme)
  }
}

export function getDocumentTheme(): Theme {
  if (typeof document === 'undefined') {
    return 'light'
  }

  return resolveTheme(document.documentElement.dataset.theme)
    ?? (document.documentElement.classList.contains('dark') ? 'dark' : 'light')
}

export function getThemeBootstrapScript(serverTheme?: Theme | null) {
  const preferredTheme = resolveTheme(serverTheme)

  return `
(() => {
  try {
    const validThemes = ['light', 'dark', 'pink'];
    const serverTheme = ${JSON.stringify(preferredTheme)};
    const storedTheme = window.localStorage.getItem('${THEME_STORAGE_KEY}');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = validThemes.includes(serverTheme)
      ? serverTheme
      : (validThemes.includes(storedTheme) ? storedTheme : (prefersDark ? 'dark' : 'light'));
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme === 'dark' ? 'dark' : 'light';
    window.localStorage.setItem('${THEME_STORAGE_KEY}', theme);
  } catch (_) {}
})();
`
}
