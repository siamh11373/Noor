'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
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

function RouteTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const segment = pathname?.split('/')[1] ?? 'root'
  return (
    <div key={segment} className="route-transition">
      {children}
    </div>
  )
}

function HyacinthOverlay() {
  return (
    <div aria-hidden className="theme-hyacinth-overlay">
      <Image
        src="/florals/pink-hyacinth.png"
        alt=""
        aria-hidden
        width={1588}
        height={2667}
        className="theme-hyacinth-wing theme-hyacinth-wing-left"
        priority={false}
      />
      <Image
        src="/florals/pink-hyacinth.png"
        alt=""
        aria-hidden
        width={1588}
        height={2667}
        className="theme-hyacinth-wing theme-hyacinth-wing-right"
        priority={false}
      />
      <Image
        src="/florals/pink-hyacinth-tall.png"
        alt=""
        aria-hidden
        width={1588}
        height={1588}
        className="theme-hyacinth-wing theme-hyacinth-wing-bottom-left"
        priority={false}
      />
      <Image
        src="/florals/pink-hyacinth.png"
        alt=""
        aria-hidden
        width={1588}
        height={2667}
        className="theme-hyacinth-wing theme-hyacinth-wing-bottom-right"
        priority={false}
      />
      <Image
        src="/florals/pink-lily.png"
        alt=""
        aria-hidden
        width={1588}
        height={1588}
        className="theme-hyacinth-wing theme-lily-top-right"
        priority={false}
      />
      <Image
        src="/florals/pink-hyacinth-tall.png"
        alt=""
        aria-hidden
        width={1588}
        height={1588}
        className="theme-hyacinth-wing theme-hyacinth-top-left"
        priority={false}
      />
      <Image
        src="/florals/pink-lily.png"
        alt=""
        aria-hidden
        width={1588}
        height={1588}
        className="theme-hyacinth-wing theme-lily-bottom-right"
        priority={false}
      />
      <Image
        src="/florals/pink-lily-2.png"
        alt=""
        aria-hidden
        width={1588}
        height={1588}
        className="theme-hyacinth-wing theme-lily-top-center"
        priority={false}
      />
    </div>
  )
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
    <div className="theme-shell-canvas min-h-screen bg-surface-bg">
      <HyacinthOverlay />
      <div className="relative z-10">
        <TopNav />
        <RouteTransition>{children}</RouteTransition>
        <ShellShortcuts ready={shellReady} />
        <ShortcutsHelpDialog />
        <TimerDialog />
        <ToastHost />
      </div>
    </div>
  )
}
