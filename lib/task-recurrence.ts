import {
  differenceInCalendarDays,
  differenceInCalendarMonths,
  differenceInCalendarYears,
  getDay,
  isBefore,
  isSameDay,
} from 'date-fns'
import { parseDateKey, toDateKey } from '@/lib/date'
import type { CalendarTask, CalendarTaskRecurrence, RecurrencePresetKind } from '@/types'

const OCC_MARKER = '::__occ__::'

export function isVirtualCalendarTaskId(id: string): boolean {
  return id.includes(OCC_MARKER)
}

/** Master task id (strip synthetic occurrence suffix). */
export function calendarTaskMasterId(id: string): string {
  const i = id.indexOf(OCC_MARKER)
  return i === -1 ? id : id.slice(0, i)
}

export function virtualCalendarTaskId(masterId: string, dateKey: string): string {
  return `${masterId}${OCC_MARKER}${dateKey}`
}

export function extractVirtualOccurrenceDateKey(id: string): string | null {
  const i = id.indexOf(OCC_MARKER)
  if (i === -1) return null
  return id.slice(i + OCC_MARKER.length) || null
}

export function hasActiveRecurrence(t: CalendarTask): boolean {
  return Boolean(t.recurrence)
}

function sameMonthDay(a: Date, b: Date): boolean {
  return a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function endAllowsDate(r: CalendarTaskRecurrence, day: Date): boolean {
  if (r.end === 'until_date' && r.untilDate) {
    const u = parseDateKey(r.untilDate)
    if (isBefore(u, day)) return false
  }
  return true
}

function occurrenceIndexOrZero(task: CalendarTask, day: Date): number {
  const anchor = parseDateKey(task.date)
  if (isBefore(day, anchor) && !isSameDay(day, anchor)) return 0
  const r = task.recurrence!
  const interval = Math.max(1, r.interval || 1)

  switch (r.preset) {
    case 'daily':
    case 'custom':
      if (r.preset === 'daily' || (r.preset === 'custom' && r.frequencyUnit === 'day')) {
        const diff = differenceInCalendarDays(day, anchor)
        if (diff < 0 || diff % interval !== 0) return 0
        return Math.floor(diff / interval) + 1
      }
      if (r.preset === 'custom' && r.frequencyUnit === 'week') {
        const dow = getDay(day)
        const days = r.byWeekday?.length ? r.byWeekday : [getDay(anchor)]
        if (!days.includes(dow)) return 0
        const diff = differenceInCalendarDays(day, anchor)
        const w = Math.floor(diff / 7)
        if (w < 0 || w % interval !== 0) return 0
        return w / interval + 1
      }
      if (r.preset === 'custom' && r.frequencyUnit === 'month') {
        if (!sameMonthDay(day, anchor)) return 0
        const m = differenceInCalendarMonths(day, anchor)
        if (m < 0 || m % interval !== 0) return 0
        return Math.floor(m / interval) + 1
      }
      if (r.preset === 'custom' && r.frequencyUnit === 'year') {
        if (!sameMonthDay(day, anchor)) return 0
        const y = differenceInCalendarYears(day, anchor)
        if (y < 0 || y % interval !== 0) return 0
        return Math.floor(y / interval) + 1
      }
      return 0
    case 'weekly': {
      const dow = getDay(day)
      const days = r.byWeekday?.length ? r.byWeekday : [getDay(anchor)]
      if (!days.includes(dow)) return 0
      const diff = differenceInCalendarDays(day, anchor)
      const w = Math.floor(diff / 7)
      if (w < 0 || w % interval !== 0) return 0
      return w / interval + 1
    }
    case 'monthly': {
      if (day.getDate() !== anchor.getDate()) return 0
      const m = differenceInCalendarMonths(day, anchor)
      if (m < 0 || m % interval !== 0) return 0
      return Math.floor(m / interval) + 1
    }
    case 'yearly': {
      if (!sameMonthDay(day, anchor)) return 0
      const y = differenceInCalendarYears(day, anchor)
      if (y < 0 || y % interval !== 0) return 0
      return Math.floor(y / interval) + 1
    }
    default:
      return 0
  }
}

export function occursOnDateKey(task: CalendarTask, dateKey: string): boolean {
  const day = parseDateKey(dateKey)
  const anchor = parseDateKey(task.date)
  if (!hasActiveRecurrence(task)) {
    return isSameDay(day, anchor) && dateKey === task.date
  }
  const r = task.recurrence!
  if (isBefore(day, anchor) && !isSameDay(day, anchor)) return false
  if (!endAllowsDate(r, day)) return false

  const idx = occurrenceIndexOrZero(task, day)
  if (idx < 1) return false
  if (r.end === 'after_count' && r.afterCount != null && idx > r.afterCount) return false
  return true
}

/** Human-readable summary for the repeat row (calendar-style). */
export function formatRecurrenceSummary(task: CalendarTask, anchorDateKey?: string): string {
  if (!hasActiveRecurrence(task)) return 'Does not repeat'
  const r = task.recurrence!
  const anchor = parseDateKey(anchorDateKey ?? task.date)
  const dow = (d: number) =>
    ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d] ?? ''

  switch (r.preset) {
    case 'daily':
      return r.interval > 1 ? `Every ${r.interval} days` : 'Daily'
    case 'weekly': {
      const days = r.byWeekday?.length ? r.byWeekday : [getDay(anchor)]
      const label =
        days.length === 1
          ? `Weekly on ${dow(days[0]!)}`
          : `Weekly on ${days
              .slice()
              .sort((a, b) => a - b)
              .map((d) => dow(d).slice(0, 3))
              .join(', ')}`
      return r.interval > 1 ? `Every ${r.interval} weeks (${label})` : label
    }
    case 'monthly':
      return r.interval > 1
        ? `Every ${r.interval} months on day ${anchor.getDate()}`
        : `Monthly on day ${anchor.getDate()}`
    case 'yearly':
      return r.interval > 1 ? `Every ${r.interval} years` : `Yearly on ${anchor.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    case 'custom': {
      const unit = r.frequencyUnit === 'day' ? 'days' : r.frequencyUnit === 'week' ? 'weeks' : r.frequencyUnit === 'month' ? 'months' : 'years'
      let tail = ''
      if (r.frequencyUnit === 'week' && r.byWeekday?.length) {
        tail = ` on ${r.byWeekday
          .slice()
          .sort((a, b) => a - b)
          .map((d) => dow(d).slice(0, 3))
          .join(', ')}`
      }
      if (r.end === 'until_date' && r.untilDate) tail += ` until ${r.untilDate}`
      if (r.end === 'after_count' && r.afterCount != null) tail += `, ${r.afterCount} times`
      return `Custom — every ${r.interval} ${unit}${tail}`
    }
    default:
      return 'Does not repeat'
  }
}

export function defaultRecurrenceForPreset(
  preset: RecurrencePresetKind | 'off',
  anchorDateKey: string,
): CalendarTaskRecurrence | null {
  if (preset === 'off') return null
  const anchor = parseDateKey(anchorDateKey)
  const dow = getDay(anchor)
  const base: CalendarTaskRecurrence = {
    preset,
    interval: 1,
    frequencyUnit: 'day',
    byWeekday: [],
    end: 'never',
  }
  switch (preset) {
    case 'daily':
      return { ...base, preset: 'daily', frequencyUnit: 'day' }
    case 'weekly':
      return { ...base, preset: 'weekly', frequencyUnit: 'week', byWeekday: [dow] }
    case 'monthly':
      return { ...base, preset: 'monthly', frequencyUnit: 'month' }
    case 'yearly':
      return { ...base, preset: 'yearly', frequencyUnit: 'year' }
    case 'custom':
      return {
        ...base,
        preset: 'custom',
        interval: 1,
        frequencyUnit: 'week',
        byWeekday: [dow],
        end: 'never',
      }
    default:
      return null
  }
}

/**
 * Expand stored tasks into display tasks for a finite set of calendar date keys.
 * Masters stay one row on their anchor date; other occurrences use synthetic ids.
 */
export function expandCalendarTasksForDateKeys(tasks: CalendarTask[], dateKeys: string[]): CalendarTask[] {
  const keySet = new Set(dateKeys)
  const masters = tasks.filter((t) => !isVirtualCalendarTaskId(t.id))
  const out: CalendarTask[] = []

  for (const dk of dateKeys) {
    if (!keySet.has(dk)) continue
    for (const t of masters) {
      if (!occursOnDateKey(t, dk)) continue
      if (hasActiveRecurrence(t)) {
        if (dk === t.date) {
          out.push(t)
        } else {
          out.push({
            ...t,
            id: virtualCalendarTaskId(t.id, dk),
            date: dk,
            recurrenceInstanceOf: t.id,
          })
        }
      } else if (dk === t.date) {
        out.push(t)
      }
    }
  }

  return out
}

export function getWeekDateKeys(anchor: Date): string[] {
  const d = new Date(anchor)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(d)
    dd.setDate(d.getDate() + i)
    return toDateKey(dd)
  })
}

export function getMonthDateKeys(anchor: Date): string[] {
  const y = anchor.getFullYear()
  const m = anchor.getMonth()
  const last = new Date(y, m + 1, 0).getDate()
  const keys: string[] = []
  for (let day = 1; day <= last; day++) {
    keys.push(toDateKey(new Date(y, m, day)))
  }
  return keys
}
