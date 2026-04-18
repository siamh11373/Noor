'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DayCalendarView } from '@/components/tasks/DayCalendarView'
import { TaskDayPanel } from '@/components/tasks/TaskDayPanel'
import { TaskScheduleDayList } from '@/components/tasks/TaskScheduleDayList'
import { TaskScheduleWeekBoard } from '@/components/tasks/TaskScheduleWeekBoard'
import { WeekCalendarView } from '@/components/tasks/WeekCalendarView'
import { TasksLeftRail } from '@/components/tasks/TasksLeftRail'
import { monthKey, parseDateKey, shiftMonthKeepingDay, toDateKey } from '@/lib/date'
import {
  calendarTaskMasterId,
  expandCalendarTasksForDateKeys,
  extractVirtualOccurrenceDateKey,
  getMonthDateKeys,
  getWeekDateKeys,
} from '@/lib/task-recurrence'
import { nextStartForAppend } from '@/lib/task-schedule-order'
import {
  DAY_END_MINUTES,
  DAY_START_MINUTES,
  DEFAULT_NEW_TASK_MINUTES,
  minutesToTime,
  snapMinutesFloor,
  TASK_PILLAR_STYLES,
  timeToMinutes,
} from '@/lib/tasks-calendar'
import { useSalahStore } from '@/lib/store'
import { useLgUp } from '@/hooks/useLgUp'
import { usePrayerTimes } from '@/hooks/usePrayerTimes'
import { computePrayerTimesForDates, DEFAULT_PRAYER_COORDS } from '@/lib/prayers'
import { CalendarDays, ListChecks, PanelLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CalendarTask, PillarKey, PrayerTime } from '@/types'

/* ═══════════════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════════════ */

type ViewMode = 'day' | 'week' | 'month'
type ScheduleMode = 'time' | 'task'

