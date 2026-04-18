'use client'

import { cn } from '@/lib/utils'

interface PageHeroProps {
  eyebrow?: string
  title: string
  description: string
  actions?: React.ReactNode
  className?: string
}

export function PageHero({ eyebrow, title, description, actions, className }: PageHeroProps) {
  return (
    <div className={cn('rounded-[28px] border border-surface-border bg-surface-card p-6 shadow-card', className)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          {eyebrow && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-400">{eyebrow}</p>
          )}
          <h1 className="mt-2 text-[30px] font-semibold tracking-tight text-ink-primary">{title}</h1>
          <p className="mt-2 max-w-2xl text-[14px] leading-6 text-ink-secondary">{description}</p>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}

interface MetricCardProps {
  label: string
  value: string | number
  hint?: string
  tone?: 'brand' | 'faith' | 'tasks' | 'fitness' | 'family' | 'neutral'
}

const TONE_STYLES: Record<NonNullable<MetricCardProps['tone']>, string> = {
  brand: 'border-brand-200 bg-brand-50 text-brand-500',
  faith: 'border-faith-border bg-faith-light text-faith-text',
  tasks: 'border-tasks-border bg-tasks-light text-tasks-text',
  fitness: 'border-fitness-border bg-fitness-light text-fitness-text',
  family: 'border-family-border bg-family-light text-family-text',
  neutral: 'border-surface-border bg-surface-raised text-ink-primary',
}

export function MetricCard({ label, value, hint, tone = 'neutral' }: MetricCardProps) {
  return (
    <div className={cn('rounded-2xl border p-4', TONE_STYLES[tone])}>
      <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-ink-ghost">{label}</p>
      <p className="mt-3 text-[28px] font-semibold leading-none">{value}</p>
      {hint && <p className="mt-2 text-[13px] text-ink-secondary">{hint}</p>}
    </div>
  )
}

export function MetricGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('grid gap-3 md:grid-cols-2 xl:grid-cols-4', className)}>{children}</div>
}

export function DashboardPanel({
  title,
  description,
  action,
  children,
  className,
  /** Fill remaining panel height so nested lists can scroll (grid twin columns stay aligned). */
  stretchContent,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  stretchContent?: boolean
}) {
  return (
    <section
      className={cn(
        'rounded-[26px] border border-surface-border bg-surface-card p-5 shadow-card',
        stretchContent && 'flex min-h-0 flex-col',
        className,
      )}
    >
      <div className={cn('mb-4 flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between', stretchContent && 'shrink-0')}>
        <div>
          <h2 className="text-[16px] font-semibold text-ink-primary">{title}</h2>
          {description && <p className="mt-0.5 text-[12px] text-ink-ghost">{description}</p>}
        </div>
        {action}
      </div>
      {stretchContent ? <div className="flex min-h-0 flex-1 flex-col">{children}</div> : children}
    </section>
  )
}

export function DashboardShellGrid({
  main,
  side,
  className,
}: {
  main: React.ReactNode
  side?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]', className)}>
      <div className="space-y-5">{main}</div>
      {side ? <div className="space-y-5">{side}</div> : null}
    </div>
  )
}

export function CommandCenterGrid({
  left,
  center,
  right,
  className,
}: {
  left: React.ReactNode
  center: React.ReactNode
  right: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'grid gap-5 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_260px] xl:grid-cols-[200px_minmax(0,1fr)_260px]',
        className,
      )}
    >
      <aside className="hidden xl:block">
        <div className="sticky top-20 space-y-4">{left}</div>
      </aside>
      <div className="space-y-5">{center}</div>
      <aside className="space-y-4">{right}</aside>
    </div>
  )
}

export function EmptyStateCard({
  title,
  description,
  action,
  className,
}: {
  title: string
  description: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('rounded-2xl border border-dashed border-surface-border bg-surface-raised/40 px-5 py-8 text-center', className)}>
      <p className="text-[14px] font-medium text-ink-primary">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-[14px] leading-6 text-ink-ghost">{description}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  )
}

export function ProductSectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-ink-ghost">{children}</p>
}
