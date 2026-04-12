'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { usePathname } from 'next/navigation'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { MenuContent, MenuItem, MenuRoot, MenuSeparator, MenuTrigger } from '@/components/ui/dropdown-menu'
import { useAuth } from '@/components/providers/AuthProvider'
import { useSalahStore } from '@/lib/store'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { label: 'Faith',   href: '/faith',   accent: 'faith' },
  { label: 'Tasks',   href: '/tasks',   accent: 'tasks' },
  { label: 'Fitness', href: '/fitness', accent: 'fitness' },
  { label: 'Family',  href: '/family',  accent: 'family' },
] as const

const ACCENT_CLASSES: Record<string, string> = {
  faith:   'bg-faith-light text-faith-text',
  tasks:   'bg-tasks-light text-tasks-text',
  fitness: 'bg-fitness-light text-fitness-text',
  family:  'bg-family-light text-family-text',
}

export function TopNav() {
  const router = useRouter()
  const pathname = usePathname()
  const [today, setToday] = useState('')
  const { user, profile, signOut } = useAuth()
  const cloudSyncStatus = useSalahStore(state => state.cloudSyncStatus)
  const lastSyncedAt = useSalahStore(state => state.lastSyncedAt)

  useEffect(() => {
    setToday(new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }))
  }, [])

  const displayName = profile?.display_name?.trim() || user?.email?.split('@')[0] || 'Account'
  const initial = displayName[0]?.toUpperCase() || 'A'
  const syncLabel = cloudSyncStatus === 'synced'
    ? lastSyncedAt
      ? `Synced ${new Date(lastSyncedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
      : 'Synced'
    : cloudSyncStatus === 'syncing'
    ? 'Syncing…'
    : cloudSyncStatus === 'error'
    ? 'Sync error'
    : 'Cloud idle'

  return (
    <header className="sticky top-0 z-30 border-b border-surface-border bg-surface-bg/92 backdrop-blur">
      <div className="flex h-[60px] items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Link href="/faith" className="flex items-center gap-3">
            <Image src="/logo.png" alt="" width={36} height={36} className="rounded-full" />
            <div>
              <p className="text-[15px] font-semibold tracking-tight text-ink-primary">
                Noor
              </p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-ink-ghost">Light for your week</p>
            </div>
          </Link>

          <nav className="flex gap-1 rounded-2xl border border-surface-border bg-surface-card p-1 shadow-card">
            {NAV_ITEMS.map(item => {
              const active = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-[13px] transition-all',
                    active
                      ? cn('font-medium', ACCENT_CLASSES[item.accent])
                      : 'text-ink-muted hover:text-ink-secondary hover:bg-surface-muted'
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Right: date + avatar */}
        <div className="flex items-center gap-2.5">
          <span className={cn(
            'hidden rounded-full border px-3 py-1 text-[11px] font-medium md:inline-flex',
            cloudSyncStatus === 'synced'
              ? 'border-faith-border bg-faith-light text-faith-text'
              : cloudSyncStatus === 'syncing'
              ? 'border-brand-200 bg-brand-50 text-brand-500'
              : cloudSyncStatus === 'error'
              ? 'border-fitness-border bg-fitness-light text-fitness-text'
              : 'border-surface-border bg-surface-card text-ink-ghost'
          )}>
            {syncLabel}
          </span>
          <ThemeToggle />
          <span className="rounded-md border border-surface-border bg-surface-card px-3 py-1 text-[12px] text-ink-faint">
            {today || '\u00A0'}
          </span>
          <MenuRoot>
            <MenuTrigger asChild>
              <button className="w-[30px] h-[30px] rounded-full bg-brand-100 border border-surface-border flex items-center justify-center text-[11px] font-semibold text-brand-400 outline-none transition-transform hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-brand-300">
                {initial}
              </button>
            </MenuTrigger>
            <MenuContent align="end">
              <div className="px-3 py-2">
                <p className="text-[13px] font-semibold text-ink-primary">{displayName}</p>
                <p className="mt-0.5 text-[11px] text-ink-ghost">{user?.email || 'No email'}</p>
                <p className="mt-1 text-[11px] text-brand-400">{syncLabel}</p>
              </div>
              <MenuSeparator className="my-1 h-px bg-surface-border" />
              <MenuItem onSelect={() => router.push('/account')}>Account settings</MenuItem>
              <MenuItem onSelect={() => router.push('/reset-password')}>Reset password</MenuItem>
              <MenuSeparator className="my-1 h-px bg-surface-border" />
              <MenuItem
                onSelect={() => {
                  void signOut().then(() => router.push('/login'))
                }}
                className="text-fitness-text focus:text-fitness-text"
              >
                Sign out
              </MenuItem>
            </MenuContent>
          </MenuRoot>
        </div>

      </div>
    </header>
  )
}
