'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TASK_PILLAR_STYLES } from '@/lib/tasks-calendar'
import { cn } from '@/lib/utils'
import { CompletionCheckbox } from '@/components/ui/CompletionCheckbox'
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
          <div className="flex items-start gap-2">
            <CompletionCheckbox
              checked={task.completed}
              onChange={onToggle}
              size="sm"
              colorClass="border-faith bg-faith"
              aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
              className="mt-0.5 rounded"
            />
            <span
              className={cn(
                'break-words font-medium text-ink-primary',
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
