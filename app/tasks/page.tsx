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
import { useTasksShortcuts } from '@/hooks/useTasksShortcuts'
import { computePrayerTimesForDates, DEFAULT_PRAYER_COORDS } from '@/lib/prayers'
import { CalendarDays, CheckCircle2, ChevronDown, ListChecks, PanelLeft } from 'lucide-react'
import { MenuContent, MenuItem, MenuRoot, MenuSeparator, MenuTrigger } from '@/components/ui/dropdown-menu'
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
  const [date] = useState(task?.date ?? defaultDate)
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
  onAddTaskForDay,
  variant = 'time',
}: {
  date: Date
  tasks: CalendarTask[]
  onSelectDay: (d: Date) => void
  /** Open detail panel without leaving month (same as grid task tap). The
   *  optional rect lets the panel anchor itself near the clicked chip. */
  onOpenTask?: (taskId: string, anchorRect?: DOMRect | null) => void
  /** Click empty cell area to quick-add a task on that day. */
  onAddTaskForDay?: (d: Date, anchorRect?: DOMRect | null) => void
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
    <div
      className={cn(
        'flex h-full flex-col',
        variant === 'task' && 'min-h-0 overflow-hidden',
      )}
    >
      <div className="grid grid-cols-7 border-b border-surface-border">
        {dayLabels.map((d) => (
          <div key={d} className="py-2 text-center text-[11px] font-semibold uppercase text-ink-ghost">
            {d}
          </div>
        ))}
      </div>

      <div className={cn('grid flex-1 grid-cols-7', variant === 'task' && 'min-h-0 overflow-hidden')}>
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
              onClick={(e) => {
                if (onAddTaskForDay) onAddTaskForDay(cellDate, e.currentTarget.getBoundingClientRect())
                else onSelectDay(cellDate)
              }}
              title={onAddTaskForDay ? 'Click to add a task · double-click number to open day' : undefined}
            >
              <div className="flex items-center justify-between gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelectDay(cellDate)
                  }}
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-medium transition-colors',
                    isToday
                      ? 'bg-brand-400 text-white hover:bg-brand-500'
                      : 'border border-surface-border text-ink-primary hover:border-brand-400 hover:bg-brand-50/60 hover:text-brand-500',
                  )}
                  aria-label={`Open ${cellDate.toLocaleDateString()} in day view`}
                >
                  {day}
                </button>
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
                  if (onOpenTask) {
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onOpenTask(t.id, e.currentTarget.getBoundingClientRect())
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
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
  const [desktopRailOpen, setDesktopRailOpen] = useState(() => {
    if (typeof window === 'undefined') return true
    return localStorage.getItem('tasks-rail-open') !== 'false'
  })
  const [weekPrayerTimes, setWeekPrayerTimes] = useState<Record<string, PrayerTime[]>>({})

  // Lock window scroll only while the tasks page is mounted: the page is
  // sized to the viewport and shouldn't drive a document-level scroll. Other
  // pages keep their normal scrolling.
  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const prevHtml = html.style.overflow
    const prevBody = body.style.overflow
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    return () => {
      html.style.overflow = prevHtml
      body.style.overflow = prevBody
    }
  }, [])

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
  /** Rect of the click that created a new task; used to anchor the panel
   *  near where the user clicked when there's no rendered task chip yet
   *  (e.g. clicking an empty month cell). */
  const [addTaskAnchorRect, setAddTaskAnchorRect] = useState<DOMRect | null>(null)
  const [suppressTaskPanelForDrag, setSuppressTaskPanelForDrag] = useState(false)
  /** Mirrors `TaskDayPanel`'s internal dirty state via `onDirtyChange`. The
   *  page uses it to decide whether a calendar-surface click should discard
   *  the open task (panel was a blank stub) or relocate it (user typed /
   *  patched something). Reset when `dayPanelTaskId` changes. */
  const [panelDirty, setPanelDirty] = useState(false)
  useEffect(() => {
    setPanelDirty(false)
  }, [dayPanelTaskId])

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

  function toggleDesktopRail() {
    const next = !desktopRailOpen
    setDesktopRailOpen(next)
    localStorage.setItem('tasks-rail-open', String(next))
  }

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

  /* ───────────────────────── Panel dispatchers ─────────────────────────
     The "click anywhere on the calendar" UX has three cases:
       1. No panel open → just create the new task / open the chip.
       2. Panel open and clean (untouched stub) → discard it first, then
          create / switch.
       3. Panel open and dirty (user typed or patched something) → for an
          empty-slot click, *relocate* the existing task to the new slot
          instead of creating a duplicate; for a chip click, the typed
          changes are already auto-saved on input blur, so just switch
          panels.
     `dispatchCalendarSlotClick` covers (1)/(2)/(3) for empty slot taps.
     `dispatchOpenTask` covers them for chip taps. Outside-calendar clicks
     bypass both and the panel stays open (see TaskDayPanel — its old
     outside-click auto-close was removed for this reason).                */

  const dispatchCalendarSlotClick = useCallback(
    (date: string, startTime: string, anchorRect?: DOMRect | null) => {
      if (dayPanelTaskId) {
        const masterId = calendarTaskMasterId(dayPanelTaskId)
        if (panelDirty) {
          updateCalendarTask(masterId, { date, startTime })
          setAddTaskAnchorRect(anchorRect ?? null)
          return
        }
        deleteCalendarTask(masterId)
        setDayPanelTaskId(null)
      }
      const id = addCalendarTask({
        title: '(No title)',
        date,
        startTime,
        duration: 60,
        pillar: 'career',
        completed: false,
      })
      setAddTaskAnchorRect(anchorRect ?? null)
      setDayPanelTaskId(id)
    },
    [dayPanelTaskId, panelDirty, addCalendarTask, updateCalendarTask, deleteCalendarTask],
  )

  const dispatchOpenTask = useCallback(
    (id: string | null, anchorRect?: DOMRect | null) => {
      if (id == null) {
        setDayPanelTaskId(null)
        return
      }
      if (dayPanelTaskId && dayPanelTaskId !== id && !panelDirty) {
        const prevMasterId = calendarTaskMasterId(dayPanelTaskId)
        const targetMasterId = calendarTaskMasterId(id)
        // Don't delete the same master that's about to be opened — clicking
        // a different occurrence of the current series shouldn't nuke it.
        if (prevMasterId !== targetMasterId) deleteCalendarTask(prevMasterId)
      }
      setAddTaskAnchorRect(anchorRect ?? null)
      setDayPanelTaskId(id)
    },
    [dayPanelTaskId, panelDirty, deleteCalendarTask],
  )

  function handleCreateTask(date: string, time: string) {
    dispatchCalendarSlotClick(date, time)
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

  const handleAddTaskForDay = useCallback(
    (day: Date, anchorRect?: DOMRect | null) => {
      const dateKey = toDateKey(day)
      const dayTasks = calendarTasks.filter((t) => t.date === dateKey)
      const startTime = nextStartForAppend(dayTasks)
      dispatchCalendarSlotClick(dateKey, startTime, anchorRect ?? null)
    },
    [calendarTasks, dispatchCalendarSlotClick],
  )

  // Drop the captured click anchor whenever the panel closes so the next
  // task open (e.g. tapping a chip) goes back to anchoring on the chip.
  useEffect(() => {
    if (!dayPanelTaskId) setAddTaskAnchorRect(null)
  }, [dayPanelTaskId])

  // Outside-calendar click on a clean stub → discard it.
  //
  // Calendar-surface clicks (grid, chip, month cell) are routed through the
  // dispatchers above, which already discard clean stubs and create/switch.
  // This effect handles the *other* case: if the open task is an empty stub
  // and the user clicks anything outside both the panel and the calendar
  // surface (sidebar, top nav, rail, header, etc.), the stub should vanish
  // — leaving stale "(No title)" rows behind feels broken. Dirty tasks are
  // preserved on outside-calendar clicks so the user doesn't lose typed work.
  useEffect(() => {
    if (!dayPanelTaskId || panelDirty) return
    const openId = dayPanelTaskId
    function onDocDown(e: MouseEvent) {
      const target = e.target as HTMLElement | null
      if (!target) return
      if (target.closest('[data-task-day-panel]')) return
      if (target.closest('[data-calendar-surface]')) return
      // Recurrence-end-date popover renders in a portal outside the panel
      // root; treat it as part of the panel so picking a date doesn't
      // self-discard the very task being edited.
      if (target.closest('[data-recurrence-date-popover]')) return
      const masterId = calendarTaskMasterId(openId)
      deleteCalendarTask(masterId)
      setDayPanelTaskId(null)
    }
    document.addEventListener('mousedown', onDocDown)
    return () => document.removeEventListener('mousedown', onDocDown)
  }, [dayPanelTaskId, panelDirty, deleteCalendarTask])

  useTasksShortcuts({
    view,
    scheduleMode,
    goToday,
    navigate,
    setView,
    setScheduleMode,
    addTask: handleAddTask,
  })

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
    <div className="flex h-[calc(100dvh-73px)] flex-col overflow-hidden px-4 pt-4 sm:h-[calc(100dvh-81px)] md:px-6">
      <div className="mb-3 flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => setMobileRailOpen(true)}
          className="ui-toolbar-icon lg:hidden"
          aria-label="Open schedule and calendar"
        >
          <PanelLeft className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={toggleDesktopRail}
          className="ui-toolbar-icon hidden lg:flex"
          aria-label={desktopRailOpen ? 'Hide panel' : 'Show panel'}
          title={desktopRailOpen ? 'Hide panel' : 'Show panel'}
        >
          <PanelLeft className="h-4 w-4" aria-hidden />
        </button>
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
        <span className="text-[14px] font-medium text-ink-primary">{dateLabel}</span>

        <div className="flex-1" />

        {/* Schedule mode: icon toggle pair (like GCal's calendar/check icons) */}
        <div className="flex items-center rounded-[10px] border border-surface-border bg-surface-card p-0.5 shadow-control">
          <button
            type="button"
            onClick={() => setScheduleMode('time')}
            title="Time view"
            aria-label="Time view"
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-[8px] transition-[background-color,color] duration-150',
              scheduleMode === 'time'
                ? 'bg-tasks-light text-tasks-text shadow-control'
                : 'text-ink-muted hover:bg-surface-muted hover:text-ink-secondary',
            )}
          >
            <CalendarDays className="h-3.5 w-3.5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setScheduleMode('task')}
            title="Task view"
            aria-label="Task view"
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-[8px] transition-[background-color,color] duration-150',
              scheduleMode === 'task'
                ? 'bg-tasks-light text-tasks-text shadow-control'
                : 'text-ink-muted hover:bg-surface-muted hover:text-ink-secondary',
            )}
          >
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>

        {/* View selector: GCal-style dropdown */}
        <MenuRoot>
          <MenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-[10px] border border-surface-border bg-surface-card px-3 py-1.5 text-[13px] font-medium text-ink-secondary shadow-control transition-[box-shadow,background-color] hover:bg-surface-muted hover:shadow-control-hover"
            >
              {VIEW_LABEL[view]}
              <ChevronDown className="h-3.5 w-3.5 text-ink-ghost" aria-hidden />
            </button>
          </MenuTrigger>
          <MenuContent align="end" className="min-w-[160px]">
            {([
              { v: 'day',   label: 'Day',   key: '1' },
              { v: 'week',  label: 'Week',  key: '2' },
              { v: 'month', label: 'Month', key: '3' },
            ] as { v: ViewMode; label: string; key: string }[]).map(({ v, label, key }) => (
              <MenuItem
                key={v}
                onSelect={() => setView(v)}
                className={cn(
                  'flex items-center justify-between',
                  view === v && 'font-medium text-tasks-text',
                )}
              >
                <span>{label}</span>
                <span className="ml-6 text-[11px] text-ink-ghost">{key}</span>
              </MenuItem>
            ))}
          </MenuContent>
        </MenuRoot>
        <button onClick={handleAddTask} className="btn-primary px-3 py-1.5 text-[12px]">
          + Add task
        </button>
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
        <div className={cn(
          'hidden lg:flex overflow-hidden shrink-0 transition-[width] duration-200 ease-in-out',
          desktopRailOpen ? 'w-[272px]' : 'w-0',
        )}>
          <TasksLeftRail variant="sidebar" {...railProps} mountMonthFocus={lgUp} />
        </div>

        <div data-calendar-surface className="relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-2xl border border-surface-border bg-surface-card pb-4">
        {scheduleMode === 'time' && view === 'day' && (
          <DayCalendarView
            date={selectedDate}
            tasks={displayCalendarTasks}
            prayerTimes={weekPrayerTimes[toDateKey(selectedDate)] ?? prayerTimes}
            focusedTaskId={dayPanelTaskId}
            onFocusedTaskIdChange={(id) => dispatchOpenTask(id)}
            onGridCreate={dispatchCalendarSlotClick}
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
            onFocusedTaskIdChange={(id) => dispatchOpenTask(id)}
            onGridCreate={dispatchCalendarSlotClick}
            addCalendarTask={addCalendarTask}
            updateCalendarTask={updateCalendarTask}
            toggleCalendarTask={toggleCalendarTask}
            onOpenDay={handleSelectDay}
            onTimeBlockDragSessionChange={setSuppressTaskPanelForDrag}
          />
        )}
        {scheduleMode === 'time' && view === 'month' && (
          <MonthView
            date={selectedDate}
            tasks={displayCalendarTasks}
            variant="time"
            onSelectDay={handleSelectDay}
            onOpenTask={(id, rect) => dispatchOpenTask(id, rect)}
            onAddTaskForDay={handleAddTaskForDay}
          />
        )}

        {scheduleMode === 'task' && view === 'day' && (
          <TaskScheduleDayList
            date={selectedDate}
            tasks={displayCalendarTasks}
            prayerTimes={weekPrayerTimes[toDateKey(selectedDate)] ?? prayerTimes}
            focusedTaskId={dayPanelTaskId}
            updateCalendarTask={updateCalendarTask}
            toggleCalendarTask={toggleCalendarTask}
            onFocusTask={(id) => dispatchOpenTask(id)}
          />
        )}
        {scheduleMode === 'task' && view === 'week' && (
          <TaskScheduleWeekBoard
            anchorDate={selectedDate}
            tasks={displayCalendarTasks}
            focusedTaskId={dayPanelTaskId}
            toggleCalendarTask={toggleCalendarTask}
            onFocusTask={(id) => dispatchOpenTask(id)}
            onOpenDay={handleSelectDay}
            onAddTaskForDay={handleAddTaskForDay}
          />
        )}
        {scheduleMode === 'task' && view === 'month' && (
          <MonthView
            date={selectedDate}
            tasks={displayCalendarTasks}
            variant="task"
            onSelectDay={handleSelectDay}
            onOpenTask={(id, rect) => dispatchOpenTask(id, rect)}
            onAddTaskForDay={handleAddTaskForDay}
          />
        )}
        </div>
      </div>

      {(view === 'day' || view === 'week' || view === 'month') &&
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
              fallbackAnchorRect={addTaskAnchorRect}
              weekdayDateLabel={weekdayDateLabel}
              recurrenceAnchorDateKey={master.date}
              onPatch={(patch) => updateCalendarTask(masterId, patch)}
              onDelete={() => {
                deleteCalendarTask(masterId)
                setDayPanelTaskId(null)
              }}
              onClose={() => setDayPanelTaskId(null)}
              onDirtyChange={setPanelDirty}
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
