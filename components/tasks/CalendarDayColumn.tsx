'use client'

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  clampTaskToDay,
  DAY_END_MINUTES,
  DAY_START_MINUTES,
  DEFAULT_NEW_TASK_MINUTES,
  formatHour,
  formatTimeDisplay,
  HOUR_GUIDE_GRADIENT,
  HOUR_HEIGHT,
  MIN_DURATION_MIN,
  minutesToTime,
  prayerToMinutes,
  snapMinutes,
  snapMinutesFloor,
  START_HOUR,
  TASK_PILLAR_STYLES,
  timeToMinutes,
  TOTAL_HOURS,
} from '@/lib/tasks-calendar'
import { hasActiveRecurrence } from '@/lib/task-recurrence'
import { buildPrayerTimelineGradientImage } from '@/lib/prayer-sections'
import { cn } from '@/lib/utils'
import type { CalendarTask, PrayerTime } from '@/types'

const DRAG_THRESHOLD_PX = 6
const INSTANT_TITLE = '(No title)'

export type WeekDragPreview = { id: string; startTime: string; duration: number; date?: string }

/** Pick weekday column from pointer X (avoids elementFromPoint hitting the dragged task). */
function resolveWeekColumnDate(scrollEl: HTMLDivElement, clientX: number): string | null {
  const row = scrollEl.querySelector('[data-week-timeline-row]')
  if (!row) return null
  const cols = row.querySelectorAll<HTMLElement>('[data-calendar-column-date]')
  for (const el of cols) {
    const r = el.getBoundingClientRect()
    if (clientX >= r.left && clientX < r.right) {
      return el.getAttribute('data-calendar-column-date')
    }
  }
  return null
}

function mergePreview(task: CalendarTask, live: WeekDragPreview | null): CalendarTask {
  if (live && live.id === task.id) {
    return {
      ...task,
      startTime: live.startTime,
      duration: live.duration,
      ...(live.date ? { date: live.date } : {}),
    }
  }
  return task
}

export type CalendarDayColumnVariant = 'day' | 'week'

