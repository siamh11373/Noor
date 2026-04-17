'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { MoreHorizontal } from 'lucide-react'
import { toDateKey } from '@/lib/date'
import { nextStartForAppend } from '@/lib/task-schedule-order'
import { formatTimeDisplay, timeToMinutes } from '@/lib/tasks-calendar'
import { useSalahStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import type { CalendarTask } from '@/types'

function pillarCaption(pillar: CalendarTask['pillar']) {
  return pillar === 'career' ? 'tasks' : pillar
}

export function TasksForToday({ className }: { className?: string }) {
  const calendarTasks = useSalahStore((s) => s.calendarTasks)
  const addCalendarTask = useSalahStore((s) => s.addCalendarTask)
  const toggleCalendarTask = useSalahStore((s) => s.toggleCalendarTask)
  const deleteCalendarTask = useSalahStore((s) => s.deleteCalendarTask)

  const todayStr = toDateKey(new Date())
  const [menuTaskId, setMenuTaskId] = useState<string | null>(null)

  const todayTasks = useMemo(() => {
    const list = calendarTasks.filter((t) => t.date === todayStr)
    list.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
    return list
  }, [calendarTasks, todayStr])

  const compact = todayTasks.length > 6

  useEffect(() => {
    if (!menuTaskId) return
    function onPointerDown(e: PointerEvent) {
      const el = document.querySelector(`[data-task-menu="${menuTaskId}"]`)
      if (el && !el.contains(e.target as Node)) setMenuTaskId(null)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [menuTaskId])

  const handleAddTask = useCallback(() => {
    const startTime = nextStartForAppend(todayTasks)
    addCalendarTask({
      title: '(No title)',
      date: todayStr,
      startTime,
      duration: 60,
      pillar: 'career',
      completed: false,
    })
  }, [addCalendarTask, todayStr, todayTasks])

  return (
    <div className={cn('flex min-h-0 flex-col', todayTasks.length > 0 && 'flex-1', className)}>
      {todayTasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-surface-border bg-surface-raised/40 px-4 py-6 text-center">
          <p className="text-[13px] text-ink-muted">No tasks for today</p>
          <p className="mt-1 text-[11px] text-ink-ghost">Add one below or plan on the Tasks page</p>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-surface-border bg-surface-raised/40">
          <ul className="min-h-0 flex-1 divide-y divide-surface-border overflow-y-auto overscroll-contain">
            {todayTasks.map((task) => (
              <li key={task.id} className="relative">
                <div
                  className={cn(
                    'group flex items-start gap-3 transition-colors hover:bg-surface-muted/45',
                    compact ? 'px-3 py-2' : 'px-3.5 py-2.5',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => toggleCalendarTask(task.id)}
                    className={cn(
                      'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-all',
                      task.completed
                        ? 'border-faith bg-faith'
                        : 'border-surface-border hover:border-ink-ghost',
                    )}
                    aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
                  >
                    {task.completed && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
                        <path
                          d="M2 5l2 2 4-4"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>

                  <Link
                    href="/tasks"
                    className="min-w-0 flex-1 rounded-lg py-0.5 text-left outline-none ring-brand-400/30 focus-visible:ring-2"
                  >
                    <p
                      className={cn(
                        'text-[13px] font-medium leading-snug',
                        task.completed ? 'text-ink-ghost line-through' : 'text-ink-primary',
                      )}
                    >
                      {task.title.trim() === '' || task.title === '(No title)' ? '(No title)' : task.title}
                    </p>
                    <p className="mt-0.5 text-[10px] text-ink-ghost">
                      {formatTimeDisplay(task.startTime)}
                      <span className="text-ink-faint"> · </span>
                      <span className="capitalize">{pillarCaption(task.pillar)}</span>
                    </p>
                  </Link>

                  <div className="relative shrink-0" data-task-menu={task.id}>
                    <button
                      type="button"
                      onClick={() => setMenuTaskId((id) => (id === task.id ? null : task.id))}
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-lg text-ink-ghost transition-colors',
                        'opacity-50 hover:bg-surface-muted/60 hover:text-ink-secondary md:opacity-0 md:group-hover:opacity-100',
                        menuTaskId === task.id && 'bg-surface-muted/60 text-ink-secondary opacity-100',
                      )}
                      aria-expanded={menuTaskId === task.id}
                      aria-haspopup="menu"
                      aria-label="Task options"
                    >
                      <MoreHorizontal className="h-4 w-4" strokeWidth={1.75} />
                    </button>
                    {menuTaskId === task.id && (
                      <div
                        className="absolute right-0 top-full z-30 mt-1 min-w-[9.5rem] rounded-xl border border-surface-border bg-surface-card py-1 shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
                        role="menu"
                      >
                        <Link
                          href="/tasks"
                          role="menuitem"
                          className="block px-3 py-2 text-[12px] text-ink-secondary transition-colors hover:bg-surface-muted/60"
                          onClick={() => setMenuTaskId(null)}
                        >
                          Open in Tasks
                        </Link>
                        <button
                          type="button"
                          role="menuitem"
                          className="w-full px-3 py-2 text-left text-[12px] text-ink-secondary transition-colors hover:bg-surface-muted/60"
                          onClick={() => {
                            deleteCalendarTask(task.id)
                            setMenuTaskId(null)
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={handleAddTask}
        className={cn(
          'mt-2 flex w-full shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors',
          'text-[13px] text-ink-muted hover:bg-surface-muted/50 hover:text-ink-secondary',
        )}
      >
        <span className="select-none text-[15px] font-light leading-none text-ink-ghost">+</span>
        <span>Add task</span>
      </button>
    </div>
  )
}
