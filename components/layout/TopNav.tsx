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
  { label: 'Circles', href: '/circles', accent: 'circles' },
] as const

const ACCENT_CLASSES: Record<string, string> = {
  faith:   'bg-faith-light text-faith-text',
  tasks:   'bg-tasks-light text-tasks-text',
  fitness: 'bg-fitness-light text-fitness-text',
  circles: 'bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-200',
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
      <div className="flex h-[68px] items-center justify-between px-4 sm:h-[76px] sm:px-6">
        <div className="flex min-w-0 items-center gap-3 sm:gap-5">
          <Link href="/faith" className="flex shrink-0 items-center gap-3.5 sm:gap-4">
            <Image
              src="/logo.png"
              alt=""
              width={56}
              height={56}
              className="h-12 w-12 shrink-0 rounded-full sm:h-14 sm:w-14"
              sizes="(max-width: 640px) 48px, 56px"
            />
            <div className="min-w-0">
              <p className="text-[15px] font-semibold tracking-tight text-ink-primary">
                Noor
              </p>
              <p className="text-[12px] uppercase tracking-[0.18em] text-ink-ghost">Light for your week</p>
            </div>
          </Link>

          <nav className="flex min-w-0 shrink gap-1 rounded-2xl border border-surface-border bg-surface-card p-1 shadow-card transition-shadow duration-300 ease-out">
            {NAV_ITEMS.map(item => {
              const active = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'rounded-[10px] px-3 py-1.5 text-[14px] transition-[transform,background-color,color,box-shadow] duration-200 ease-out active:scale-[0.985]',
                    active
                      ? cn('font-medium shadow-control', ACCENT_CLASSES[item.accent])
                      : 'text-ink-muted hover:text-ink-secondary hover:bg-surface-muted hover:shadow-control',
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
            'hidden rounded-full border px-3 py-1 text-[12px] font-medium shadow-control transition-[box-shadow,transform] duration-200 ease-out md:inline-flex',
            cloudSyncStatus === 'synced'
              ? 'border-faith-border bg-faith-light text-faith-text'
              : cloudSyncStatus === 'syncing'
              ? 'border-brand-200 bg-brand-50 text-brand-500'
              : cloudSyncStatus === 'error'
              ? 'border-fitness-border bg-fitness-light text-fitness-text'
              : 'border-surface-border bg-surface-card text-ink-ghost',
          )}>
            {syncLabel}
          </span>
          <ThemeToggle />
          <span className="rounded-[10px] border border-surface-border bg-surface-card px-3 py-1 text-[13px] text-ink-faint shadow-control transition-shadow duration-200 ease-out">
            {today || '\u00A0'}
          </span>
          <MenuRoot>
            <MenuTrigger asChild>
              <button
                type="button"
                className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-surface-border bg-brand-100 text-[12px] font-semibold text-brand-400 shadow-control outline-none transition-[transform,box-shadow] duration-200 ease-out hover:shadow-control-hover active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-brand-300"
              >
                {initial}
              </button>
            </MenuTrigger>
            <MenuContent align="end">
              <div className="px-3 py-2">
                <p className="text-[13px] font-semibold text-ink-primary">{displayName}</p>
                <p className="mt-0.5 text-[12px] text-ink-ghost">{user?.email || 'No email'}</p>
                <p className="mt-1 text-[12px] text-brand-400">{syncLabel}</p>
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