const VIEW_LABEL: Record<ViewMode, string> = {
  day: 'Day',
  week: 'Week',
  month: 'Month',
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

/** Target calendar day for quick-add in Task mode (week prefers today-in-week). */
function taskQuickAddDateKey(view: ViewMode, selectedDate: Date): string {
  const now = new Date()
  if (view === 'day') return toDateKey(selectedDate)
  if (view === 'week') {
    const week = getWeekDates(selectedDate)
    const todayInWeek = week.find((d) => isSameDay(d, now)) ?? week[0]!
    return toDateKey(todayInWeek)
  }
  const sameMonth =
    now.getFullYear() === selectedDate.getFullYear() && now.getMonth() === selectedDate.getMonth()
  if (sameMonth) return toDateKey(now)
  return toDateKey(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1))
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
   MONTH VIEW
   ═══════════════════════════════════════════════════════════════════════════════ */

function MonthView({
  date,
  tasks,
  onSelectDay,
  onOpenTask,
  variant = 'time',
}: {
  date: Date
  tasks: CalendarTask[]
  onSelectDay: (d: Date) => void
  /** Task mode: open detail panel without leaving month (same as grid task tap). */
  onOpenTask?: (taskId: string) => void
  variant?: 'time' | 'task'
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
  const previewCap = variant === 'task' ? 2 : 3

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 180px)' }}>
      <div className="grid grid-cols-7 border-b border-surface-border">
        {dayLabels.map((d) => (
          <div key={d} className="py-2 text-center text-[11px] font-semibold uppercase text-ink-ghost">
            {d}
          </div>
        ))}
      </div>

      <div className="grid flex-1 grid-cols-7">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} className="border-b border-r border-surface-border bg-surface-muted/30" />

          const cellDate = new Date(year, month, day)
          const dateStr = toDateKey(cellDate)
          const isToday = isSameDay(cellDate, today)
          const dayTasks = tasks
            .filter((t) => t.date === dateStr)
            .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
          const completed = dayTasks.filter((t) => t.completed).length

          return (
            <div
              key={i}
              className={cn(
                'min-h-[80px] cursor-pointer border-b border-r border-surface-border p-1.5 transition-colors hover:bg-surface-muted/50',
                isToday && 'bg-brand-50/40',
              )}
              onClick={() => onSelectDay(cellDate)}
            >
              <div className="flex items-center justify-between gap-1">
                <span
                  className={cn(
                    'text-[13px] font-medium',
                    isToday ? 'flex h-7 w-7 items-center justify-center rounded-full bg-brand-400 text-white' : 'text-ink-primary',
                  )}
                >
                  {day}
                </span>
                {variant === 'task' ? (
                  dayTasks.length > 0 ? (
                    <span className="shrink-0 text-[10px] font-medium text-ink-muted">{dayTasks.length}</span>
                  ) : null
                ) : dayTasks.length > 0 ? (
                  <span className="text-[10px] text-ink-ghost">
                    {completed}/{dayTasks.length}
                  </span>
                ) : null}
              </div>
              <div className="mt-1 space-y-0.5">
                {dayTasks.slice(0, previewCap).map((t) => {
                  const colors = TASK_PILLAR_STYLES[t.pillar]
                  const preview = (
                    <span className={cn('truncate', t.completed && 'line-through opacity-40')}>{t.title}</span>
                  )
                  if (variant === 'task' && onOpenTask) {
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onOpenTask(t.id)
                        }}
                        className={cn(
                          'block w-full truncate rounded px-1.5 py-0.5 text-left text-[10px] transition-opacity hover:opacity-90',
                          colors.bg,
                          colors.text,
                        )}
                      >
                        {preview}
                      </button>
                    )
                  }
                  return (
                    <div
                      key={t.id}
                      className={cn(
                        'truncate rounded px-1.5 py-0.5 text-[10px]',
                        colors.bg,
                        colors.text,
                        t.completed && 'line-through opacity-40',
                      )}
                    >
                      {t.title}
                    </div>
                  )
                })}
                {variant === 'task' && dayTasks.length > previewCap && (
                  <p className="pl-1.5 text-[9px] text-ink-ghost">+{dayTasks.length - previewCap} more</p>
                )}
                {variant === 'time' && dayTasks.length > previewCap && (
                  <p className="pl-1.5 text-[9px] text-ink-ghost">+{dayTasks.length - previewCap} more</p>
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
  const lgUp = useLgUp()
  const { prayerTimes, nextPrayer, countdownLabel, loading: prayerLoading } = usePrayerTimes()
  const settings = useSalahStore((s) => s.settings)
  const {
    calendarTasks,
    addCalendarTask,
    updateCalendarTask,
    deleteCalendarTask,
    toggleCalendarTask,
    updateSettings,
  } = useSalahStore()

  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('time')
  const [view, setView] = useState<ViewMode>('week')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [mobileRailOpen, setMobileRailOpen] = useState(false)
  const [weekPrayerTimes, setWeekPrayerTimes] = useState<Record<string, PrayerTime[]>>({})

  const computeWeekPrayers = useCallback(
    async (centerDate: Date) => {
      let lat = settings.location.lat
      let lng = settings.location.lng

      // Match usePrayerTimes: week grid used to bail out when coords were unset, so
      // others with saved location saw prayers all week while this path showed none.
      if (lat == null || lng == null) {
        try {
          const pos = await new Promise<GeolocationPosition>((res, rej) =>
            navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000 }),
          )
          lat = pos.coords.latitude
          lng = pos.coords.longitude
          updateSettings({ location: { lat, lng, city: settings.location.city ?? '' } })
        } catch {
          lat = DEFAULT_PRAYER_COORDS.lat
          lng = DEFAULT_PRAYER_COORDS.lng
        }
      }

      const dates = getWeekDates(centerDate)
      const result = await computePrayerTimesForDates(lat, lng, settings.madhab, settings.calcMethod, dates)
      setWeekPrayerTimes(result)
    },
    [
      settings.location.lat,
      settings.location.lng,
      settings.location.city,
      settings.madhab,
      settings.calcMethod,
      updateSettings,
    ],
  )

  useEffect(() => {
    computeWeekPrayers(selectedDate)
  }, [computeWeekPrayers, selectedDate])

  const [dayPanelTaskId, setDayPanelTaskId] = useState<string | null>(null)
  const [suppressTaskPanelForDrag, setSuppressTaskPanelForDrag] = useState(false)

  useEffect(() => {
    if (view !== 'day' && view !== 'week') {
      setDayPanelTaskId(null)
      return
    }
    setDayPanelTaskId(null)
  }, [view, selectedDate, scheduleMode])

  useEffect(() => {
    if (view === 'day' || view === 'week' || scheduleMode !== 'time') setPopover(null)
  }, [view, scheduleMode])

  const expansionDateKeys = useMemo(() => {
    if (view === 'day') return [toDateKey(selectedDate)]
    if (view === 'week') return getWeekDateKeys(selectedDate)
    return getMonthDateKeys(selectedDate)
  }, [view, selectedDate])

  const displayCalendarTasks = useMemo(
    () => expandCalendarTasksForDateKeys(calendarTasks, expansionDateKeys),
    [calendarTasks, expansionDateKeys],
  )

  const anchorMonth = useMemo(
    () => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1, 12, 0, 0, 0),
    [selectedDate],
  )

  const calendarTasksInAnchorMonth = useMemo(() => {
    const y = anchorMonth.getFullYear()
    const m = anchorMonth.getMonth()
    return calendarTasks.filter((t) => {
      const d = parseDateKey(t.date)
      return d.getFullYear() === y && d.getMonth() === m
    })
  }, [calendarTasks, anchorMonth])

  const todayTasksForRail = useMemo(() => {
    const key = toDateKey(new Date())
    return expandCalendarTasksForDateKeys(calendarTasks, [key]).filter((t) => t.date === key)
  }, [calendarTasks])

  useEffect(() => {
    if (!dayPanelTaskId) return
    const mid = calendarTaskMasterId(dayPanelTaskId)
    if (!calendarTasks.some((t) => t.id === mid)) setDayPanelTaskId(null)
  }, [calendarTasks, dayPanelTaskId])

  useEffect(() => {
    if (!dayPanelTaskId) setSuppressTaskPanelForDrag(false)
  }, [dayPanelTaskId])

  const [popover, setPopover] = useState<{
    type: 'create' | 'edit'
    task?: CalendarTask
    date: string
    time: string
    position: { top: number; left: number }
  } | null>(null)

  function goToday() {
    setSelectedDate(new Date())
    setMobileRailOpen(false)
  }

  function navigateMonth(dir: -1 | 1) {
    setSelectedDate((d) => shiftMonthKeepingDay(d, dir))
  }

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

  const weekRangeCaption =
    view === 'week'
      ? dateLabel
      : view === 'day'
        ? selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
        : null

  function handleAddTask() {
    if (scheduleMode === 'task') {
      const dateKey = taskQuickAddDateKey(view, selectedDate)
      const dayTasks = calendarTasks.filter((t) => t.date === dateKey)
      const startTime = nextStartForAppend(dayTasks)
      const id = addCalendarTask({
        title: '(No title)',
        date: dateKey,
        startTime,
        duration: 60,
        pillar: 'career',
        completed: false,
      })
      setDayPanelTaskId(id)
      return
    }

    if (view === 'day' || view === 'week') {
      const n = new Date()
      const nowMin = n.getHours() * 60 + n.getMinutes()
      const snapped = snapMinutesFloor(nowMin)
      const startMins = Math.min(Math.max(snapped, DAY_START_MINUTES), DAY_END_MINUTES - DEFAULT_NEW_TASK_MINUTES)
      let dateKey = toDateKey(selectedDate)
      if (view === 'week') {
        const week = getWeekDates(selectedDate)
        const todayD = week.find((d) => isSameDay(d, n)) ?? week[0]
        dateKey = toDateKey(todayD!)
      }
      const startTime = minutesToTime(startMins)
      const id = addCalendarTask({
        title: '(No title)',
        date: dateKey,
        startTime,
        duration: DEFAULT_NEW_TASK_MINUTES,
        pillar: 'career',
        completed: false,
      })
      setDayPanelTaskId(id)
      return
    }

    handleCreateTask(
      toDateKey(selectedDate),
      minutesToTime(Math.floor(new Date().getHours()) * 60 + 30),
    )
  }

  const monthFocusLabel = anchorMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  const railProps = {
    selectedDate,
    onSelectDay: (d: Date) => setSelectedDate(d),
    onMonthNavigate: navigateMonth,
    onGoToday: goToday,
    onQuickAdd: () => {
      handleAddTask()
      setMobileRailOpen(false)
    },
    calendarTasksForAnchorMonth: calendarTasksInAnchorMonth,
    anchorMonth,
    weekRangeLabel: weekRangeCaption,
    todayTasks: todayTasksForRail,
    nextPrayer,
    countdownLabel,
    prayerLoading,
    monthFocusKey: monthKey(anchorMonth),
    monthFocusLabel,
  }

  return (
    <div className="flex flex-col px-4 py-4 md:px-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileRailOpen(true)}
            className="ui-toolbar-icon lg:hidden"
            aria-label="Open schedule and calendar"
          >
            <PanelLeft className="h-4 w-4" aria-hidden />
          </button>
          <h1 className="text-[22px] font-semibold tracking-tight text-ink-primary">Tasks</h1>
          <button type="button" onClick={goToday} className="ui-toolbar-btn">
            Today
          </button>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => navigate(-1)} className="ui-toolbar-icon">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M8.5 3.5L5 7l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button type="button" onClick={() => navigate(1)} className="ui-toolbar-icon">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M5.5 3.5L9 7l-3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <span className="text-[15px] font-medium text-ink-primary">{dateLabel}</span>
        </div>

        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-3">
          <div className="ui-segment" role="group" aria-label="Schedule mode">
            {(['time', 'task'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setScheduleMode(m)}
                className={cn(
                  'ui-segment-btn min-w-[6.25rem]',
                  scheduleMode === m
                    ? 'bg-surface-card text-ink-primary shadow-control'
                    : 'text-ink-muted hover:text-ink-secondary hover:bg-surface-card/60',
                )}
              >
                {m === 'time' ? (
                  <>
                    <CalendarDays className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
                    <span>Time</span>
                  </>
                ) : (
                  <>
                    <ListChecks className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
                    <span>Task</span>
                  </>
                )}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="ui-segment-surface">
              {(['day', 'week', 'month'] as ViewMode[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  className={cn(
                    'ui-segment-chip',
                    view === v
                      ? 'bg-tasks-light text-tasks-text shadow-control'
                      : 'text-ink-muted hover:text-ink-secondary hover:bg-surface-muted/80',
                  )}
                >
                  {VIEW_LABEL[v]}
                </button>
              ))}
            </div>
            <button onClick={handleAddTask} className="btn-primary px-3 py-1.5 text-[12px]">
              + Add task
            </button>
          </div>
        </div>
      </div>

      {mobileRailOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] lg:hidden"
            aria-label="Close schedule panel"
            onClick={() => setMobileRailOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 flex w-[min(100%,300px)] max-w-[min(100vw,300px)] flex-col overflow-y-auto overscroll-contain border-r border-surface-border bg-surface-card shadow-[4px_0_32px_rgba(0,0,0,0.12)] dark:bg-surface-raised dark:shadow-[4px_0_40px_rgba(0,0,0,0.45)] lg:hidden">
            <TasksLeftRail
              variant="drawer"
              {...railProps}
              mountMonthFocus={!lgUp && mobileRailOpen}
              onClose={() => setMobileRailOpen(false)}
            />
          </div>
        </>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-0">
        <div className="hidden shrink-0 lg:block">
          <TasksLeftRail variant="sidebar" {...railProps} mountMonthFocus={lgUp} />
        </div>

        <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-2xl border border-surface-border bg-surface-card">
        {scheduleMode === 'time' && view === 'day' && (
          <DayCalendarView
            date={selectedDate}
            tasks={displayCalendarTasks}
            prayerTimes={weekPrayerTimes[toDateKey(selectedDate)] ?? prayerTimes}
            focusedTaskId={dayPanelTaskId}
            onFocusedTaskIdChange={setDayPanelTaskId}
            addCalendarTask={addCalendarTask}
            updateCalendarTask={updateCalendarTask}
            toggleCalendarTask={toggleCalendarTask}
            onTimeBlockDragSessionChange={setSuppressTaskPanelForDrag}
          />
        )}
        {scheduleMode === 'time' && view === 'week' && (
          <WeekCalendarView
            anchorDate={selectedDate}
            tasks={displayCalendarTasks}
            prayerTimesByDate={weekPrayerTimes}
            focusedTaskId={dayPanelTaskId}
            onFocusedTaskIdChange={setDayPanelTaskId}
            addCalendarTask={addCalendarTask}
            updateCalendarTask={updateCalendarTask}
            toggleCalendarTask={toggleCalendarTask}
            onOpenDay={handleSelectDay}
            onTimeBlockDragSessionChange={setSuppressTaskPanelForDrag}
          />
        )}
        {scheduleMode === 'time' && view === 'month' && (
          <MonthView date={selectedDate} tasks={displayCalendarTasks} variant="time" onSelectDay={handleSelectDay} />
        )}

        {scheduleMode === 'task' && view === 'day' && (
          <TaskScheduleDayList
            date={selectedDate}
            tasks={displayCalendarTasks}
            prayerTimes={weekPrayerTimes[toDateKey(selectedDate)] ?? prayerTimes}
            focusedTaskId={dayPanelTaskId}
            updateCalendarTask={updateCalendarTask}
            toggleCalendarTask={toggleCalendarTask}
            onFocusTask={setDayPanelTaskId}
          />
        )}
        {scheduleMode === 'task' && view === 'week' && (
          <TaskScheduleWeekBoard
            anchorDate={selectedDate}
            tasks={displayCalendarTasks}
            focusedTaskId={dayPanelTaskId}
            toggleCalendarTask={toggleCalendarTask}
            onFocusTask={setDayPanelTaskId}
            onOpenDay={handleSelectDay}
          />
        )}
        {scheduleMode === 'task' && view === 'month' && (
          <MonthView
            date={selectedDate}
            tasks={displayCalendarTasks}
            variant="task"
            onSelectDay={handleSelectDay}
            onOpenTask={setDayPanelTaskId}
          />
        )}
        </div>
      </div>

      {(view === 'day' || view === 'week' || (scheduleMode === 'task' && view === 'month')) &&
        dayPanelTaskId &&
        !suppressTaskPanelForDrag &&
        (() => {
          const masterId = calendarTaskMasterId(dayPanelTaskId)
          const master = calendarTasks.find((t) => t.id === masterId)
          if (!master) return null
          const occKey = extractVirtualOccurrenceDateKey(dayPanelTaskId)
          const panelTask: CalendarTask =
            occKey != null
              ? { ...master, id: dayPanelTaskId, date: occKey, recurrenceInstanceOf: masterId }
              : master
          const taskDay = new Date(`${panelTask.date}T12:00:00`)
          const weekdayDateLabel = taskDay.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })
          return (
            <TaskDayPanel
              key={dayPanelTaskId}
              task={panelTask}
              weekdayDateLabel={weekdayDateLabel}
              recurrenceAnchorDateKey={master.date}
              onPatch={(patch) => updateCalendarTask(masterId, patch)}
              onDelete={() => {
                deleteCalendarTask(masterId)
                setDayPanelTaskId(null)
              }}
              onClose={() => setDayPanelTaskId(null)}
            />
          )
        })()}

      {popover && view === 'month' && scheduleMode === 'time' && (
        <div className="fixed inset-0 z-40" onClick={() => setPopover(null)}>
          <div className="absolute inset-0" />
          <div className="flex min-h-screen items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
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
                  ? () => {
                      deleteCalendarTask(popover.task!.id)
                      setPopover(null)
                    }
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
