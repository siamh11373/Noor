'use client'

import { MoonStar, SunMedium } from 'lucide-react'
import { useEffect, useState } from 'react'
import { applyTheme, getDocumentTheme, type Theme } from '@/lib/theme'
import { cn } from '@/lib/utils'

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null)

  useEffect(() => {
    setTheme(getDocumentTheme())
  }, [])

  function handleToggle() {
    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark'
    applyTheme(nextTheme)
    setTheme(nextTheme)
  }

  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={cn(
        'inline-flex h-[30px] w-[30px] items-center justify-center rounded-[10px] border border-surface-border',
        'bg-surface-muted text-ink-muted shadow-control transition-[transform,box-shadow,background-color,color] duration-200 ease-out',
        'hover:bg-surface-raised hover:text-ink-primary hover:shadow-control-hover',
        'active:scale-[0.96] active:shadow-control-pressed',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/25 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-bg',
      )}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      {isDark ? <SunMedium size={14} /> : <MoonStar size={14} />}
    </button>
  )
}
