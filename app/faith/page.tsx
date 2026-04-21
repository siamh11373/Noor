'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpenText } from 'lucide-react'
import { toDateKey } from '@/lib/date'
import { useSalahStore, mondayStr } from '@/lib/store'
import { usePrayerTimes } from '@/hooks/usePrayerTimes'
import { useWeeklyScore, useScoreHistory, useScoreHistoryWithKeys } from '@/hooks/useWeeklyScore'
import { getWeekDateStrings, scoreLabel, calculateWeeklyScoreForWeek } from '@/lib/score'
import { PRAYER_ORDER } from '@/lib/prayers'
import {
  CommandCenterGrid,
  DashboardPanel,
  ProgressBar,
  ScoreRing,
} from '@/components/ui'
import { TasksForToday } from '@/components/faith/TasksForToday'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useFaithShortcuts } from '@/hooks/useFaithShortcuts'
import type { PillarScores } from '@/types'

/* ═══════════════════════════════════════════════════════════════════════════════
   LEFT SIDEBAR PIECES
   ═══════════════════════════════════════════════════════════════════════════════ */

const MODULES = [
  { label: 'Faith', href: '/faith', key: 'faith' as keyof PillarScores, cls: 'bg-faith-light text-faith-text' },
  { label: 'Tasks today', href: '/tasks', key: 'career' as keyof PillarScores, cls: 'bg-tasks-light text-tasks-text' },
  { label: 'Fitness', href: '/fitness', key: 'fitness' as keyof PillarScores, cls: 'bg-fitness-light text-fitness-text' },
  {
    label: 'Circles',
    href: '/circles',
    key: 'family' as keyof PillarScores,
    cls: 'bg-family-light text-family-text',
    title: 'Family pillar score · pairing & groups on Circles',
  },
] as const

