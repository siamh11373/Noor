'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { applyTheme, getDocumentTheme, resolveTheme, THEME_OPTIONS, type Theme } from '@/lib/theme'

export function useThemePreference() {
  const { profile, setThemePreference, user } = useAuth()
  const [theme, setTheme] = useState<Theme | null>(null)
  const syncedFallbackUserIdRef = useRef<string | null>(null)

  useEffect(() => {
    setTheme(getDocumentTheme())
  }, [])

  useEffect(() => {
    const profileTheme = resolveTheme(profile?.theme_preference)

    if (!user?.id) {
      syncedFallbackUserIdRef.current = null
      return
    }

    if (profileTheme) {
      syncedFallbackUserIdRef.current = user.id

      if (profileTheme !== theme) {
        applyTheme(profileTheme, { animate: false })
        setTheme(profileTheme)
      }
    }
  }, [profile?.theme_preference, theme, user?.id])

  useEffect(() => {
    if (!user?.id || theme == null) {
      return
    }

    if (resolveTheme(profile?.theme_preference)) {
      syncedFallbackUserIdRef.current = user.id
      return
    }

    if (syncedFallbackUserIdRef.current === user.id) {
      return
    }

    syncedFallbackUserIdRef.current = user.id
    void setThemePreference(theme)
  }, [profile?.theme_preference, setThemePreference, theme, user?.id])

  const selectTheme = useCallback((nextTheme: Theme) => {
    applyTheme(nextTheme)
    setTheme(nextTheme)

    if (user?.id) {
      syncedFallbackUserIdRef.current = user.id
      void setThemePreference(nextTheme)
    }
  }, [setThemePreference, user?.id])

  return {
    theme: theme ?? resolveTheme(profile?.theme_preference) ?? 'light',
    selectTheme,
    themeOptions: THEME_OPTIONS,
  }
}
