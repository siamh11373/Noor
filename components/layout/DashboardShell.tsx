'use client'

import { useEffect, useState } from 'react'
import { TopNav } from '@/components/layout/TopNav'
import { useSalahStore } from '@/lib/store'

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const authStatus = useSalahStore(state => state.authStatus)
  const dataHydrated = useSalahStore(state => state.dataHydrated)

  useEffect(() => {
    setReady(true)
  }, [])

  if (!ready || authStatus === 'loading' || !dataHydrated) {
    return (
      <div className="min-h-screen bg-surface-bg">
        <div className="sticky top-0 z-30 border-b border-surface-border bg-surface-bg/92 backdrop-blur">
          <div className="flex h-[68px] items-center justify-between px-4 sm:h-[76px] sm:px-6">
            <div className="flex min-w-0 items-center gap-3 sm:gap-5">
              <div className="h-12 w-12 shrink-0 rounded-full bg-surface-muted sm:h-14 sm:w-14" />
              <div className="flex gap-2">
                {Array.from({ length: 4 }, (_, index) => (
                  <div key={index} className="h-8 w-16 rounded-md bg-surface-muted" />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="h-[30px] w-[30px] rounded-md bg-surface-muted" />
              <div className="h-8 w-24 rounded-md bg-surface-muted" />
              <div className="h-[30px] w-[30px] rounded-full bg-surface-muted" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-bg">
      <TopNav />
      {children}
    </div>
  )
}
