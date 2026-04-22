'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { usePathname } from 'next/navigation'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { MenuContent, MenuItem, MenuRoot, MenuSeparator, MenuTrigger } from '@/components/ui/dropdown-menu'
import { useAuth } from '@/components/providers/AuthProvider'
import { useSalahStore } from '@/lib/store'
import { useShortcutsUi } from '@/lib/shortcuts'
import { Kbd } from '@/components/ui/kbd'
import { TimerRunningPill } from '@/components/timer/TimerRunningPill'
import { cn } from '@/lib/utils'
import { AlertCircle, CheckCircle2, CheckSquare, Dumbbell, Moon, RefreshCw, Users } from 'lucide-react'

const NAV_ITEMS = [
  { label: 'Faith',   href: '/faith',   accent: 'faith',   icon: Moon },
  { label: 'Tasks',   href: '/tasks',   accent: 'tasks',   icon: CheckSquare },
  { label: 'Fitness', href: '/fitness', accent: 'fitness', icon: Dumbbell },
  { label: 'Circles', href: '/circles', accent: 'circles', icon: Users },
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
  const { user, profile, signOut } = useAuth()
  const cloudSyncStatus = useSalahStore(state => state.cloudSyncStatus)
  const lastSyncedAt = useSalahStore(state => state.lastSyncedAt)
  const openShortcutsHelp = useShortcutsUi(state => state.setHelpOpen)

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
      <div className="relative flex h-[72px] items-center justify-between px-5 sm:h-[80px] sm:px-6">
        {/* Left: logo only */}
        <Link href="/faith" className="flex shrink-0 items-center gap-3">
          <Image
            src="/logo.png"
            alt=""
            width={64}
            height={64}
            className="h-14 w-14 shrink-0 rounded-full sm:h-16 sm:w-16"
            sizes="(max-width: 640px) 56px, 64px"
          />
          <p className="hidden text-[22px] font-semibold tracking-tight text-ink-primary sm:block">
            Noor
          </p>
        </Link>

        {/* Center: absolutely positioned nav pill */}
        <nav className="absolute left-1/2 -translate-x-1/2 flex gap-1 rounded-2xl border border-surface-border bg-surface-card p-1.5 shadow-card transition-shadow duration-300 ease-out">
          {NAV_ITEMS.map(item => {
            const active = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 rounded-[10px] px-4 py-2 text-[15px] transition-[transform,background-color,color,box-shadow] duration-200 ease-out active:scale-[0.985]',
                  active
                    ? cn('font-medium shadow-control', ACCENT_CLASSES[item.accent])
                    : 'text-ink-muted hover:bg-surface-muted hover:text-ink-secondary hover:shadow-control',
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" aria-hidden />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Right: sync + theme + avatar */}
        <div className="flex items-center gap-2.5">
          <TimerRunningPill />
          <button
            type="button"
            title={syncLabel}
            className="hidden items-center justify-center rounded-full p-2 text-ink-muted transition-colors hover:bg-surface-muted md:flex"
          >
            {cloudSyncStatus === 'synced' && <CheckCircle2 className="h-5 w-5 text-faith-text" />}
            {cloudSyncStatus === 'syncing' && <RefreshCw className="h-5 w-5 animate-spin text-brand-500" />}
            {cloudSyncStatus === 'error' && <AlertCircle className="h-5 w-5 text-fitness-text" />}
            {cloudSyncStatus === 'idle' && <RefreshCw className="h-5 w-5 text-ink-ghost" />}
          </button>
          <ThemeToggle />
          <MenuRoot>
            <MenuTrigger asChild>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-surface-border bg-brand-100 text-[14px] font-semibold text-brand-400 shadow-control outline-none transition-[transform,box-shadow] duration-200 ease-out hover:shadow-control-hover active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-brand-300"
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
              <MenuItem
                onSelect={() => openShortcutsHelp(true)}
                className="flex items-center gap-3"
              >
                <span>Keyboard shortcuts</span>
                <Kbd keys={['?']} className="ml-auto" />
              </MenuItem>
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
