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
import { groupCalendarTasksByPrayerSection, PRAYER_SECTION_SURFACE } from '@/lib/prayer-sections'
import { applyOrdinalTimes } from '@/lib/task-schedule-order'
import { timeToMinutes } from '@/lib/tasks-calendar'
import { TaskPlannerSortableRow } from '@/components/tasks/TaskPlannerSortableRow'
import { cn } from '@/lib/utils'
import type { CalendarTask, PrayerTime } from '@/types'

const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5' } } }),
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

  const sectionGroups = useMemo(
    () => groupCalendarTasksByPrayerSection(dayTasks, prayerTimes),
    [dayTasks, prayerTimes],
  )

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
          <div className="mx-auto flex w-full max-w-lg flex-col pb-8">
            {sectionGroups.map((g, gi) => (
              <div
                key={`${g.section}-${gi}`}
                className={cn(
                  '-mx-4 flex flex-col gap-2.5 px-4 sm:-mx-6 sm:px-6',
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
            ))}
          </div>
        </SortableContext>
        {dayTasks.length === 0 && (
          <div
            className={cn(
              '-mx-4 px-4 py-10 text-center sm:-mx-6 sm:px-6',
              PRAYER_SECTION_SURFACE.pre,
            )}
          >
            <p className="text-[13px] text-ink-ghost">No tasks yet — use + Add task to start.</p>
          </div>
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
