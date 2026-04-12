'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toDateKey } from '@/lib/date'
import { useSalahStore } from '@/lib/store'
import { usePrayerTimes } from '@/hooks/usePrayerTimes'
import { computePrayerTimesForDates } from '@/lib/prayers'
import { cn } from '@/lib/utils'
import type { CalendarTask, PillarKey, PrayerTime } from '@/types'

/* ═══════════════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════════════ */

type ViewMode = 'day' | 'week' | 'month'

const HOUR_HEIGHT = 60
const START_HOUR = 4
const END_HOUR = 24
const TOTAL_HOURS = END_HOUR - START_HOUR

const PILLAR_COLORS: Record<PillarKey, { bg: string; border: string; text: string }> = {
  faith:   { bg: 'bg-faith-light', border: 'border-faith-border', text: 'text-faith-text' },
  career:  { bg: 'bg-tasks-light', border: 'border-tasks-border', text: 'text-tasks-text' },
  fitness: { bg: 'bg-fitness-light', border: 'border-fitness-border', text: 'text-fitness-text' },
  family:  { bg: 'bg-family-light', border: 'border-family-border', text: 'text-family-text' },
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60) % 24
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function formatHour(hour: number): string {
  if (hour === 0 || hour === 24) return '12 AM'
  if (hour === 12) return '12 PM'
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`
}

function formatTimeDisplay(time: string): string {
  const mins = timeToMinutes(time)
  const h = Math.floor(mins / 60) % 24
  const m = mins % 60
  const meridiem = h >= 12 ? 'PM' : 'AM'
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${display}:${String(m).padStart(2, '0')} ${meridiem}`
}

function getWeekDates(date: Date): Date[] {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(d)
    dd.setDate(d.getDate() + i)
    return dd
  })
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function prayerToMinutes(pt: PrayerTime): number | null {
  if (!pt.time) return null
  return pt.time.getHours() * 60 + pt.time.getMinutes()
}

/* ═══════════════════════════════════════════════════════════════════════════════
   TASK POPOVER (create / edit)
   ═══════════════════════════════════════════════════════════════════════════════ */

