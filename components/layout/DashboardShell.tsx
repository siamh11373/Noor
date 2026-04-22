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

  useEffect(() => {
    setReady(true)
  }, [])

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