function ModuleNav({ pillars }: { pillars: PillarScores }) {
  const pathname = usePathname()
  const calendarTasks = useSalahStore((s) => s.calendarTasks)
  const todayStr = toDateKey(new Date())
  const tasksTodayCount = useMemo(() => {
    const list = calendarTasks.filter((t) => t.date === todayStr)
    return {
      done: list.filter((t) => t.completed).length,
      total: list.length,
    }
  }, [calendarTasks, todayStr])

  return (
    <div className="space-y-2">
      {MODULES.map((m) => {
        const active = pathname.startsWith(m.href)
        const isTasks = m.key === 'career'
        return (
          <Link
            key={m.href}
            href={m.href}
            title={'title' in m ? m.title : undefined}
            className={cn(
              'flex min-h-[3rem] items-center justify-between rounded-xl border px-4 py-3.5 transition-colors',
              active
                ? 'border-brand-200 bg-brand-50'
                : 'border-surface-border bg-surface-card hover:bg-surface-raised',
            )}
          >
            <span className={cn('text-[15px] leading-tight', active ? 'font-medium text-brand-500' : 'text-ink-secondary')}>
              {m.label}
            </span>
            {isTasks ? (
              <span
                className={cn(
                  'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold tabular-nums tracking-tight',
                  m.cls,
                )}
              >
                {tasksTodayCount.done} / {tasksTodayCount.total}
              </span>
            ) : (
              <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold tabular-nums', m.cls)}>
                {pillars[m.key]}
              </span>
            )}
          </Link>
        )
      })}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   CENTER — PRAYER CHECK-IN (hero)
   ═══════════════════════════════════════════════════════════════════════════════ */

function PrayerButtons() {
  const { getDailyLog, togglePrayer } = useSalahStore()
  const { prayerTimes, nextPrayer } = usePrayerTimes()
  const log = getDailyLog()

  return (
    <div className="grid grid-cols-5 gap-2.5">
      {PRAYER_ORDER.map((name) => {
        const pt = prayerTimes.find((p) => p.name === name)
        const prayed = log.prayers[name]
        const isNext = nextPrayer?.name === name

        return (
          <button
            key={name}
            onClick={() => togglePrayer(name)}
            className={cn(
              'relative flex flex-col items-center py-3.5 px-2 rounded-xl border-[1.5px] transition-all active:scale-[.97]',
              prayed
                ? 'bg-faith-light border-faith-border'
                : isNext
                  ? 'bg-brand-50 border-brand-300'
                  : 'bg-surface-card border-surface-border hover:border-ink-ghost',
            )}
          >
            {isNext && !prayed && (
              <span className="absolute -top-px left-1/2 -translate-x-1/2 bg-brand-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-b-md tracking-wide whitespace-nowrap">
                NEXT {pt ? `· ${pt.formattedTime}` : ''}
              </span>
            )}
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center mb-2 border-2 transition-all',
                prayed
                  ? 'bg-faith border-faith'
                  : isNext
                    ? 'border-brand-300'
                    : 'border-surface-border',
              )}
            >
              {prayed && (
                <svg width="11" height="13" viewBox="0 0 11 13" fill="none">
                  <path d="M2 6.5l2.5 2.5 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span className={cn('text-[13px] font-semibold mb-0.5', prayed ? 'text-faith-text' : isNext ? 'text-brand-400' : 'text-ink-secondary')}>
              {name.charAt(0).toUpperCase() + name.slice(1)}
            </span>
            <span className="text-[11px] text-ink-ghost">{pt?.formattedTime ?? '--:--'}</span>
          </button>
        )
      })}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   WEEK REVIEW DRILLDOWN — pillar chips (same keys as ModuleNav; not shown in center)
   ═══════════════════════════════════════════════════════════════════════════════ */

const OS_ITEMS = [
  { label: 'Faith', key: 'faith' as keyof PillarScores, hint: 'Prayer completion', badge: 'bg-faith-light text-faith-text' },
  { label: 'Tasks', key: 'career' as keyof PillarScores, hint: 'Goals completed', badge: 'bg-tasks-light text-tasks-text' },
  { label: 'Fitness', key: 'fitness' as keyof PillarScores, hint: 'Sessions logged', badge: 'bg-fitness-light text-fitness-text' },
  { label: 'Family', key: 'family' as keyof PillarScores, hint: 'Touchpoints captured', badge: 'bg-family-light text-family-text' },
] as const

/* ═══════════════════════════════════════════════════════════════════════════════
   CENTER — PRAYER HEAT MAP
   ═══════════════════════════════════════════════════════════════════════════════ */

function PrayerHeatMap() {
  const { dailyLogs } = useSalahStore()
  const dates = getWeekDateStrings()
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const todayStr = toDateKey(new Date())
  const todayIdx = dates.indexOf(todayStr)

  return (
    <div>
      <div className="grid" style={{ gridTemplateColumns: '36px repeat(7, 1fr)', gap: '3px', alignItems: 'center' }}>
        <div />
        {days.map((d, i) => (
          <div key={i} className={cn('text-center text-[11px] pb-1', i === todayIdx ? 'text-brand-400 font-semibold' : 'text-ink-ghost')}>
            {d}
          </div>
        ))}
        {PRAYER_ORDER.map((prayer) => (
          <div key={prayer} className="contents">
            <div className="text-[11px] text-ink-ghost text-right pr-1.5">
              {prayer.charAt(0).toUpperCase() + prayer.slice(1)}
            </div>
            {dates.map((date, i) => {
              const prayed = dailyLogs[date]?.prayers[prayer]
              const isFuture = date > todayStr
              return (
                <div
                  key={`${prayer}-${i}`}
                  className="aspect-square rounded-sm"
                  style={{
                    background: prayed ? 'var(--chart-success)' : isFuture ? 'rgb(var(--surface-raised))' : 'var(--chart-track)',
                    border: isFuture ? '1px solid rgb(var(--surface-border))' : undefined,
                  }}
                />
              )
            })}
          </div>
        ))}
      </div>
      <div className="flex gap-3 mt-2.5">
        {[
          { color: 'var(--chart-success)', label: 'Prayed', bordered: false },
          { color: 'var(--chart-track)', label: 'Missed', bordered: true },
        ].map(({ color, label, bordered }) => (
          <div key={label} className="flex items-center gap-1.5 text-[11px] text-ink-ghost">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: color, border: bordered ? '1px solid rgb(var(--surface-border))' : undefined }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   CENTER — QURAN LOG
   ═══════════════════════════════════════════════════════════════════════════════ */

function QuranLog() {
  const { getDailyLog, addQuranEntry } = useSalahStore()
  const [text, setText] = useState('')

  const thisWeekLogs = getWeekDateStrings()
    .flatMap((date) => (getDailyLog(date)?.quranEntries ?? []).map((e) => ({ ...e, logDate: date })))
    .slice(-6)

  function handleAdd() {
    if (!text.trim()) return
    addQuranEntry({ text: text.trim(), minutes: 0, date: toDateKey(new Date()) })
    setText('')
  }

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <input
          id="faith-quran-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="What did you read? (e.g. Al-Baqarah p.28–31)"
          className="input-base"
        />
        <button onClick={handleAdd} className="btn-primary px-3.5">
          +
        </button>
      </div>
      <div className="space-y-1.5">
        {thisWeekLogs.length === 0 ? (
          <div className="text-center py-6 text-[12px] text-ink-ghost border border-dashed border-surface-border rounded-xl">
            No Quran entries this week yet
          </div>
        ) : (
          thisWeekLogs.reverse().map((entry) => (
            <div key={entry.id} className="flex items-start gap-2.5 px-3 py-2.5 bg-surface-raised rounded-lg border border-surface-border">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-400 flex-shrink-0 mt-1.5" />
              <div className="flex-1 text-[12px] text-ink-secondary">{entry.text}</div>
              <span className="text-[10px] text-ink-ghost">{entry.logDate}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   RIGHT SIDEBAR — ACCOUNTABILITY
   ═══════════════════════════════════════════════════════════════════════════════ */

function AccountabilityPanel() {
  const peers = useSalahStore((s) => s.accountabilityPeers)

  if (!peers.length) {
    return (
      <p className="text-center py-4 text-[12px] text-ink-ghost">
        Invite a partner from the Family page to see score-only updates here.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {peers.map((peer) => (
        <div key={peer.id} className="flex items-center justify-between rounded-xl border border-surface-border bg-surface-raised px-3 py-2.5">
          <div>
            <span className="text-[13px] font-medium text-ink-primary">{peer.displayName}</span>
            {peer.trendDelta !== 0 && (
              <p className="text-[10px] text-ink-ghost">
                {peer.trendDelta > 0 ? '+' : ''}
                {peer.trendDelta} this week
              </p>
            )}
          </div>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-faith-light text-[13px] font-bold text-faith-text">
            {peer.score ?? '—'}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   RIGHT SIDEBAR — DHIKR COUNTER
   ═══════════════════════════════════════════════════════════════════════════════ */

function DhikrRow({
  label,
  count,
  onIncrement,
  onSetCount,
  onDelete,
}: {
  label: string
  count: number
  onIncrement: () => void
  onSetCount: (n: number) => void
  onDelete?: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  function startEdit() {
    setDraft(String(count))
    setEditing(true)
  }

  function commitEdit() {
    const n = parseInt(draft, 10)
    if (!isNaN(n)) onSetCount(n)
    setEditing(false)
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-surface-border bg-surface-raised px-3 py-2.5">
      <span className="min-w-0 flex-1 truncate text-[13px] text-ink-secondary">{label}</span>
      <div className="flex shrink-0 items-center gap-1.5">
        {editing ? (
          <input
            autoFocus
            type="number"
            min="0"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(false) }}
            className="w-16 rounded-lg border border-brand-300 bg-surface-card px-2 py-1 text-center text-[13px] font-semibold text-brand-400 outline-none focus:ring-1 focus:ring-brand-400/30"
          />
        ) : (
          <button
            onClick={startEdit}
            title="Tap to edit count"
            className="w-10 text-right text-[14px] font-semibold text-brand-400 transition-colors hover:text-brand-500"
          >
            {count}
          </button>
        )}
        <button
          onClick={onIncrement}
          className="flex h-6 w-6 items-center justify-center rounded-full border border-brand-200 bg-brand-50 text-brand-400 transition-colors hover:bg-brand-100"
        >
          +
        </button>
        {onDelete && (
          <button
            onClick={onDelete}
            title="Remove"
            className="flex h-6 w-6 items-center justify-center rounded-full text-ink-ghost transition-colors hover:bg-surface-muted hover:text-ink-muted"
          >
            ×
          </button>
        )}
      </div>
    </div>
  )
}

function DhikrCounter() {
  const { dhikr, customDhikr, incrementDhikr, setDhikrCount, resetDhikr, addCustomDhikr, setCustomDhikrCount, deleteCustomDhikr } = useSalahStore()
  const [newLabel, setNewLabel] = useState('')

  const builtIn = [
    { key: 'subhanAllah' as const, label: 'SubhanAllah' },
    { key: 'alhamdulillah' as const, label: 'Alhamdulillah' },
    { key: 'allahuAkbar' as const, label: 'Allahu Akbar' },
  ]

  function handleAdd() {
    if (!newLabel.trim()) return
    addCustomDhikr(newLabel)
    setNewLabel('')
  }

  return (
    <div className="space-y-2">
      {builtIn.map(({ key, label }) => (
        <DhikrRow
          key={key}
          label={label}
          count={dhikr[key]}
          onIncrement={() => incrementDhikr(key)}
          onSetCount={n => setDhikrCount(key, n)}
        />
      ))}

      {customDhikr.map(item => (
        <DhikrRow
          key={item.id}
          label={item.label}
          count={item.count}
          onIncrement={() => setCustomDhikrCount(item.id, item.count + 1)}
          onSetCount={n => setCustomDhikrCount(item.id, n)}
          onDelete={() => deleteCustomDhikr(item.id)}
        />
      ))}

      <div className="flex gap-1.5 pt-1">
        <input
          value={newLabel}
          onChange={e => setNewLabel(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Add custom dhikr…"
          className="input-base flex-1 py-1.5 text-[13px]"
        />
        <button
          onClick={handleAdd}
          disabled={!newLabel.trim()}
          className="btn-primary px-3 py-1.5 text-[13px] disabled:opacity-40"
        >
          Add
        </button>
      </div>

      <button onClick={resetDhikr} className="w-full py-1 text-[11px] text-ink-ghost transition-colors hover:text-ink-muted">
        Reset all
      </button>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SIDEBAR CARD (compact wrapper for sidebar panels)
   ═══════════════════════════════════════════════════════════════════════════════ */

function SidebarCard({
  title,
  description,
  children,
  className,
}: {
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('rounded-2xl border border-surface-border bg-surface-card p-4', className)}>
      {title && (
        <div className="mb-3">
          <h3 className="text-[15px] font-semibold text-ink-primary">{title}</h3>
          {description && <p className="mt-0.5 text-[11px] text-ink-ghost">{description}</p>}
        </div>
      )}
      {children}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   RIGHT SIDEBAR — WEEK HISTORY DRILL-DOWN
   ═══════════════════════════════════════════════════════════════════════════════ */

function WeekHistoryPanel({ week, onClose }: { week: string; onClose: () => void }) {
  const { dailyLogs, weeklyRecords } = useSalahStore()
  const dates = getWeekDateStrings(week)
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const record = weeklyRecords[week]
  const weekScore = calculateWeeklyScoreForWeek({ dailyLogs, weeklyRecords }, week)

  const rangeLabel = `${new Date(week + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(dates.at(-1)! + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`

  const goals = record?.goals ?? []
  const quranEntries = dates.flatMap((d) => (dailyLogs[d]?.quranEntries ?? []).map((e) => ({ ...e, logDate: d })))
  const fitnessEntries = dates.flatMap((d) => (dailyLogs[d]?.fitnessEntries ?? []).map((e) => ({ ...e, logDate: d })))
  const familyEntries = dates.flatMap((d) => (dailyLogs[d]?.familyEntries ?? []).map((e) => ({ ...e, logDate: d })))

  return (
    <SidebarCard className="border-brand-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <ScoreRing score={weekScore.total} size={52} strokeWidth={5} />
          <div>
            <p className="text-[13px] font-semibold text-ink-primary">{rangeLabel}</p>
            <p className="text-[11px] text-ink-ghost">{scoreLabel(weekScore.total)}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-ink-ghost hover:text-ink-muted transition-colors p-1" aria-label="Close">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M10.5 3.5L3.5 10.5M3.5 3.5l7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Pillar scores */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {OS_ITEMS.map((item) => (
          <div key={item.key} className="flex items-center gap-2 rounded-lg bg-surface-raised px-2.5 py-2 border border-surface-border">
            <span className={cn('rounded-full px-2 py-0.5 text-[9px] font-bold', item.badge)}>{item.label}</span>
            <span className="text-[13px] font-semibold text-ink-primary">{weekScore.pillars[item.key]}</span>
          </div>
        ))}
      </div>

      {/* Prayer grid */}
      <div className="mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-ghost mb-2">Prayers</p>
        <div className="grid" style={{ gridTemplateColumns: '32px repeat(7, 1fr)', gap: '2px', alignItems: 'center' }}>
          <div />
          {days.map((d, i) => (
            <div key={i} className="text-center text-[8px] text-ink-ghost pb-0.5">{d}</div>
          ))}
          {PRAYER_ORDER.map((prayer) => (
            <div key={prayer} className="contents">
              <div className="text-[8px] text-ink-ghost text-right pr-1">
                {prayer.charAt(0).toUpperCase() + prayer.slice(1, 3)}
              </div>
              {dates.map((date, i) => {
                const prayed = dailyLogs[date]?.prayers[prayer]
                return (
                  <div
                    key={`${prayer}-${i}`}
                    className="aspect-square rounded-sm"
                    style={{ background: prayed ? 'var(--chart-success)' : 'var(--chart-track)' }}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Goals */}
      {goals.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-ghost mb-2">
            Goals ({goals.filter((g) => g.completed).length}/{goals.length})
          </p>
          <div className="space-y-1.5">
            {goals.map((goal) => (
              <div key={goal.id} className="flex items-start gap-2 text-[11px]">
                <span className={goal.completed ? 'text-faith' : 'text-ink-ghost'}>
                  {goal.completed ? '✓' : '○'}
                </span>
                <span className={goal.completed ? 'text-ink-secondary' : 'text-ink-muted'}>
                  {goal.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quran entries */}
      {quranEntries.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-ghost mb-2">
            Quran ({quranEntries.length})
          </p>
          <div className="space-y-1">
            {quranEntries.map((e) => (
              <p key={e.id} className="text-[11px] text-ink-secondary">{e.text}</p>
            ))}
          </div>
        </div>
      )}

      {/* Fitness entries */}
      {fitnessEntries.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-ghost mb-2">
            Fitness ({fitnessEntries.length} session{fitnessEntries.length !== 1 ? 's' : ''})
          </p>
          <div className="space-y-1">
            {fitnessEntries.map((e) => (
              <p key={e.id} className="text-[11px] text-ink-secondary">
                {e.type}{e.note ? ` — ${e.note}` : ''}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Family entries */}
      {familyEntries.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-ghost mb-2">
            Family ({familyEntries.length})
          </p>
          <div className="space-y-1">
            {familyEntries.map((e) => (
              <p key={e.id} className="text-[11px] text-ink-secondary">{e.text}</p>
            ))}
          </div>
        </div>
      )}

      {/* Empty state when no activity at all */}
      {!goals.length && !quranEntries.length && !fitnessEntries.length && !familyEntries.length && (
        <p className="text-center text-[11px] text-ink-ghost py-2">No activity logged this week.</p>
      )}
    </SidebarCard>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════════════════════ */

export default function FaithPage() {
  const { getWeeklyRecord, getDailyLog } = useSalahStore()
  const score = useWeeklyScore()
  const { nextPrayer, countdownLabel } = usePrayerTimes()
  const history = useScoreHistory(8)
  const { scores: trendScores, weekKeys: trendKeys } = useScoreHistoryWithKeys(8)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [dhikrOpen, setDhikrOpen] = useState(false)
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null)

  useFaithShortcuts({
    openFridayReview: () => setReviewOpen(true),
    openDhikrLog: () => setDhikrOpen(true),
  })

  const fridayReview = getWeeklyRecord().fridayReview
  const todayPrayers = Object.values(getDailyLog().prayers).filter(Boolean).length
  const quranMinutes = getWeekDateStrings().reduce(
    (total, date) => total + getDailyLog(date).quranEntries.reduce((sum, entry) => sum + entry.minutes, 0),
    0,
  )
  const weekRange = `${new Date(mondayStr() + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — ${new Date(getWeekDateStrings().at(-1)! + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`

  return (
    <div className="px-5 py-5 xl:px-6">
      <CommandCenterGrid
        /* ── LEFT SIDEBAR ── */
        left={
          <>
            {/* Weekly rhythm card */}
            <div className="rounded-2xl border border-surface-border bg-surface-card px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 border border-brand-200">
                  <BookOpenText className="h-4 w-4 text-brand-400" />
                </div>
                <p className="text-[14px] font-semibold text-ink-primary">Weekly rhythm</p>
              </div>
            </div>

            {/* Module nav */}
            <ModuleNav pillars={score.pillars} />

            {/* Target score */}
            <div className="rounded-2xl border border-surface-border bg-surface-card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-ghost">Score</p>
              <p className="mt-2 text-[32px] font-semibold tracking-tight text-ink-primary">
                {score.total} <span className="text-[17px] font-normal text-ink-ghost">/ 100</span>
              </p>
              <p className="mt-1 text-[12px] text-ink-secondary">{scoreLabel(score.total)}</p>
            </div>
          </>
        }
        /* ── CENTER ── */
        center={
          <>
            {/* Prayer check-in (hero) */}
            <DashboardPanel
              title="Prayer check-in"
              description="Mark each prayer as you complete it."
              action={
                <div className="flex gap-2">
                  <button onClick={() => setReviewOpen(true)} className="btn-secondary text-[12px] px-3 py-1.5">
                    {fridayReview ? 'Edit review' : 'Friday review'}
                  </button>
                  <button onClick={() => setDhikrOpen(true)} className="btn-primary text-[12px] px-3 py-1.5">
                    + Dhikr
                  </button>
                </div>
              }
            >
              <PrayerButtons />
            </DashboardPanel>

            <DashboardPanel
              stretchContent
              title="Daily tasks"
              description="Navigate between days to plan ahead or review."
              action={
                <Link href="/tasks" className="btn-secondary text-[12px] px-3 py-1.5 whitespace-nowrap">
                  Open Tasks
                </Link>
              }
            >
              <TasksForToday />
            </DashboardPanel>

            {/* Heat map + Quran (side by side) */}
            <div className="grid gap-5 lg:grid-cols-2">
              <DashboardPanel
                title="Prayer heat map"
                description="This week's prayer consistency."
              >
                <PrayerHeatMap />
              </DashboardPanel>

              <DashboardPanel
                title="Quran this week"
                description="Log what you read this week."
              >
                <QuranLog />
              </DashboardPanel>
            </div>
          </>
        }
        /* ── RIGHT SIDEBAR ── */
        right={
          <>
            {/* Weekly faith score */}
            <SidebarCard title="Weekly faith score" description={weekRange}>
              <div className="flex items-center gap-4">
                <ScoreRing score={score.total} size={86} />
                <div className="space-y-2 flex-1">
                  {([
                    ['Prayer', score.pillars.faith],
                    ['Quran', quranMinutes ? Math.min(Math.round((quranMinutes / 60) * 100), 100) : 0],
                    ['Dhikr', Math.min(Math.round(((history.at(-1) ?? 0) / 100) * 80), 100)],
                  ] as [string, number][]).map(([label, value]) => (
                    <div key={label} className="flex items-center gap-2">
                      <span className="w-10 text-[12px] text-ink-muted">{label}</span>
                      <ProgressBar value={value} color="bg-brand-400" className="flex-1" />
                      <span className="w-8 text-right text-[12px] font-medium text-ink-primary">{value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </SidebarCard>

            {/* Next prayer */}
            {nextPrayer && (
              <SidebarCard>
                <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-4 text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-400">
                    {nextPrayer.displayName} in
                  </p>
                  <p className="mt-2 text-[34px] font-semibold tracking-tight text-ink-primary">
                    {countdownLabel ?? '--'}
                  </p>
                  <p className="mt-1 text-[13px] text-ink-ghost">{nextPrayer.formattedTime}</p>
                </div>
              </SidebarCard>
            )}

            {/* 8-week trend (interactive) */}
            <SidebarCard title="8-week trend" description="Tap a bar for weekly breakdown.">
              <div className="rounded-xl border border-surface-border bg-surface-raised p-3">
                <div className="mb-1 flex h-14 items-end gap-1">
                  {trendScores.map((entry, index) => {
                    const weekKey = trendKeys[index]
                    const isCurrent = index === trendScores.length - 1
                    const isSelected = selectedWeek === weekKey
                    return (
                      <button
                        key={weekKey}
                        onClick={() => setSelectedWeek(isSelected ? null : weekKey)}
                        className={cn(
                          'flex-1 rounded-t-sm transition-all cursor-pointer hover:opacity-100',
                          isSelected && 'ring-2 ring-brand-400 ring-offset-1 ring-offset-surface-raised rounded-sm',
                        )}
                        style={{
                          height: `${Math.max(entry, 6)}%`,
                          background: isSelected ? 'var(--chart-brand)' : isCurrent ? 'var(--chart-brand)' : 'var(--trend-bar)',
                          opacity: isSelected || isCurrent ? 1 : 0.45 + index * 0.06,
                        }}
                        aria-label={`Week of ${weekKey}, score ${entry}`}
                      />
                    )
                  })}
                </div>
                <div className="flex justify-between text-[10px] text-ink-ghost">
                  {trendKeys.map((key, i) => {
                    const isSelected = selectedWeek === key
                    const isCurrent = i === trendKeys.length - 1
                    const label = new Date(key + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    return (
                      <span
                        key={key}
                        className={cn(
                          'text-[7px] leading-none',
                          (isSelected || isCurrent) && 'font-semibold text-brand-400',
                          i % 2 !== 0 && !isSelected && !isCurrent && 'hidden sm:inline',
                        )}
                      >
                        {label}
                      </span>
                    )
                  })}
                </div>
              </div>
            </SidebarCard>

            {/* Week history drill-down */}
            {selectedWeek && (
              <WeekHistoryPanel week={selectedWeek} onClose={() => setSelectedWeek(null)} />
            )}

            {/* Accountability */}
            <SidebarCard title="Accountability">
              <AccountabilityPanel />
            </SidebarCard>

            {/* Dhikr counter */}
            <SidebarCard title="Dhikr counter">
              <DhikrCounter />
            </SidebarCard>
          </>
        }
      />

      {/* ── Dialogs ── */}
      <FridayReviewDialog open={reviewOpen} onOpenChange={setReviewOpen} />
      <DhikrLogDialog open={dhikrOpen} onOpenChange={setDhikrOpen} />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   DIALOGS
   ═══════════════════════════════════════════════════════════════════════════════ */

function FridayReviewDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { getWeeklyRecord, setFridayReview } = useSalahStore()
  const record = getWeeklyRecord()
  const [wins, setWins] = useState('')
  const [drifted, setDrifted] = useState('')
  const [intention, setIntention] = useState('')

  useEffect(() => {
    if (!open) return
    setWins(record.fridayReview?.wins ?? record.wins.join('\n'))
    setDrifted(record.fridayReview?.drifted ?? '')
    setIntention(record.fridayReview?.intention ?? record.intention ?? '')
  }, [open, record.fridayReview, record.intention, record.wins])

  function handleSave() {
    if (!wins.trim() && !drifted.trim() && !intention.trim()) return
    setFridayReview({ wins: wins.trim(), drifted: drifted.trim(), intention: intention.trim() })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Friday review</DialogTitle>
          <DialogDescription>
            Capture what went well, where the week drifted, and the intention you want to carry forward.
          </DialogDescription>
          {record.fridayReview?.completedAt && (
            <p className="mt-2 text-[11px] text-ink-ghost">
              Last saved{' '}
              {new Date(record.fridayReview.completedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </p>
          )}
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-ink-ghost">Wins</label>
            <textarea value={wins} onChange={(e) => setWins(e.target.value)} placeholder="What moved this week?" className="input-base min-h-[96px] resize-none" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-ink-ghost">Where You Drifted</label>
            <textarea value={drifted} onChange={(e) => setDrifted(e.target.value)} placeholder="Where did you lose traction?" className="input-base min-h-[96px] resize-none" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-ink-ghost">Next Intention</label>
            <textarea value={intention} onChange={(e) => setIntention(e.target.value)} placeholder="What will you protect next week?" className="input-base min-h-[80px] resize-none" />
          </div>
        </div>
        <DialogFooter>
          <button onClick={() => onOpenChange(false)} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} className="btn-primary" disabled={!wins.trim() && !drifted.trim() && !intention.trim()}>Save review</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DhikrLogDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { addDhikrCounts } = useSalahStore()
  const [counts, setCounts] = useState({ subhanAllah: '0', alhamdulillah: '0', allahuAkbar: '0' })

  useEffect(() => {
    if (open) setCounts({ subhanAllah: '0', alhamdulillah: '0', allahuAkbar: '0' })
  }, [open])

  const total = Object.values(counts).reduce((sum, value) => sum + (Number(value) || 0), 0)

  function handleSave() {
    if (!total) return
    addDhikrCounts({
      subhanAllah: Number(counts.subhanAllah) || 0,
      alhamdulillah: Number(counts.alhamdulillah) || 0,
      allahuAkbar: Number(counts.allahuAkbar) || 0,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(92vw,480px)]">
        <DialogHeader>
          <DialogTitle>Log dhikr</DialogTitle>
          <DialogDescription>Add the counts you completed in one pass instead of tapping each counter one at a time.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {([['subhanAllah', 'SubhanAllah'], ['alhamdulillah', 'Alhamdulillah'], ['allahuAkbar', 'Allahu Akbar']] as const).map(
            ([key, label]) => (
              <div key={key}>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-ink-ghost">{label}</label>
                <input
                  type="number"
                  min="0"
                  value={counts[key]}
                  onChange={(e) => setCounts((current) => ({ ...current, [key]: e.target.value }))}
                  className="input-base"
                />
              </div>
            ),
          )}
        </div>
        <DialogFooter>
          <div className="mr-auto text-[12px] text-ink-muted">{total} total</div>
          <button onClick={() => onOpenChange(false)} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} className="btn-primary" disabled={!total}>Add counts</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
