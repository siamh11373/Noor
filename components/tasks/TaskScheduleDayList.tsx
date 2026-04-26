'use client'

import { useCallback, useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  defaultDropAnimationSideEffects,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DropAnimation,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { ChevronDown, ListChecks, Sparkles } from 'lucide-react'
import { toDateKey } from '@/lib/date'
import { groupCalendarTasksByPrayerSection, PRAYER_SECTION_SURFACE, type PrayerSectionKey } from '@/lib/prayer-sections'
import { applyOrdinalTimes } from '@/lib/task-schedule-order'
import { formatTimeDisplay, minutesToTime, TASK_PILLAR_STYLES, timeToMinutes } from '@/lib/tasks-calendar'
import { TaskPlannerSortableRow } from '@/components/tasks/TaskPlannerSortableRow'
import { CompletionCheckbox } from '@/components/ui/CompletionCheckbox'
import { cn } from '@/lib/utils'
import type { CalendarTask, PillarKey, PrayerTime } from '@/types'

const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5' } } }),
}

const PRAYER_SECTION_LABEL: Record<PrayerSectionKey, string> = {
  pre: 'Early',
  fajr: 'Fajr',
  dhuhr: 'Dhuhr',
  asr: 'Asr',
  maghrib: 'Maghrib',
  isha: 'Isha',
}

const PILLAR_ACCENT_BG: Record<PillarKey, string> = {
  faith: 'bg-faith',
  career: 'bg-tasks',
  fitness: 'bg-fitness',
  family: 'bg-family',
}

function endTimeLabel(startTime: string, durationMin: number): string {
  const endMins = timeToMinutes(startTime) + durationMin
  return formatTimeDisplay(minutesToTime(endMins))
}

function formatDurationShort(min: number): string {
  if (min <= 0) return ''
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

/** Friendly, non-cheesy microcopy keyed off completion ratio. */
function progressMicrocopy(done: number, total: number): string {
  if (total === 0) return 'A clean slate. Add a task to begin.'
  if (done === 0) return 'Fresh start — pick the first one.'
  if (done === total) return 'All done. Beautiful work.'
  if (total - done === 1) return 'One left. Finish strong.'
  const ratio = done / total
  if (ratio < 0.34) return 'Building momentum.'
  if (ratio < 0.67) return 'Halfway there — keep going.'
  return 'Almost there.'
}

function ProgressRing({ done, total, size = 48 }: { done: number; total: number; size?: number }) {
  const stroke = 4
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const ratio = total === 0 ? 0 : Math.min(1, done / total)
  const offset = c * (1 - ratio)
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="currentColor"
          strokeWidth={stroke}
          fill="none"
          className="text-surface-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="text-tasks-text transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[11px] font-semibold tabular-nums text-ink-primary">
          {total === 0 ? '0' : `${Math.round(ratio * 100)}%`}
        </span>
      </div>
    </div>
  )
}