export function CalendarDayColumn({
  variant,
  dateStr,
  dayDate,
  tasks,
  prayerTimes,
  focusedTaskId,
  onFocusedTaskIdChange,
  addCalendarTask,
  updateCalendarTask,
  toggleCalendarTask,
  scrollParentRef,
  weekDragPreview = null,
  setWeekDragPreview,
  /** While true, parent may hide the task detail panel so it does not overlap the drag. */
  onTimeBlockDragSessionChange,
}: {
  variant: CalendarDayColumnVariant
  dateStr: string
  dayDate: Date
  tasks: CalendarTask[]
  prayerTimes: PrayerTime[]
  focusedTaskId: string | null
  onFocusedTaskIdChange: (id: string | null) => void
  addCalendarTask: (task: Omit<CalendarTask, 'id'>) => string
  updateCalendarTask: (id: string, patch: Partial<Omit<CalendarTask, 'id'>>) => void
  toggleCalendarTask: (id: string) => void
  scrollParentRef: React.RefObject<HTMLDivElement | null>
  /** Week only: lifted state so drag preview shows in the destination column. */
  weekDragPreview?: WeekDragPreview | null
  setWeekDragPreview?: (v: WeekDragPreview | null) => void
  onTimeBlockDragSessionChange?: (active: boolean) => void
}) {
  const onTimeBlockDragSessionChangeRef = useRef(onTimeBlockDragSessionChange)
  onTimeBlockDragSessionChangeRef.current = onTimeBlockDragSessionChange
  const [internalLive, setInternalLive] = useState<WeekDragPreview | null>(null)
  const liveOverride = variant === 'week' ? weekDragPreview : internalLive
  const publishPreview = useCallback(
    (v: WeekDragPreview | null) => {
      if (variant === 'week' && setWeekDragPreview) setWeekDragPreview(v)
      else setInternalLive(v)
    },
    [variant, setWeekDragPreview],
  )

  const pendingGeomRef = useRef<WeekDragPreview | null>(null)

  const dragRef = useRef<{
    taskId: string
    pointerId: number
    originY: number
    mode: 'pending-move' | 'move' | 'resize-top' | 'resize-bottom'
    initialStartMins: number
    initialDurationMin: number
  } | null>(null)

  const dayTasks = useMemo(() => {
    const list = tasks.filter((t) => t.date === dateStr)
    if (variant !== 'week' || !liveOverride?.id) return list

    const dragged = tasks.find((t) => t.id === liveOverride.id)
    if (!dragged) return list

    const previewDate = liveOverride.date ?? dragged.date

    if (dragged.date === dateStr && previewDate !== dateStr) {
      return list.filter((t) => t.id !== liveOverride.id)
    }

    if (previewDate === dateStr && dragged.date !== dateStr) {
      const merged = mergePreview(dragged, liveOverride)
      if (!list.some((t) => t.id === liveOverride.id)) {
        return [...list, merged]
      }
    }

    return list.map((t) => (t.id === liveOverride.id ? mergePreview(t, liveOverride) : t))
  }, [tasks, dateStr, variant, liveOverride])

  const orderedTasks = useMemo(() => {
    const arr = [...dayTasks]
    arr.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
    const liftId = liveOverride?.id ?? focusedTaskId
    if (liftId) {
      const i = arr.findIndex((t) => t.id === liftId)
      if (i >= 0) {
        const [x] = arr.splice(i, 1)
        arr.push(x)
      }
    }
    return arr
  }, [dayTasks, focusedTaskId, liveOverride])

  const now = new Date()
  const isToday =
    dayDate.getFullYear() === now.getFullYear() &&
    dayDate.getMonth() === now.getMonth() &&
    dayDate.getDate() === now.getDate()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  const commitPreview = useCallback(() => {
    const p = pendingGeomRef.current
    if (p) {
      const patch: Partial<Omit<CalendarTask, 'id'>> = { startTime: p.startTime, duration: p.duration }
      if (p.date) patch.date = p.date
      updateCalendarTask(p.id, patch)
    }
    pendingGeomRef.current = null
    publishPreview(null)
  }, [publishPreview, updateCalendarTask])

  const endDragSession = useCallback(() => {
    dragRef.current = null
    pendingGeomRef.current = null
    publishPreview(null)
    document.body.style.cursor = ''
  }, [publishPreview])

  const dragListenersCleanup = useRef<null | (() => void)>(null)
  const skipNextGridClickRef = useRef(false)

  const clearWindowDragListeners = useCallback(() => {
    dragListenersCleanup.current?.()
    dragListenersCleanup.current = null
  }, [])

  const handleGridClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (skipNextGridClickRef.current) {
        skipNextGridClickRef.current = false
        return
      }
      if (dragRef.current) return
      const sc = scrollParentRef.current
      if (!sc) return
      // Use the scroll viewport (not the click layer rect) so scrollTop is not applied twice —
      // the layer's getBoundingClientRect().top already moves with scroll.
      const y = e.clientY - sc.getBoundingClientRect().top + sc.scrollTop
      const minuteOffset = (y / HOUR_HEIGHT) * 60 + DAY_START_MINUTES
      const snapped = snapMinutesFloor(minuteOffset)
      const startMins = Math.min(Math.max(snapped, DAY_START_MINUTES), DAY_END_MINUTES - DEFAULT_NEW_TASK_MINUTES)
      const id = addCalendarTask({
        title: INSTANT_TITLE,
        date: dateStr,
        startTime: minutesToTime(startMins),
        duration: DEFAULT_NEW_TASK_MINUTES,
        pillar: 'career',
        completed: false,
      })
      onFocusedTaskIdChange(id)
    },
    [addCalendarTask, dateStr, onFocusedTaskIdChange, scrollParentRef],
  )

  const attachDragListeners = useCallback(() => {
    clearWindowDragListeners()

    const onMove = (ev: PointerEvent) => {
      const d = dragRef.current
      if (!d || ev.pointerId !== d.pointerId) return

      const dy = ev.clientY - d.originY
      const deltaMins = (dy / HOUR_HEIGHT) * 60

      if (d.mode === 'pending-move') {
        if (Math.abs(ev.clientY - d.originY) < DRAG_THRESHOLD_PX) return
        d.mode = 'move'
        document.body.style.cursor = 'grabbing'
        onTimeBlockDragSessionChangeRef.current?.(true)
      }

      if (d.mode === 'move') {
        if (variant === 'week') {
          const scrollEl = scrollParentRef.current
          if (scrollEl) {
            // Vertical: delta from grab point (same as day) so the block stays under the cursor.
            const raw = d.initialStartMins + deltaMins
            const snapped = snapMinutes(raw)
            const c = clampTaskToDay(snapped, d.initialDurationMin)
            // Horizontal: which column contains the pointer (geometry, not hit-testing the task).
            const dragged = tasks.find((t) => t.id === d.taskId)
            const fromStore = dragged?.date
            const resolvedCol =
              resolveWeekColumnDate(scrollEl, ev.clientX) ??
              pendingGeomRef.current?.date ??
              fromStore ??
              dateStr
            const lockWeekColumn = Boolean(dragged && hasActiveRecurrence(dragged))
            const nextDate = lockWeekColumn ? (fromStore ?? dateStr) : resolvedCol
            const next: WeekDragPreview = {
              id: d.taskId,
              startTime: minutesToTime(c.startMins),
              duration: c.durationMin,
              date: nextDate,
            }
            pendingGeomRef.current = next
            publishPreview(next)
          }
          return
        }

        const raw = d.initialStartMins + deltaMins
        const snapped = snapMinutes(raw)
        const c = clampTaskToDay(snapped, d.initialDurationMin)
        const next: WeekDragPreview = {
          id: d.taskId,
          startTime: minutesToTime(c.startMins),
          duration: c.durationMin,
        }
        pendingGeomRef.current = next
        publishPreview(next)
        return
      }

      if (d.mode === 'resize-bottom') {
        const rawDur = d.initialDurationMin + deltaMins
        const snappedDur = Math.max(MIN_DURATION_MIN, snapMinutes(rawDur))
        const c = clampTaskToDay(d.initialStartMins, snappedDur)
        const weekDate =
          variant === 'week'
            ? (pendingGeomRef.current?.date ?? tasks.find((t) => t.id === d.taskId)?.date)
            : undefined
        const next: WeekDragPreview = {
          id: d.taskId,
          startTime: minutesToTime(c.startMins),
          duration: c.durationMin,
          ...(weekDate ? { date: weekDate } : {}),
        }
        pendingGeomRef.current = next
        publishPreview(next)
        return
      }

      if (d.mode === 'resize-top') {
        const endMins = d.initialStartMins + d.initialDurationMin
        const rawStart = d.initialStartMins + deltaMins
        const snappedStart = snapMinutes(rawStart)
        let newDur = endMins - snappedStart
        if (newDur < MIN_DURATION_MIN) {
          newDur = MIN_DURATION_MIN
        }
        const c = clampTaskToDay(snappedStart, newDur)
        const weekDate =
          variant === 'week'
            ? (pendingGeomRef.current?.date ?? tasks.find((t) => t.id === d.taskId)?.date)
            : undefined
        const next: WeekDragPreview = {
          id: d.taskId,
          startTime: minutesToTime(c.startMins),
          duration: c.durationMin,
          ...(weekDate ? { date: weekDate } : {}),
        }
        pendingGeomRef.current = next
        publishPreview(next)
      }
    }

    const onUp = (ev: PointerEvent) => {
      const d = dragRef.current
      if (!d || ev.pointerId !== d.pointerId) return
      clearWindowDragListeners()
      document.body.style.cursor = ''

      try {
        if (d.mode === 'pending-move') {
          onFocusedTaskIdChange(d.taskId)
          endDragSession()
          return
        }

        const hit = document.elementFromPoint(ev.clientX, ev.clientY)
        if (hit?.closest('[data-task-day-grid]') && !hit.closest('[data-task-block]')) {
          skipNextGridClickRef.current = true
        }
        commitPreview()
        dragRef.current = null
      } finally {
        onTimeBlockDragSessionChangeRef.current?.(false)
      }
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    dragListenersCleanup.current = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [
    clearWindowDragListeners,
    commitPreview,
    dateStr,
    endDragSession,
    onFocusedTaskIdChange,
    publishPreview,
    scrollParentRef,
    tasks,
    variant,
  ])

  function onTaskBodyPointerDown(e: React.PointerEvent, task: CalendarTask) {
    e.stopPropagation()
    if (e.button !== 0) return
    const t0 = mergePreview(task, liveOverride)
    const initialStartMins = timeToMinutes(t0.startTime)
    const initialDurationMin = t0.duration
    document.body.style.cursor = 'grab'
    dragRef.current = {
      taskId: task.id,
      pointerId: e.pointerId,
      originY: e.clientY,
      mode: 'pending-move',
      initialStartMins,
      initialDurationMin,
    }
    attachDragListeners()
  }

  function onResizeTopPointerDown(e: React.PointerEvent, task: CalendarTask) {
    e.stopPropagation()
    if (e.button !== 0) return
    const t0 = mergePreview(task, liveOverride)
    document.body.style.cursor = 'ns-resize'
    dragRef.current = {
      taskId: task.id,
      pointerId: e.pointerId,
      originY: e.clientY,
      mode: 'resize-top',
      initialStartMins: timeToMinutes(t0.startTime),
      initialDurationMin: t0.duration,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    attachDragListeners()
    onTimeBlockDragSessionChangeRef.current?.(true)
  }

  function onResizeBottomPointerDown(e: React.PointerEvent, task: CalendarTask) {
    e.stopPropagation()
    if (e.button !== 0) return
    const t0 = mergePreview(task, liveOverride)
    document.body.style.cursor = 'ns-resize'
    dragRef.current = {
      taskId: task.id,
      pointerId: e.pointerId,
      originY: e.clientY,
      mode: 'resize-bottom',
      initialStartMins: timeToMinutes(t0.startTime),
      initialDurationMin: t0.duration,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    attachDragListeners()
    onTimeBlockDragSessionChangeRef.current?.(true)
  }

  useEffect(
    () => () => {
      clearWindowDragListeners()
      onTimeBlockDragSessionChangeRef.current?.(false)
    },
    [clearWindowDragListeners],
  )

  const isWeek = variant === 'week'

  /** Week only: persisted slot (from store) while a live preview differs — Google-style “holo”. */
  const totalGridHeight = TOTAL_HOURS * HOUR_HEIGHT
  const prayerBackgroundImage = useMemo(
    () => buildPrayerTimelineGradientImage(prayerTimes, totalGridHeight),
    [prayerTimes, totalGridHeight],
  )

  const weekDragGhost = useMemo(() => {
    if (variant !== 'week' || !liveOverride) return null
    const origin = tasks.find((t) => t.id === liveOverride.id)
    if (!origin || origin.date !== dateStr) return null
    const previewDate = liveOverride.date ?? origin.date
    const moved =
      previewDate !== origin.date ||
      liveOverride.startTime !== origin.startTime ||
      liveOverride.duration !== origin.duration
    if (!moved) return null
    return origin
  }, [variant, liveOverride, tasks, dateStr])

  const inner = (
    <div className="relative" style={{ height: totalGridHeight }}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-0"
        style={{
          height: totalGridHeight,
          backgroundImage: prayerBackgroundImage,
          backgroundRepeat: 'no-repeat',
          backgroundSize: '100% 100%',
        }}
      />
      {!isWeek && (
        <>
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-[1]"
            style={{ height: totalGridHeight }}
            aria-hidden
          >
            {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
              <div
                key={`hg-${i}`}
                className="absolute"
                style={{
                  left: 'calc(4rem - 8px)',
                  right: 0,
                  top: i * HOUR_HEIGHT,
                  transform: 'translateY(-50%)',
                  height: 1,
                  background: HOUR_GUIDE_GRADIENT,
                }}
              />
            ))}
          </div>
          <div
            className="pointer-events-none absolute left-0 top-0 z-[2] w-16 border-r border-surface-border/80"
            style={{ height: totalGridHeight }}
            aria-hidden
          >
            {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
              <div
                key={`tl-${i}`}
                className="absolute left-0 right-0 flex justify-end pr-3"
                style={{ top: i * HOUR_HEIGHT, transform: 'translateY(-50%)' }}
              >
                <span className="text-[11px] tabular-nums tracking-tight text-ink-ghost">
                  {formatHour(START_HOUR + i)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <div
        className={cn('absolute z-[15] cursor-pointer', isWeek ? 'inset-0' : 'inset-0 left-16')}
        onClick={handleGridClick}
      />

      {weekDragGhost &&
        (() => {
          const g = weekDragGhost
          const startMins = timeToMinutes(g.startTime)
          const top = ((startMins - START_HOUR * 60) / 60) * HOUR_HEIGHT
          const height = Math.max((g.duration / 60) * HOUR_HEIGHT, isWeek ? 20 : 22)
          const colors = TASK_PILLAR_STYLES[g.pillar]
          const titleShow = g.title.trim() === '' || g.title === INSTANT_TITLE ? INSTANT_TITLE : g.title
          return (
            <div
              key={`${g.id}-week-holo`}
              aria-hidden
              className={cn(
                'pointer-events-none absolute z-[40] flex flex-col overflow-hidden rounded-lg border border-dashed px-0',
                isWeek ? 'inset-x-0.5 text-[10px]' : 'left-[72px] right-2',
                colors.bg,
                colors.border,
                g.completed && 'opacity-40',
                'opacity-[0.48] shadow-none saturate-[0.85]',
              )}
              style={{ top: Math.max(top, 0), height }}
            >
              <div className="h-1.5 shrink-0" />
              <div className="min-h-0 flex-1 select-none px-2 py-0.5">
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      'flex shrink-0 rounded border-[1.5px] border-current opacity-35',
                      isWeek ? 'h-3.5 w-3.5' : 'h-4 w-4',
                    )}
                  />
                  <span
                    className={cn(
                      'truncate font-medium',
                      isWeek ? 'text-[10px]' : 'text-[12px]',
                      colors.text,
                      g.completed && 'line-through',
                    )}
                  >
                    {titleShow}
                  </span>
                </div>
                {height > (isWeek ? 28 : 34) && (
                  <p className={cn('mt-0.5 opacity-50', isWeek ? 'pl-5 text-[8px]' : 'pl-6 text-[10px]')}>
                    {formatTimeDisplay(g.startTime)} –{' '}
                    {formatTimeDisplay(minutesToTime(startMins + g.duration))}
                  </p>
                )}
              </div>
              <div className="h-1.5 shrink-0" />
            </div>
          )
        })()}

      {orderedTasks.map((task) => {
        const disp = mergePreview(task, liveOverride)
        const startMins = timeToMinutes(disp.startTime)
        const top = ((startMins - START_HOUR * 60) / 60) * HOUR_HEIGHT
        const height = Math.max((disp.duration / 60) * HOUR_HEIGHT, isWeek ? 20 : 22)
        const colors = TASK_PILLAR_STYLES[disp.pillar]
        const selected = focusedTaskId === task.id
        const titleShow = disp.title.trim() === '' || disp.title === INSTANT_TITLE ? INSTANT_TITLE : disp.title
        const isLiveWeekDrag = isWeek && liveOverride?.id === task.id

        return (
          <div
            key={task.id}
            className={cn(
              'absolute flex flex-col overflow-hidden rounded-lg border px-0 transition-shadow duration-150',
              isWeek ? 'inset-x-0.5 text-[10px]' : 'left-[72px] right-2',
              colors.bg,
              colors.border,
              disp.completed && 'opacity-50',
              selected
                ? 'z-[42] shadow-md ring-1 ring-brand-400/40'
                : isLiveWeekDrag
                  ? 'z-[40] shadow-lg ring-1 ring-brand-400/30'
                  : 'z-[32] hover:shadow-card-hover',
            )}
            style={{ top: Math.max(top, 0), height }}
            data-task-block
            data-task-panel-anchor={task.id}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              role="presentation"
              className="h-1.5 shrink-0 cursor-ns-resize touch-none hover:bg-black/5 dark:hover:bg-white/10"
              onPointerDown={(e) => onResizeTopPointerDown(e, task)}
            />

            <div
              role="presentation"
              className={cn(
                'min-h-0 flex-1 cursor-grab select-none px-2 py-0.5 active:cursor-grabbing',
                isWeek ? 'py-0.5' : '',
              )}
              onPointerDown={(e) => onTaskBodyPointerDown(e, task)}
            >
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleCalendarTask(task.id)
                  }}
                  className={cn(
                    'flex shrink-0 cursor-pointer items-center justify-center rounded border-[1.5px]',
                    isWeek ? 'h-3.5 w-3.5' : 'h-4 w-4',
                    disp.completed ? 'border-faith bg-faith' : 'border-current opacity-40',
                  )}
                >
                  {disp.completed && (
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path
                        d="M1.5 4l1.5 1.5 3-3"
                        stroke="white"
                        strokeWidth="1.3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
                <span
                  className={cn(
                    'truncate font-medium',
                    isWeek ? 'text-[10px]' : 'text-[12px]',
                    colors.text,
                    disp.completed && 'line-through',
                  )}
                >
                  {titleShow}
                </span>
              </div>
              {height > (isWeek ? 28 : 34) && (
                <p className={cn('mt-0.5 opacity-60', isWeek ? 'pl-5 text-[8px]' : 'pl-6 text-[10px]')}>
                  {formatTimeDisplay(disp.startTime)} – {formatTimeDisplay(minutesToTime(startMins + disp.duration))}
                </p>
              )}
            </div>

            <div
              role="presentation"
              className="h-1.5 shrink-0 cursor-ns-resize touch-none hover:bg-black/5 dark:hover:bg-white/10"
              onPointerDown={(e) => onResizeBottomPointerDown(e, task)}
            />
          </div>
        )
      })}

      {/* Single overlay stacking context — sits above all task blocks regardless of their z-index
          or GPU compositing layer. pointer-events-none so drag/click passes through to tasks/grid. */}
      <div className="pointer-events-none absolute inset-0" style={{ zIndex: 200 }}>
        {prayerTimes.map((pt) => {
          const mins = prayerToMinutes(pt)
          if (mins === null) return null
          const top = ((mins - START_HOUR * 60) / 60) * HOUR_HEIGHT
          if (top < 0 || top > TOTAL_HOURS * HOUR_HEIGHT) return null
          const inset = isWeek ? 'inset-x-0.5' : 'inset-x-0 pl-16'
          return (
            <Fragment key={pt.name}>
              {/* Prayer separator line */}
              <div
                className={cn('absolute', inset)}
                style={{ top, transform: 'translateY(-50%)' }}
              >
                <div className="h-[2px] w-full rounded-full bg-gradient-to-r from-faith/85 via-faith/50 to-faith/15" />
              </div>
              {/* Prayer label pill — no backdrop-blur to avoid GPU compositing layer reordering */}
              <div
                className={cn('absolute flex items-center', inset)}
                style={{ top, transform: 'translateY(-50%)' }}
              >
                <div
                  className={cn(
                    'flex items-center gap-1 rounded-md border border-faith-border/60 bg-faith-light shadow-sm',
                    isWeek ? 'flex-1 px-1.5 py-0.5' : 'flex-1 gap-2 px-3 py-1',
                  )}
                >
                  <span className={cn('font-semibold text-faith-text', isWeek ? 'truncate text-[8px]' : 'text-[10px]')}>
                    {pt.displayName}
                  </span>
                  <span className={cn('text-faith-text/60', isWeek ? 'shrink-0 text-[7px]' : 'text-[10px]')}>
                    {pt.formattedTime}
                  </span>
                </div>
              </div>
            </Fragment>
          )
        })}

        {/* Current time indicator — rendered after prayers so it paints above them if they coincide */}
        {isToday && (
          <div
            className={cn(
              'absolute inset-x-0 flex items-center gap-0',
              isWeek ? 'px-0.5' : 'pl-14',
            )}
            style={{
              top: ((currentMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT,
              transform: 'translateY(-50%)',
            }}
          >
            <div
              className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-surface-border bg-surface-card shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.35)]"
              aria-hidden
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- tiny inline badge; public asset */}
              <img src="/logo.png" alt="" width={28} height={28} className="h-7 w-7 rounded-full object-cover" />
            </div>
            <div className="min-h-0 flex-1 border-t-[2.5px] border-ink-primary" />
          </div>
        )}
      </div>
    </div>
  )

  if (isWeek) {
    return (
      <div data-task-day-grid className="relative min-h-0 min-w-0 flex-1">
        {inner}
      </div>
    )
  }

  return inner
}
