'use client'

import { Check, Flower2, MoonStar, Palette, SunMedium } from 'lucide-react'
import { useThemePreference } from '@/hooks/useThemePreference'
import { resolveTheme, type Theme } from '@/lib/theme'
import { cn } from '@/lib/utils'
import {
  MenuContent,
  MenuLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuRoot,
  MenuTrigger,
} from '@/components/ui/dropdown-menu'

const THEME_ICON: Record<Theme, typeof SunMedium> = {
  light: SunMedium,
  dark: MoonStar,
  pink: Flower2,
}

export function ThemeToggle() {
  const { theme, selectTheme, themeOptions } = useThemePreference()
  const activeTheme = themeOptions.find(option => option.value === theme) ?? themeOptions[0]

  return (
    <MenuRoot>
      <MenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'theme-selector-trigger relative inline-flex h-9 w-9 items-center justify-center rounded-[12px] border border-surface-border',
            'bg-surface-muted text-ink-muted shadow-control transition-[transform,box-shadow,background-color,color,border-color] duration-200 ease-out',
            'hover:bg-surface-raised hover:text-ink-primary hover:shadow-control-hover',
            'active:scale-[0.96] active:shadow-control-pressed',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/25 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-bg',
          )}
          aria-label={`Appearance: ${activeTheme.label}`}
          title={activeTheme.label}
        >
          <Palette className="h-[15px] w-[15px]" aria-hidden />
          <span
            className="pointer-events-none absolute bottom-[5px] right-[5px] h-2.5 w-2.5 rounded-full border border-white/80 shadow-[0_1px_2px_rgba(15,23,42,0.16)]"
            style={{ backgroundColor: activeTheme.swatches[2] }}
            aria-hidden
          />
        </button>
      </MenuTrigger>

      <MenuContent align="end" className="theme-selector-menu w-[252px] p-2">
        <div className="px-3 pb-2 pt-1">
          <MenuLabel className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-ghost">
            Appearance
          </MenuLabel>
          <p className="mt-1 text-[12px] leading-snug text-ink-muted">
            Choose the palette that feels best for your workspace.
          </p>
        </div>

        <MenuRadioGroup
          value={theme}
          onValueChange={(value) => {
            const nextTheme = resolveTheme(value)
            if (nextTheme) {
              selectTheme(nextTheme)
            }
          }}
        >
          {themeOptions.map((option) => {
            const Icon = THEME_ICON[option.value]
            const selected = theme === option.value

            return (
              <MenuRadioItem key={option.value} value={option.value} className="theme-selector-option gap-3">
                <span
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-surface-border bg-surface-card/75 text-ink-muted',
                    selected && 'border-brand-200 bg-brand-50/85 text-brand-500',
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-medium text-ink-primary">{option.label}</span>
                    <span className="flex items-center gap-1" aria-hidden>
                      {option.swatches.map((swatch) => (
                        <span
                          key={swatch}
                          className="h-2.5 w-2.5 rounded-full border border-black/5"
                          style={{ backgroundColor: swatch }}
                        />
                      ))}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-[12px] leading-snug text-ink-ghost">
                    {option.description}
                  </span>
                </span>

                <span
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-400/10 text-brand-500 transition-[opacity,transform] duration-150',
                    selected ? 'opacity-100' : 'scale-90 opacity-0',
                  )}
                  aria-hidden
                >
                  <Check className="h-3.5 w-3.5" />
                </span>
              </MenuRadioItem>
            )
          })}
        </MenuRadioGroup>
      </MenuContent>
    </MenuRoot>
  )
}
