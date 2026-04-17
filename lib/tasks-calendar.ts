import type { PillarKey, PrayerTime } from '@/types'

export const HOUR_HEIGHT = 60
export const START_HOUR = 4
export const END_HOUR = 24
export const TOTAL_HOURS = END_HOUR - START_HOUR
export const SNAP_MINUTES = 15
export const MIN_DURATION_MIN = 15
export const DEFAULT_NEW_TASK_MINUTES = 60

export const DAY_START_MINUTES = START_HOUR * 60
export const DAY_END_MINUTES = END_HOUR * 60

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60) % 24
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function snapMinutes(mins: number, step = SNAP_MINUTES): number {
  return Math.round(mins / step) * step
}

export function snapMinutesFloor(mins: number, step = SNAP_MINUTES): number {
  return Math.floor(mins / step) * step
}

export function formatHour(hour: number): string {
  if (hour === 0 || hour === 24) return '12 AM'
  if (hour === 12) return '12 PM'
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`
}

export function formatTimeDisplay(time: string): string {
  const mins = timeToMinutes(time)
  const h = Math.floor(mins / 60) % 24
  const m = mins % 60
  const meridiem = h >= 12 ? 'PM' : 'AM'
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${display}:${String(m).padStart(2, '0')} ${meridiem}`
}

export function prayerToMinutes(pt: PrayerTime): number | null {
  if (!pt.time) return null
  return pt.time.getHours() * 60 + pt.time.getMinutes()
}

/** Clamp start + duration to visible day grid. */
export function clampTaskToDay(startMins: number, durationMin: number): { startMins: number; durationMin: number } {
  let s = Math.max(DAY_START_MINUTES, Math.min(startMins, DAY_END_MINUTES - MIN_DURATION_MIN))
  let d = Math.max(MIN_DURATION_MIN, durationMin)
  if (s + d > DAY_END_MINUTES) {
    d = Math.max(MIN_DURATION_MIN, DAY_END_MINUTES - s)
  }
  return { startMins: s, durationMin: d }
}

export function minutesToY(mins: number): number {
  return ((mins - DAY_START_MINUTES) / 60) * HOUR_HEIGHT
}

export function yToMinutes(y: number, scrollTop: number): number {
  const totalY = y + scrollTop
  return (totalY / HOUR_HEIGHT) * 60 + DAY_START_MINUTES
}

export const TASK_PILLAR_STYLES: Record<PillarKey, { bg: string; border: string; text: string }> = {
  faith: { bg: 'bg-faith-light', border: 'border-faith-border', text: 'text-faith-text' },
  career: { bg: 'bg-tasks-light', border: 'border-tasks-border', text: 'text-tasks-text' },
  fitness: { bg: 'bg-fitness-light', border: 'border-fitness-border', text: 'text-fitness-text' },
  family: { bg: 'bg-family-light', border: 'border-family-border', text: 'text-family-text' },
}
