'use client'

import { useShortcut } from '@/hooks/useShortcuts'

type ViewMode = 'day' | 'week' | 'month'
type ScheduleMode = 'time' | 'task'

export interface TasksShortcutHandlers {
  view: ViewMode
  scheduleMode: ScheduleMode
  goToday: () => void
  navigate: (dir: -1 | 1) => void
  setView: (view: ViewMode) => void
  setScheduleMode: (mode: ScheduleMode) => void
  addTask: () => void
}

/**
 * Tasks page shortcuts:
 *   t           → jump to today
 *   j / →       → next day/week/month (matches current view)
 *   k / ←       → previous day/week/month
 *   1 / 2 / 3   → day / week / month view
 *   m           → toggle time / task mode
 *   n           → new task
 */
export function useTasksShortcuts(h: TasksShortcutHandlers) {
  useShortcut('t', () => h.goToday(), {}, [h.goToday])
  useShortcut(['j', 'right'], () => h.navigate(1), {}, [h.navigate])
  useShortcut(['k', 'left'], () => h.navigate(-1), {}, [h.navigate])

  useShortcut('1', () => h.setView('day'), {}, [h.setView])
  useShortcut('2', () => h.setView('week'), {}, [h.setView])
  useShortcut('3', () => h.setView('month'), {}, [h.setView])

  useShortcut('m', () => h.setScheduleMode(h.scheduleMode === 'time' ? 'task' : 'time'), {}, [h.scheduleMode, h.setScheduleMode])

  useShortcut('n', () => h.addTask(), {}, [h.addTask])
}