function TaskPopover({
  task,
  defaultDate,
  defaultTime,
  onSave,
  onDelete,
  onClose,
  style,
}: {
  task?: CalendarTask
  defaultDate: string
  defaultTime: string
  onSave: (data: Omit<CalendarTask, 'id' | 'completed'>) => void
  onDelete?: () => void
  onClose: () => void
  style?: React.CSSProperties
}) {
  const [title, setTitle] = useState(task?.title ?? '')
  const [date, setDate] = useState(task?.date ?? defaultDate)
  const [startTime, setStartTime] = useState(task?.startTime ?? defaultTime)
  const [duration, setDuration] = useState(task?.duration ?? 30)
  const [pillar, setPillar] = useState<PillarKey>(task?.pillar ?? 'career')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    onSave({ title: title.trim(), date, startTime, duration, pillar })
    onClose()
  }

  return (
    <div
      ref={ref}
      className="absolute z-50 w-[280px] rounded-2xl border border-surface-border bg-surface-card p-4 shadow-[0_12px_40px_rgba(0,0,0,0.15)]"
      style={style}
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title..."
          className="input-base text-[14px] font-medium"
        />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-ghost">Time</label>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="input-base text-[12px]" />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-ghost">Duration</label>
            <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="input-base text-[12px]">
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={45}>45 min</option>
              <option value={60}>1 hour</option>
              <option value={90}>1.5 hours</option>
              <option value={120}>2 hours</option>
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-ghost">Pillar</label>
          <select value={pillar} onChange={(e) => setPillar(e.target.value as PillarKey)} className="input-base text-[12px]">
            <option value="faith">Faith</option>
            <option value="career">Tasks</option>
            <option value="fitness">Fitness</option>
            <option value="family">Family</option>
          </select>
        </div>
        <div className="flex items-center justify-between pt-1">
          {onDelete ? (
            <button type="button" onClick={onDelete} className="text-[12px] text-fitness-text hover:underline">
              Delete
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-secondary text-[12px] px-3 py-1.5">
              Cancel
            </button>
            <button type="submit" className="btn-primary text-[12px] px-3 py-1.5" disabled={!title.trim()}>
              {task ? 'Save' : 'Create'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   DAY VIEW
   ═══════════════════════════════════════════════════════════════════════════════ */

function DayView({
  date,
  tasks,
  prayerTimes,
  onCreateTask,
  onEditTask,
  onToggleTask,
}: {
  date: Date
  tasks: CalendarTask[]
  prayerTimes: PrayerTime[]
  onCreateTask: (date: string, time: string) => void
  onEditTask: (task: CalendarTask) => void
  onToggleTask: (id: string) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const dateStr = toDateKey(date)
  const dayTasks = tasks.filter((t) => t.date === dateStr)
  const now = new Date()
  const isToday = isSameDay(date, now)
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  useEffect(() => {
    if (scrollRef.current && isToday) {
      const scrollTo = Math.max(0, (currentMinutes / 60 - START_HOUR - 2) * HOUR_HEIGHT)
      scrollRef.current.scrollTop = scrollTo
    }
  }, [isToday, currentMinutes])

  function handleGridClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top + (scrollRef.current?.scrollTop ?? 0)
    const minuteOffset = (y / HOUR_HEIGHT) * 60 + START_HOUR * 60
    const snapped = Math.floor(minuteOffset / 15) * 15
    onCreateTask(dateStr, minutesToTime(snapped))
  }

  return (
    <div ref={scrollRef} className="overflow-y-auto" style={{ height: 'calc(100vh - 180px)' }}>
      <div className="relative" style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}>
        {/* Hour lines */}
        {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
          <div
            key={i}
            className="absolute inset-x-0 flex items-start"
            style={{ top: i * HOUR_HEIGHT }}
          >
            <span className="w-16 shrink-0 pr-3 text-right text-[11px] text-ink-ghost -translate-y-[7px]">
              {formatHour(START_HOUR + i)}
            </span>
            <div className="flex-1 border-t border-surface-border" />
          </div>
        ))}

        {/* Prayer landmarks */}
        {prayerTimes.map((pt) => {
          const mins = prayerToMinutes(pt)
          if (mins === null) return null
          const top = ((mins - START_HOUR * 60) / 60) * HOUR_HEIGHT
          if (top < 0 || top > TOTAL_HOURS * HOUR_HEIGHT) return null
          return (
            <div
              key={pt.name}
              className="absolute inset-x-0 z-10 flex items-center pl-16"
              style={{ top }}
            >
              <div className="flex-1 flex items-center gap-2 rounded-md bg-faith-light/80 border border-faith-border/40 px-3 py-1">
                <span className="text-[10px] font-semibold text-faith-text">{pt.displayName}</span>
                <span className="text-[10px] text-faith-text/60">{pt.formattedTime}</span>
              </div>
            </div>
          )
        })}

        {/* Current time indicator */}
        {isToday && (
          <div
            className="absolute inset-x-0 z-20 flex items-center pl-14"
            style={{ top: ((currentMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT }}
          >
            <div className="h-2.5 w-2.5 rounded-full bg-red-500 -ml-1" />
            <div className="flex-1 border-t-2 border-red-500" />
          </div>
        )}

        {/* Clickable area */}
        <div
          className="absolute inset-0 left-16 cursor-pointer"
          onClick={handleGridClick}
        />

        {/* Task blocks */}
        {dayTasks.map((task) => {
          const startMins = timeToMinutes(task.startTime)
          const top = ((startMins - START_HOUR * 60) / 60) * HOUR_HEIGHT
          const height = (task.duration / 60) * HOUR_HEIGHT
          const colors = PILLAR_COLORS[task.pillar]

          return (
            <div
              key={task.id}
              className={cn(
                'absolute left-[72px] right-2 z-30 rounded-lg border px-3 py-1.5 cursor-pointer transition-shadow hover:shadow-card-hover',
                colors.bg, colors.border,
                task.completed && 'opacity-50',
              )}
              style={{ top: Math.max(top, 0), height: Math.max(height, 24) }}
              onClick={(e) => { e.stopPropagation(); onEditTask(task) }}
            >
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleTask(task.id) }}
                  className={cn(
                    'w-4 h-4 rounded border-[1.5px] shrink-0 flex items-center justify-center',
                    task.completed ? 'bg-faith border-faith' : 'border-current opacity-40',
                  )}
                >
                  {task.completed && (
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path d="M1.5 4l1.5 1.5 3-3" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
                <span className={cn('text-[12px] font-medium truncate', colors.text, task.completed && 'line-through')}>
                  {task.title}
                </span>
              </div>
              {height > 32 && (
                <p className="text-[10px] opacity-60 mt-0.5 pl-6">
                  {formatTimeDisplay(task.startTime)} · {task.duration}m
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   WEEK VIEW
   ═══════════════════════════════════════════════════════════════════════════════ */

function WeekView({
  date,
  tasks,
  prayerTimesByDate,
  onSelectDay,
  onToggleTask,
}: {
  date: Date
  tasks: CalendarTask[]
  prayerTimesByDate: Record<string, PrayerTime[]>
  onSelectDay: (d: Date) => void
  onToggleTask: (id: string) => void
}) {
  const weekDates = getWeekDates(date)
  const today = new Date()
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const scrollRef = useRef<HTMLDivElement>(null)
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  useEffect(() => {
    if (scrollRef.current) {
      const scrollTo = Math.max(0, (currentMinutes / 60 - START_HOUR - 2) * HOUR_HEIGHT)
      scrollRef.current.scrollTop = scrollTo
    }
  }, [currentMinutes])

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 180px)' }}>
      {/* Day headers */}
      <div className="flex border-b border-surface-border">
        <div className="w-14 shrink-0" />
        {weekDates.map((d, i) => {
          const isToday = isSameDay(d, today)
          return (
            <div
              key={i}
              className="flex-1 text-center py-2 cursor-pointer hover:bg-surface-muted transition-colors"
              onClick={() => onSelectDay(d)}
            >
              <p className={cn('text-[10px] uppercase', isToday ? 'text-brand-400 font-semibold' : 'text-ink-ghost')}>
                {dayNames[i]}
              </p>
              <p className={cn(
                'text-[18px] font-semibold mt-0.5',
                isToday ? 'text-brand-400' : 'text-ink-primary',
              )}>
                {d.getDate()}
              </p>
            </div>
          )
        })}
      </div>

      {/* Grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="relative flex" style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}>
          {/* Time gutter */}
          <div className="w-14 shrink-0 relative">
            {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
              <div key={i} className="absolute right-0 left-0 text-right pr-2" style={{ top: i * HOUR_HEIGHT }}>
                <span className="text-[10px] text-ink-ghost -translate-y-[6px] inline-block">
                  {formatHour(START_HOUR + i)}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDates.map((d, colIdx) => {
            const dateStr = toDateKey(d)
            const colTasks = tasks.filter((t) => t.date === dateStr)
            const isToday = isSameDay(d, today)

            return (
              <div key={colIdx} className={cn('flex-1 relative border-l border-surface-border', isToday && 'bg-brand-50/30')}>
                {/* Hour lines */}
                {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
                  <div key={i} className="absolute inset-x-0 border-t border-surface-border" style={{ top: i * HOUR_HEIGHT }} />
                ))}

                {/* Prayer bars (per-day) */}
                {(prayerTimesByDate[dateStr] ?? []).map((pt) => {
                  const mins = prayerToMinutes(pt)
                  if (mins === null) return null
                  const top = ((mins - START_HOUR * 60) / 60) * HOUR_HEIGHT
                  if (top < 0 || top > TOTAL_HOURS * HOUR_HEIGHT) return null
                  return (
                    <div
                      key={pt.name}
                      className="absolute inset-x-0.5 z-10 flex items-center gap-1 rounded bg-faith-light/80 border border-faith-border/40 px-1.5 py-0.5"
                      style={{ top }}
                    >
                      <span className="text-[8px] font-semibold text-faith-text truncate">{pt.displayName}</span>
                      <span className="text-[7px] text-faith-text/50">{pt.formattedTime}</span>
                    </div>
                  )
                })}

                {/* Current time line */}
                {isToday && (
                  <div
                    className="absolute inset-x-0 z-20 border-t-2 border-red-500"
                    style={{ top: ((currentMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT }}
                  />
                )}

                {/* Tasks */}
                {colTasks.map((task) => {
                  const startMins = timeToMinutes(task.startTime)
                  const top = ((startMins - START_HOUR * 60) / 60) * HOUR_HEIGHT
                  const height = (task.duration / 60) * HOUR_HEIGHT
                  const colors = PILLAR_COLORS[task.pillar]

                  return (
                    <div
                      key={task.id}
                      className={cn(
                        'absolute inset-x-0.5 z-30 rounded-md border px-1.5 py-1 cursor-pointer text-[10px] overflow-hidden',
                        colors.bg, colors.border, colors.text,
                        task.completed && 'opacity-40',
                      )}
                      style={{ top, height: Math.max(height, 20) }}
                      onClick={() => onToggleTask(task.id)}
                    >
                      <p className={cn('font-medium truncate', task.completed && 'line-through')}>{task.title}</p>
                      {height > 28 && <p className="opacity-60">{formatTimeDisplay(task.startTime)}</p>}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   MONTH VIEW
   ═══════════════════════════════════════════════════════════════════════════════ */

function MonthView({
  date,
  tasks,
  onSelectDay,
}: {
  date: Date
  tasks: CalendarTask[]
  onSelectDay: (d: Date) => void
}) {
  const today = new Date()
  const year = date.getFullYear()
  const month = date.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const offset = firstDay === 0 ? 6 : firstDay - 1
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  while (cells.length % 7 !== 0) cells.push(null)

  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 180px)' }}>
      {/* Header */}
      <div className="grid grid-cols-7 border-b border-surface-border">
        {dayLabels.map((d) => (
          <div key={d} className="text-center py-2 text-[11px] font-semibold uppercase text-ink-ghost">
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 flex-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} className="border-b border-r border-surface-border bg-surface-muted/30" />

          const cellDate = new Date(year, month, day)
          const dateStr = toDateKey(cellDate)
          const isToday = isSameDay(cellDate, today)
          const dayTasks = tasks.filter((t) => t.date === dateStr)
          const completed = dayTasks.filter((t) => t.completed).length

          return (
            <div
              key={i}
              className={cn(
                'border-b border-r border-surface-border p-1.5 cursor-pointer hover:bg-surface-muted/50 transition-colors min-h-[80px]',
                isToday && 'bg-brand-50/40',
              )}
              onClick={() => onSelectDay(cellDate)}
            >
              <div className="flex items-center justify-between">
                <span className={cn(
                  'text-[13px] font-medium',
                  isToday ? 'flex h-7 w-7 items-center justify-center rounded-full bg-brand-400 text-white' : 'text-ink-primary',
                )}>
                  {day}
                </span>
                {dayTasks.length > 0 && (
                  <span className="text-[10px] text-ink-ghost">{completed}/{dayTasks.length}</span>
                )}
              </div>
              <div className="mt-1 space-y-0.5">
                {dayTasks.slice(0, 3).map((t) => {
                  const colors = PILLAR_COLORS[t.pillar]
                  return (
                    <div
                      key={t.id}
                      className={cn(
                        'rounded px-1.5 py-0.5 text-[10px] truncate',
                        colors.bg, colors.text,
                        t.completed && 'opacity-40 line-through',
                      )}
                    >
                      {t.title}
                    </div>
                  )
                })}
                {dayTasks.length > 3 && (
                  <p className="text-[9px] text-ink-ghost pl-1.5">+{dayTasks.length - 3} more</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════════════════════ */

export default function TasksPage() {
  const { prayerTimes } = usePrayerTimes()
  const settings = useSalahStore(s => s.settings)
  const {
    calendarTasks,
    addCalendarTask,
    updateCalendarTask,
    deleteCalendarTask,
    toggleCalendarTask,
  } = useSalahStore()

  const [view, setView] = useState<ViewMode>('week')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [weekPrayerTimes, setWeekPrayerTimes] = useState<Record<string, PrayerTime[]>>({})

  const computeWeekPrayers = useCallback(async (centerDate: Date) => {
    const lat = settings.location.lat
    const lng = settings.location.lng
    if (lat == null || lng == null) return

    const dates = getWeekDates(centerDate)
    const result = await computePrayerTimesForDates(lat, lng, settings.madhab, settings.calcMethod, dates)
    setWeekPrayerTimes(result)
  }, [settings.location.lat, settings.location.lng, settings.madhab, settings.calcMethod])

  useEffect(() => {
    computeWeekPrayers(selectedDate)
  }, [computeWeekPrayers, selectedDate])
  const [popover, setPopover] = useState<{
    type: 'create' | 'edit'
    task?: CalendarTask
    date: string
    time: string
    position: { top: number; left: number }
  } | null>(null)

  const todayStr = toDateKey(new Date())

  function goToday() { setSelectedDate(new Date()) }

  function navigate(dir: -1 | 1) {
    setSelectedDate((d) => {
      const next = new Date(d)
      if (view === 'day') next.setDate(next.getDate() + dir)
      else if (view === 'week') next.setDate(next.getDate() + dir * 7)
      else next.setMonth(next.getMonth() + dir)
      return next
    })
  }

  function handleCreateTask(date: string, time: string) {
    setPopover({
      type: 'create',
      date,
      time,
      position: { top: 100, left: 100 },
    })
  }

  function handleEditTask(task: CalendarTask) {
    setPopover({
      type: 'edit',
      task,
      date: task.date,
      time: task.startTime,
      position: { top: 100, left: 100 },
    })
  }

  function handleSelectDay(d: Date) {
    setSelectedDate(d)
    setView('day')
  }

  const dateLabel =
    view === 'day'
      ? selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
      : view === 'week'
        ? (() => {
            const week = getWeekDates(selectedDate)
            const start = week[0]
            const end = week[6]
            return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
          })()
        : selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="flex flex-col px-4 py-4 md:px-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-[22px] font-semibold tracking-tight text-ink-primary">Tasks</h1>
          <button
            onClick={goToday}
            className="rounded-lg border border-surface-border bg-surface-card px-3 py-1 text-[12px] font-medium text-ink-secondary hover:bg-surface-muted transition-colors"
          >
            Today
          </button>
          <div className="flex items-center gap-1">
            <button onClick={() => navigate(-1)} className="w-7 h-7 rounded-lg border border-surface-border bg-surface-card flex items-center justify-center text-ink-muted hover:bg-surface-muted transition-colors">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M8.5 3.5L5 7l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <button onClick={() => navigate(1)} className="w-7 h-7 rounded-lg border border-surface-border bg-surface-card flex items-center justify-center text-ink-muted hover:bg-surface-muted transition-colors">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5.5 3.5L9 7l-3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
          <span className="text-[15px] font-medium text-ink-primary">{dateLabel}</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-surface-border bg-surface-card p-0.5">
            {(['day', 'week', 'month'] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors capitalize',
                  view === v ? 'bg-tasks-light text-tasks-text' : 'text-ink-muted hover:text-ink-secondary',
                )}
              >
                {v}
              </button>
            ))}
          </div>
          <button
            onClick={() => handleCreateTask(toDateKey(selectedDate), minutesToTime(Math.floor(new Date().getHours()) * 60 + 30))}
            className="btn-primary text-[12px] px-3 py-1.5"
          >
            + Add task
          </button>
        </div>
      </div>

      {/* ── Calendar body ── */}
      <div className="relative rounded-2xl border border-surface-border bg-surface-card overflow-hidden">
        {view === 'day' && (
          <DayView
            date={selectedDate}
            tasks={calendarTasks}
            prayerTimes={weekPrayerTimes[toDateKey(selectedDate)] ?? prayerTimes}
            onCreateTask={handleCreateTask}
            onEditTask={handleEditTask}
            onToggleTask={toggleCalendarTask}
          />
        )}
        {view === 'week' && (
          <WeekView
            date={selectedDate}
            tasks={calendarTasks}
            prayerTimesByDate={weekPrayerTimes}
            onSelectDay={handleSelectDay}
            onToggleTask={toggleCalendarTask}
          />
        )}
        {view === 'month' && (
          <MonthView
            date={selectedDate}
            tasks={calendarTasks}
            onSelectDay={handleSelectDay}
          />
        )}
      </div>

      {/* ── Popover ── */}
      {popover && (
        <div className="fixed inset-0 z-40" onClick={() => setPopover(null)}>
          <div className="absolute inset-0" />
          <div className="flex items-center justify-center min-h-screen p-4" onClick={(e) => e.stopPropagation()}>
            <TaskPopover
              task={popover.task}
              defaultDate={popover.date}
              defaultTime={popover.time}
              onSave={(data) => {
                if (popover.type === 'edit' && popover.task) {
                  updateCalendarTask(popover.task.id, data)
                } else {
                  addCalendarTask({ ...data, completed: false })
                }
                setPopover(null)
              }}
              onDelete={
                popover.type === 'edit' && popover.task
                  ? () => { deleteCalendarTask(popover.task!.id); setPopover(null) }
                  : undefined
              }
              onClose={() => setPopover(null)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
