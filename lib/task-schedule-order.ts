import { minutesToTime, snapMinutes, timeToMinutes } from '@/lib/tasks-calendar'
import type { CalendarTask } from '@/types'

/** Synthetic “planner order” window — times are for ordering, not strict scheduling in Task mode. */
const ORDER_BASE_MIN = 9 * 60
const ORDER_CEIL_MIN = 20 * 60
const SLOT_MIN = 5

export function applyOrdinalTimes(ordered: CalendarTask[]): { id: string; startTime: string }[] {
  return ordered.map((t, i) => {
    const raw = ORDER_BASE_MIN + i * SLOT_MIN
    const maxStart = ORDER_CEIL_MIN - Math.max(t.duration, SLOT_MIN) - 1
    const clamped = Math.max(ORDER_BASE_MIN, Math.min(raw, maxStart))
    return { id: t.id, startTime: minutesToTime(snapMinutes(clamped)) }
  })
}

/** Next start time for a newly added task at the end of a day’s list. */
export function nextStartForAppend(dayTasks: CalendarTask[]): string {
  if (dayTasks.length === 0) {
    return minutesToTime(snapMinutes(ORDER_BASE_MIN))
  }
  const sorted = [...dayTasks].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
  const last = sorted[sorted.length - 1]!
  const next = timeToMinutes(last.startTime) + SLOT_MIN
  const maxStart = ORDER_CEIL_MIN - 60 - 1
  const clamped = Math.max(ORDER_BASE_MIN, Math.min(next, maxStart))
  return minutesToTime(snapMinutes(clamped))
}
