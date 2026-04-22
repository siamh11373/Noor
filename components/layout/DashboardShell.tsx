'use client'

import { useEffect, useState } from 'react'
import { TopNav } from '@/components/layout/TopNav'
import { AppLoadingScreen } from '@/components/layout/AppLoadingScreen'
import { useSalahStore } from '@/lib/store'
import { ShortcutsHelpDialog } from '@/components/ui/shortcuts-help'
import { ToastHost } from '@/components/ui/toast-host'
import { TimerDialog } from '@/components/timer/TimerDialog'
import { useGlobalShortcuts } from '@/hooks/useGlobalShortcuts'
import { useHistoryShortcuts } from '@/hooks/useHistoryShortcuts'
import { useFirstVisitHint } from '@/hooks/useFirstVisitHint'
import { useTimerEngine } from '@/hooks/useTimer'
import { toast } from '@/components/ui/toast-host'

function ShellShortcuts({ ready }: { ready: boolean }) {
  useGlobalShortcuts()
  useHistoryShortcuts()
  useFirstVisitHint(ready)
  useTimerEngine()
  return null
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const authStatus = useSalahStore(state => state.authStatus)
  const dataHydrated = useSalahStore(state => state.dataHydrated)
  const profile = useSalahStore(state => state.currentProfile)

  useEffect(() => {
    setReady(true)
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (!params.has('welcomed')) return

    // Strip the param so a page refresh doesn't re-trigger the toast
    const clean = new URL(window.location.href)
    clean.searchParams.delete('welcomed')
    window.history.replaceState({}, '', clean.toString())

    const firstName = profile?.display_name?.trim().split(' ')[0]
    const name = firstName ? `, ${firstName}` : ''
    const id = setTimeout(() => {
      toast.show(`Welcome back${name}!`, { tone: 'success', durationMs: 3500 })
    }, 400)
    return () => clearTimeout(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally mount-only — param is stripped immediately

  const shellReady = ready && authStatus !== 'loading' && dataHydrated

  if (!shellReady) {
    return <AppLoadingScreen />
  }

  return (
    <div className="min-h-screen bg-surface-bg">
      <TopNav />
      {children}
      <ShellShortcuts ready={shellReady} />
      <ShortcutsHelpDialog />
      <TimerDialog />
      <ToastHost />
    </div>
  )
}