export function TaskScheduleDayList({
  date,
  tasks,
  prayerTimes,
  focusedTaskId,
  updateCalendarTask,
  toggleCalendarTask,
  onFocusTask,
}: {
  date: Date
  tasks: CalendarTask[]
  prayerTimes: PrayerTime[]
  focusedTaskId?: string | null
  updateCalendarTask: (id: string, patch: Partial<Omit<CalendarTask, 'id'>>) => void
  toggleCalendarTask: (id: string) => void
  onFocusTask: (id: string) => void
}) {
  const dateStr = toDateKey(date)
  const dayTasks = useMemo(() => {
    const list = tasks.filter((t) => t.date === dateStr)
    list.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
    return list
  }, [tasks, dateStr])

  const openTasks = useMemo(() => dayTasks.filter((t) => !t.completed), [dayTasks])
  const doneTasks = useMemo(() => dayTasks.filter((t) => t.completed), [dayTasks])

  const byId = useMemo(() => new Map(dayTasks.map((t) => [t.id, t])), [dayTasks])
  // The first open task is rendered as the focus card (not a sortable). Drag
  // ordering only spans the remaining open rows that actually render inside
  // SortableContext, so ids must mirror that subset to keep dnd-kit happy.
  const focusTask = openTasks[0]
  const sortableTasks = useMemo(
    () => (focusTask ? openTasks.filter((t) => t.id !== focusTask.id) : openTasks),
    [openTasks, focusTask],
  )
  const ids = useMemo(() => sortableTasks.map((t) => t.id), [sortableTasks])

  const [activeId, setActiveId] = useState<string | null>(null)
  const [doneOpen, setDoneOpen] = useState(false)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const commitOrder = useCallback(
    (orderedIds: string[]) => {
      // Focus task always stays at index 0 so its synthetic ordinal time
      // remains the earliest; sortable rows fill in after it.
      const fullOrder = focusTask ? [focusTask.id, ...orderedIds] : orderedIds
      const ordered = fullOrder.map((id) => byId.get(id)).filter(Boolean) as CalendarTask[]
      const updates = applyOrdinalTimes(ordered)
      for (const u of updates) {
        updateCalendarTask(u.id, { startTime: u.startTime })
      }
    },
    [byId, focusTask, updateCalendarTask],
  )

  const onDragStart = useCallback((e: DragStartEvent) => {
    setActiveId(String(e.active.id))
  }, [])

  const onDragEnd = useCallback(
    (e: DragEndEvent) => {
      setActiveId(null)
      const { active, over } = e
      if (!over || active.id === over.id) return
      const oldIndex = ids.indexOf(String(active.id))
      const newIndex = ids.indexOf(String(over.id))
      if (oldIndex < 0 || newIndex < 0) return
      const next = arrayMove(ids, oldIndex, newIndex)
      commitOrder(next)
    },
    [commitOrder, ids],
  )

  const activeTask = activeId ? byId.get(activeId) : undefined

  const sectionGroups = useMemo(
    () => groupCalendarTasksByPrayerSection(sortableTasks, prayerTimes),
    [sortableTasks, prayerTimes],
  )

  const total = dayTasks.length
  const done = doneTasks.length

  const dateLabelMain = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const dateLabelSub = date.toLocaleDateString('en-US', { year: 'numeric' })

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div data-task-day-grid className="h-full min-h-0 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
          {/* Day header */}
          <header className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="truncate text-[20px] font-semibold leading-tight text-ink-primary sm:text-[22px]">
                {dateLabelMain}
              </h2>
              <p className="mt-0.5 text-[12px] text-ink-ghost">
                {dateLabelSub} · {progressMicrocopy(done, total)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <div className="text-right">
                <p className="text-[11px] font-medium uppercase tracking-wider text-ink-ghost">Progress</p>
                <p className="text-[13px] font-semibold tabular-nums text-ink-primary">
                  {done}<span className="text-ink-ghost"> / {total}</span>
                </p>
              </div>
              <ProgressRing done={done} total={total} />
            </div>
          </header>

          {/* Up next focus card */}
          {focusTask && (
            <FocusCard
              task={focusTask}
              isSelected={focusedTaskId === focusTask.id}
              onOpen={() => onFocusTask(focusTask.id)}
              onToggle={() => toggleCalendarTask(focusTask.id)}
            />
          )}

          {/* Empty state (no tasks at all) */}
          {dayTasks.length === 0 && <EmptyState />}

          {/* Grouped open list (focus task already shown above) */}
          {sortableTasks.length > 0 && (
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-4">
                {sectionGroups.map((g, gi) => (
                  <section key={`${g.section}-${gi}`} className="flex flex-col gap-2">
                    <div className="flex items-center gap-3 px-1">
                      <span className={cn('inline-block h-1.5 w-1.5 rounded-full', sectionDotClass(g.section))} aria-hidden />
                      <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                        {PRAYER_SECTION_LABEL[g.section]}
                      </h3>
                      <span className="text-[11px] font-medium tabular-nums text-ink-ghost">{g.tasks.length}</span>
                      <div className="ml-1 h-px flex-1 bg-surface-border/60" />
                    </div>
                    <div
                      className={cn(
                        'flex flex-col gap-2 rounded-2xl px-3 py-3 sm:px-4',
                        PRAYER_SECTION_SURFACE[g.section],
                      )}
                    >
                      {g.tasks.map((t) => (
                        <TaskPlannerSortableRow
                          key={t.id}
                          task={t}
                          isSelected={focusedTaskId === t.id}
                          onOpen={() => onFocusTask(t.id)}
                          onToggle={() => toggleCalendarTask(t.id)}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </SortableContext>
          )}

          {/* Done section */}
          {doneTasks.length > 0 && (
            <section className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setDoneOpen((v) => !v)}
                className="flex items-center gap-2 self-start rounded-lg px-1 py-1 text-[12px] font-medium text-ink-muted transition-colors hover:text-ink-secondary"
                aria-expanded={doneOpen}
              >
                <ChevronDown
                  className={cn('h-3.5 w-3.5 transition-transform duration-200', !doneOpen && '-rotate-90')}
                  aria-hidden
                />
                <span>Done</span>
                <span className="rounded-full bg-surface-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-ink-muted">
                  {doneTasks.length}
                </span>
              </button>
              {doneOpen && (
                <div className="flex flex-col gap-1.5">
                  {doneTasks.map((t) => (
                    <DoneRow
                      key={t.id}
                      task={t}
                      isSelected={focusedTaskId === t.id}
                      onOpen={() => onFocusTask(t.id)}
                      onToggle={() => toggleCalendarTask(t.id)}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
      <DragOverlay dropAnimation={dropAnimation}>
        {activeTask ? (
          <div className="rounded-xl border border-surface-border bg-surface-card px-3 py-2 shadow-lg">
            <p className="text-[13px] font-medium text-ink-primary">{activeTask.title || '(No title)'}</p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

function sectionDotClass(section: PrayerSectionKey): string {
  switch (section) {
    case 'fajr':
      return 'bg-prayerSection-fajr ring-1 ring-surface-border'
    case 'dhuhr':
      return 'bg-prayerSection-dhuhr ring-1 ring-surface-border'
    case 'asr':
      return 'bg-prayerSection-asr ring-1 ring-surface-border'
    case 'maghrib':
      return 'bg-prayerSection-maghrib ring-1 ring-surface-border'
    case 'isha':
      return 'bg-prayerSection-isha ring-1 ring-surface-border'
    default:
      return 'bg-surface-muted ring-1 ring-surface-border'
  }
}

function FocusCard({
  task,
  isSelected,
  onOpen,
  onToggle,
}: {
  task: CalendarTask
  isSelected: boolean
  onOpen: () => void
  onToggle: () => void
}) {
  const colors = TASK_PILLAR_STYLES[task.pillar]
  const title = task.title.trim() === '' || task.title === '(No title)' ? '(No title)' : task.title
  const range = `${formatTimeDisplay(task.startTime)} – ${endTimeLabel(task.startTime, task.duration)}`
  return (
    <div
      data-task-panel-anchor={task.id}
      className={cn(
        'group relative overflow-hidden rounded-2xl border bg-surface-card shadow-sm transition-shadow duration-150 hover:shadow-md',
        colors.border,
        isSelected && 'ring-1 ring-brand-400/40 shadow-md',
      )}
    >
      <span aria-hidden className={cn('absolute inset-y-0 left-0 w-[4px]', PILLAR_ACCENT_BG[task.pillar])} />
      <div className="flex items-start gap-3 py-4 pl-5 pr-4">
        <CompletionCheckbox
          checked={task.completed}
          onChange={onToggle}
          size="md"
          colorClass="border-faith bg-faith"
          aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
          className="mt-0.5 shrink-0"
        />
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3 w-3 shrink-0 text-tasks-text" aria-hidden />
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-tasks-text">Up next</span>
          </div>
          <p className="mt-1 break-words text-[16px] font-semibold leading-snug text-ink-primary">{title}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium tabular-nums text-ink-secondary">
              {range}
            </span>
            {task.duration > 0 && (
              <span className="rounded-full bg-surface-muted/70 px-2 py-0.5 text-[11px] font-medium text-ink-muted">
                {formatDurationShort(task.duration)}
              </span>
            )}
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize',
                colors.bg,
                colors.text,
              )}
            >
              {task.pillar === 'career' ? 'Tasks' : task.pillar}
            </span>
          </div>
        </button>
      </div>
    </div>
  )
}

function DoneRow({
  task,
  isSelected,
  onOpen,
  onToggle,
}: {
  task: CalendarTask
  isSelected: boolean
  onOpen: () => void
  onToggle: () => void
}) {
  const title = task.title.trim() === '' || task.title === '(No title)' ? '(No title)' : task.title
  return (
    <div
      data-task-panel-anchor={task.id}
      className={cn(
        'flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-muted/60',
        isSelected && 'bg-surface-muted/80 ring-1 ring-brand-400/30',
      )}
    >
      <CompletionCheckbox
        checked={task.completed}
        onChange={onToggle}
        size="sm"
        colorClass="border-faith bg-faith"
        aria-label="Mark incomplete"
        className="shrink-0 rounded"
      />
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <span className="block truncate text-[12px] text-ink-muted line-through">{title}</span>
      </button>
      <span className="shrink-0 text-[10px] tabular-nums text-ink-ghost">{formatTimeDisplay(task.startTime)}</span>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-surface-border bg-surface-card/40 px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted text-ink-muted">
        <ListChecks className="h-5 w-5" aria-hidden />
      </div>
      <div>
        <p className="text-[14px] font-medium text-ink-primary">Nothing scheduled today</p>
        <p className="mt-1 text-[12px] text-ink-ghost">Use <span className="font-medium text-ink-secondary">+ Add task</span> to plan your day.</p>
      </div>
    </div>
  )
}
