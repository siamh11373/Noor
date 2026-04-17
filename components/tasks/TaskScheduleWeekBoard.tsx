'use client'

import { useCallback, useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  defaultDropAnimationSideEffects,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DropAnimation,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { toDateKey } from '@/lib/date'
import { applyOrdinalTimes } from '@/lib/task-schedule-order'
import { TaskPlannerSortableRow } from '@/components/tasks/TaskPlannerSortableRow'
import { timeToMinutes } from '@/lib/tasks-calendar'
import { cn } from '@/lib/utils'
import type { CalendarTask } from '@/types'

const DAY_PREFIX = '__day__'

function dayDroppableId(dateKey: string) {
  return `${DAY_PREFIX}${dateKey}`
}

function parseDayDroppable(id: string): string | null {
  return id.startsWith(DAY_PREFIX) ? id.slice(DAY_PREFIX.length) : null
}

function findDayForTaskId(snapshot: Record<string, string[]>, taskId: string): string | null {
  for (const [k, ids] of Object.entries(snapshot)) {
    if (ids.includes(taskId)) return k
  }
  return null
}

const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5' } } }),
}

function DayColumn({
  dateKey,
  tasks,
  focusedTaskId,
  isToday,
  dayLabel,
  dayNum,
  onOpenDay,
  onOpenTask,
  onToggleTask,
}: {
  dateKey: string
  tasks: CalendarTask[]
  focusedTaskId: string | null
  isToday: boolean
  dayLabel: string
  dayNum: number
  onOpenDay: () => void
  onOpenTask: (t: CalendarTask) => void
  onToggleTask: (id: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: dayDroppableId(dateKey) })
  const ids = tasks.map((t) => t.id)

  return (
    <div className={cn('flex min-w-0 flex-1 flex-col border-l border-surface-border', isToday && 'bg-brand-50/25')}>
      <button
        type="button"
        onClick={onOpenDay}
        className="shrink-0 border-b border-surface-border px-1 py-2 text-center transition-colors hover:bg-surface-muted/40"
      >
        <p className={cn('text-[10px] font-semibold uppercase', isToday ? 'text-brand-500' : 'text-ink-ghost')}>
          {dayLabel}
        </p>
        <p className={cn('text-[16px] font-semibold', isToday ? 'text-brand-500' : 'text-ink-primary')}>{dayNum}</p>
      </button>
      <div
        ref={setNodeRef}
        className={cn(
          'min-h-0 flex-1 overflow-y-auto px-1 py-2 transition-colors',
          isOver && 'bg-brand-50/30 dark:bg-brand-950/20',
        )}
      >
        <SortableContext id={dateKey} items={ids} strategy={verticalListSortingStrategy}>
          <ul className="flex flex-col gap-1.5">
            {tasks.map((t) => (
              <li key={t.id}>
                <TaskPlannerSortableRow
                  task={t}
                  compact
                  isSelected={focusedTaskId === t.id}
                  onOpen={() => onOpenTask(t)}
                  onToggle={() => onToggleTask(t.id)}
                />
              </li>
            ))}
          </ul>
        </SortableContext>
        {tasks.length === 0 && (
          <p className="px-0.5 py-4 text-center text-[10px] leading-snug text-ink-ghost">Drop tasks here</p>
        )}
      </div>
    </div>
  )
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

export function TaskScheduleWeekBoard({
  anchorDate,
  tasks,
  focusedTaskId,
  updateCalendarTask,
  toggleCalendarTask,
  onFocusTask,
  onOpenDay,
}: {
  anchorDate: Date
  tasks: CalendarTask[]
  focusedTaskId?: string | null
  updateCalendarTask: (id: string, patch: Partial<Omit<CalendarTask, 'id'>>) => void
  toggleCalendarTask: (id: string) => void
  onFocusTask: (id: string) => void
  onOpenDay: (d: Date) => void
}) {
  const weekDates = getWeekDates(anchorDate)
  const today = new Date()
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  const snapshot = useMemo(() => {
    const out: Record<string, string[]> = {}
    for (const d of weekDates) {
      const key = toDateKey(d)
      const list = tasks
        .filter((t) => t.date === key)
        .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
      out[key] = list.map((t) => t.id)
    }
    return out
  }, [tasks, weekDates])

  const taskById = useMemo(() => {
    const m = new Map<string, CalendarTask>()
    for (const t of tasks) m.set(t.id, t)
    return m
  }, [tasks])

  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const applyDayOrder = useCallback(
    (dateKey: string, orderedIds: string[]) => {
      const ordered = orderedIds.map((id) => taskById.get(id)).filter(Boolean) as CalendarTask[]
      const normalized = ordered.map((t) => ({ ...t, date: dateKey }))
      const updates = applyOrdinalTimes(normalized)
      updates.forEach((u, i) => {
        const t = ordered[i]!
        const patch: Partial<Omit<CalendarTask, 'id'>> = { startTime: u.startTime }
        if (t.date !== dateKey) patch.date = dateKey
        updateCalendarTask(u.id, patch)
      })
    },
    [taskById, updateCalendarTask],
  )

  const onDragStart = useCallback((e: DragStartEvent) => {
    setActiveId(String(e.active.id))
  }, [])

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      setActiveId(null)
      if (!over) return

      const activeTaskId = String(active.id)
      const overId = String(over.id)
      const snap = { ...snapshot }
      const activeContainer = findDayForTaskId(snap, activeTaskId)
      if (!activeContainer) return

      let overContainer: string | null = parseDayDroppable(overId)
      let overTaskId: string | null = null
      if (!overContainer) {
        overTaskId = overId
        overContainer = findDayForTaskId(snap, overTaskId)
      }
      if (!overContainer) return

      const fromList = [...(snap[activeContainer] ?? [])]
      const fromIdx = fromList.indexOf(activeTaskId)
      if (fromIdx < 0) return

      if (activeContainer === overContainer) {
        if (parseDayDroppable(overId)) {
          const rest = fromList.filter((id) => id !== activeTaskId)
          rest.push(activeTaskId)
          applyDayOrder(activeContainer, rest)
          return
        }
        const toIdx = fromList.indexOf(overId)
        if (toIdx < 0 || overId === activeTaskId) return
        const newOrder = arrayMove(fromList, fromIdx, toIdx)
        applyDayOrder(activeContainer, newOrder)
        return
      }

      const toList = [...(snap[overContainer] ?? [])]
      fromList.splice(fromIdx, 1)
      let insertAt = toList.length
      if (overTaskId) {
        const i = toList.indexOf(overTaskId)
        if (i >= 0) insertAt = i
      }
      toList.splice(insertAt, 0, activeTaskId)

      snap[activeContainer] = fromList
      snap[overContainer] = toList

      applyDayOrder(activeContainer, fromList)
      applyDayOrder(overContainer, toList)
    },
    [applyDayOrder, snapshot],
  )

  const activeTask = activeId ? taskById.get(activeId) : undefined

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex flex-col" style={{ height: 'calc(100vh - 180px)' }}>
        <p className="shrink-0 border-b border-surface-border px-3 py-2 text-[12px] text-ink-ghost sm:px-4">
          One column per day — drag tasks between days to reschedule.
        </p>
        <div className="flex min-h-0 flex-1 overflow-x-auto">
          <div className="flex min-w-[720px] flex-1">
            <div className="w-10 shrink-0" />
            {weekDates.map((d, i) => {
              const dateKey = toDateKey(d)
              const colTasks = tasks
                .filter((t) => t.date === dateKey)
                .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
              return (
                <DayColumn
                  key={dateKey}
                  dateKey={dateKey}
                  tasks={colTasks}
                  focusedTaskId={focusedTaskId ?? null}
                  isToday={isSameDay(d, today)}
                  dayLabel={dayNames[i] ?? ''}
                  dayNum={d.getDate()}
                  onOpenDay={() => onOpenDay(d)}
                  onOpenTask={(t) => onFocusTask(t.id)}
                  onToggleTask={toggleCalendarTask}
                />
              )
            })}
          </div>
        </div>
      </div>
      <DragOverlay dropAnimation={dropAnimation}>
        {activeTask ? (
          <div className="rounded-xl border border-surface-border bg-surface-card px-2 py-2 shadow-lg">
            <p className="text-[12px] font-medium text-ink-primary">{activeTask.title || '(No title)'}</p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
