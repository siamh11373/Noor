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
import { toDateKey } from '@/lib/date'
import { applyOrdinalTimes } from '@/lib/task-schedule-order'
import { timeToMinutes } from '@/lib/tasks-calendar'
import { TaskPlannerSortableRow } from '@/components/tasks/TaskPlannerSortableRow'
import type { CalendarTask } from '@/types'

const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5' } } }),
}

export function TaskScheduleDayList({
  date,
  tasks,
  focusedTaskId,
  updateCalendarTask,
  toggleCalendarTask,
  onFocusTask,
}: {
  date: Date
  tasks: CalendarTask[]
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

  const ids = useMemo(() => dayTasks.map((t) => t.id), [dayTasks])
  const byId = useMemo(() => new Map(dayTasks.map((t) => [t.id, t])), [dayTasks])

  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const commitOrder = useCallback(
    (orderedIds: string[]) => {
      const ordered = orderedIds.map((id) => byId.get(id)).filter(Boolean) as CalendarTask[]
      const updates = applyOrdinalTimes(ordered)
      for (const u of updates) {
        updateCalendarTask(u.id, { startTime: u.startTime })
      }
    },
    [byId, updateCalendarTask],
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

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div
        data-task-day-grid
        className="flex flex-col overflow-y-auto px-4 py-5 sm:px-6"
        style={{ minHeight: 'calc(100vh - 180px)', maxHeight: 'calc(100vh - 180px)' }}
      >
        <p className="mb-4 max-w-md text-[13px] leading-relaxed text-ink-ghost">
          Everything for this day in one list. Drag to set priority — open a task when you need times or details.
        </p>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ul className="mx-auto flex max-w-lg flex-col gap-2.5 pb-8">
            {dayTasks.map((t) => (
              <li key={t.id}>
                <TaskPlannerSortableRow
                  task={t}
                  isSelected={focusedTaskId === t.id}
                  onOpen={() => onFocusTask(t.id)}
                  onToggle={() => toggleCalendarTask(t.id)}
                />
              </li>
            ))}
          </ul>
        </SortableContext>
        {dayTasks.length === 0 && (
          <p className="py-10 text-center text-[13px] text-ink-ghost">No tasks yet — use + Add task to start.</p>
        )}
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
