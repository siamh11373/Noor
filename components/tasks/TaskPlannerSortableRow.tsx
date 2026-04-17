'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TASK_PILLAR_STYLES } from '@/lib/tasks-calendar'
import { cn } from '@/lib/utils'
import type { CalendarTask } from '@/types'

export function TaskPlannerSortableRow({
  task,
  onOpen,
  onToggle,
  compact,
  isSelected,
}: {
  task: CalendarTask
  onOpen: () => void
  onToggle: () => void
  /** Tighter padding for week columns */
  compact?: boolean
  /** Matches time-grid focused task (side panel open) */
  isSelected?: boolean
}) {
  const isRecurringInstance = Boolean(task.recurrenceInstanceOf)
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: isRecurringInstance,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }
  const colors = TASK_PILLAR_STYLES[task.pillar]
  const title =
    task.title.trim() === '' || task.title === '(No title)' ? '(No title)' : task.title

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-task-panel-anchor={task.id}
      className={cn(
        'rounded-xl border bg-surface-card shadow-sm transition-shadow duration-150',
        compact ? 'px-2 py-2' : 'px-3 py-2.5',
        colors.border,
        isDragging && 'z-50 opacity-60 ring-2 ring-brand-400/30',
        isSelected && !isDragging && 'z-[1] shadow-md ring-1 ring-brand-400/40',
      )}
    >
      <div className="flex items-start gap-2">
        {isRecurringInstance ? (
          <span className="mt-0.5 w-[14px] shrink-0" aria-hidden />
        ) : (
          <button
            type="button"
            ref={setActivatorNodeRef}
            className="mt-0.5 cursor-grab touch-none text-ink-ghost hover:text-ink-muted active:cursor-grabbing"
            aria-label="Drag to reorder"
            {...attributes}
            {...listeners}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M9 5h.01M15 5h.01M9 12h.01M15 12h.01M9 19h.01M15 19h.01"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
        <button type="button" onClick={onOpen} className="min-h-0 min-w-0 flex-1 rounded-lg py-0.5 text-left hover:bg-surface-muted/50">
          <div className="flex items-center gap-2">
            <span
              role="checkbox"
              aria-checked={task.completed}
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation()
                onToggle()
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onToggle()
                }
              }}
              className={cn(
                'flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded border-[1.5px]',
                task.completed ? 'border-faith bg-faith' : 'border-current opacity-40',
              )}
            >
              {task.completed && (
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
            </span>
            <span
              className={cn(
                'truncate font-medium text-ink-primary',
                compact ? 'text-[11px]' : 'text-[13px]',
                task.completed && 'line-through opacity-60',
              )}
            >
              {title}
            </span>
          </div>
        </button>
      </div>
    </div>
  )
}
