'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { formatTimeDisplay, TASK_PILLAR_STYLES } from '@/lib/tasks-calendar'
import { cn } from '@/lib/utils'
import { CompletionCheckbox } from '@/components/ui/CompletionCheckbox'
import type { CalendarTask, PillarKey } from '@/types'

const PILLAR_DOT: Record<PillarKey, string> = {
  faith: 'bg-faith',
  career: 'bg-tasks',
  fitness: 'bg-fitness',
  family: 'bg-family',
}

const PILLAR_STRIPE: Record<PillarKey, string> = {
  faith: 'bg-faith',
  career: 'bg-tasks',
  fitness: 'bg-fitness',
  family: 'bg-family',
}

function formatDurationShort(min: number): string {
  if (min <= 0) return ''
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

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
  /** Tighter padding for week columns; also hides time/duration meta. */
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
        'group relative overflow-hidden rounded-xl border bg-surface-card shadow-sm transition-[box-shadow,transform] duration-150',
        compact ? 'pl-2 pr-2 py-2' : 'pl-3 pr-3 py-2.5',
        colors.border,
        !compact && 'hover:shadow-md',
        isDragging && 'z-50 opacity-60 ring-2 ring-brand-400/30',
        isSelected && !isDragging && 'z-[1] shadow-md ring-1 ring-brand-400/40',
        task.completed && 'opacity-60',
      )}
    >
      {!compact && (
        <span
          aria-hidden
          className={cn(
            'absolute inset-y-0 left-0 w-[3px] rounded-l-xl',
            PILLAR_STRIPE[task.pillar],
            task.completed && 'opacity-40',
          )}
        />
      )}
      <div className={cn('flex items-center gap-2', !compact && 'pl-2')}>
        {isRecurringInstance ? (
          <span className="w-[14px] shrink-0" aria-hidden />
        ) : (
          <button
            type="button"
            ref={setActivatorNodeRef}
            className="cursor-grab touch-none text-ink-ghost opacity-0 transition-opacity hover:text-ink-muted active:cursor-grabbing group-hover:opacity-100"
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
        <CompletionCheckbox
          checked={task.completed}
          onChange={onToggle}
          size="sm"
          colorClass="border-faith bg-faith"
          aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
          className="shrink-0 rounded"
        />
        <button
          type="button"
          onClick={onOpen}
          className="min-w-0 flex-1 rounded-lg py-0.5 text-left"
        >
          <span
            className={cn(
              'block break-words font-medium text-ink-primary',
              compact ? 'text-[11px]' : 'text-[13px]',
              task.completed && 'line-through text-ink-muted',
            )}
          >
            {title}
          </span>
        </button>
        {!compact && (
          <div className="ml-1 flex shrink-0 items-center gap-1.5">
            <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-medium tabular-nums text-ink-muted">
              {formatTimeDisplay(task.startTime)}
            </span>
            {task.duration > 0 && (
              <span className="hidden rounded-full bg-surface-muted/70 px-2 py-0.5 text-[10px] font-medium text-ink-ghost sm:inline">
                {formatDurationShort(task.duration)}
              </span>
            )}
            <span
              aria-hidden
              className={cn('h-1.5 w-1.5 shrink-0 rounded-full', PILLAR_DOT[task.pillar])}
              title={task.pillar}
            />
          </div>
        )}
      </div>
    </div>
  )
}
