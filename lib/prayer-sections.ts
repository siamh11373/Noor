import type { PrayerName, PrayerTime } from '@/types'
import {
  DAY_END_MINUTES,
  DAY_START_MINUTES,
  minutesToY,
  prayerToMinutes,
  timeToMinutes,
} from '@/lib/tasks-calendar'

export type PrayerSectionKey = PrayerName | 'pre'

export type PrayerSectionBand = {
  key: string
  startMins: number
  endMins: number
  section: PrayerSectionKey
  top: number
  height: number
}

/** Tailwind classes — keep literals so the compiler picks them up. */
export const PRAYER_SECTION_SURFACE: Record<PrayerSectionKey, string> = {
  pre: 'bg-prayerSection-pre',
  fajr: 'bg-prayerSection-fajr',
  dhuhr: 'bg-prayerSection-dhuhr',
  asr: 'bg-prayerSection-asr',
  maghrib: 'bg-prayerSection-maghrib',
  isha: 'bg-prayerSection-isha',
}

function orderedPrayerPoints(prayerTimes: PrayerTime[]): { mins: number; prayer: PrayerName }[] {
  const rows = prayerTimes
    .map((pt) => ({ pt, mins: prayerToMinutes(pt) }))
    .filter((x): x is { pt: PrayerTime; mins: number } => x.mins !== null)
    .filter(({ mins }) => mins >= DAY_START_MINUTES && mins < DAY_END_MINUTES)
    .sort((a, b) => a.mins - b.mins)

  const deduped: { mins: number; prayer: PrayerName }[] = []
  for (const r of rows) {
    if (deduped.length && deduped[deduped.length - 1]!.mins === r.mins) continue
    deduped.push({ mins: r.mins, prayer: r.pt.name })
  }
  return deduped
}

/** Half-open ranges [start, end) in minutes, mapped to section tint (next prayer starts a new block). */
export function buildPrayerSectionRanges(prayerTimes: PrayerTime[]): { startMins: number; endMins: number; section: PrayerSectionKey }[] {
  const points = orderedPrayerPoints(prayerTimes)
  const ranges: { startMins: number; endMins: number; section: PrayerSectionKey }[] = []

  if (points.length === 0) {
    ranges.push({ startMins: DAY_START_MINUTES, endMins: DAY_END_MINUTES, section: 'pre' })
    return ranges
  }

  if (points[0]!.mins > DAY_START_MINUTES) {
    ranges.push({ startMins: DAY_START_MINUTES, endMins: points[0]!.mins, section: 'pre' })
  }

  for (let i = 0; i < points.length; i++) {
    const startMins = points[i]!.mins
    const endMins = i + 1 < points.length ? points[i + 1]!.mins : DAY_END_MINUTES
    ranges.push({ startMins, endMins, section: points[i]!.prayer })
  }

  return ranges
}

export function buildPrayerSectionBands(prayerTimes: PrayerTime[]): PrayerSectionBand[] {
  const ranges = buildPrayerSectionRanges(prayerTimes)
  return ranges.map((r, i) => {
    const top = minutesToY(r.startMins)
    const bottom = minutesToY(r.endMins)
    return {
      key: `${r.section}-${r.startMins}-${i}`,
      startMins: r.startMins,
      endMins: r.endMins,
      section: r.section,
      top,
      height: Math.max(0, bottom - top),
    }
  })
}

function cssSectionRgb(section: PrayerSectionKey | 'surface'): string {
  if (section === 'surface') return 'rgb(var(--surface-card) / 1)'
  return `rgb(var(--prayer-section-${section}) / 1)`
}

/**
 * One vertical gradient for the whole day column: soft entry/exit from the card,
 * and feathered blends at each prayer boundary (avoids hard horizontal cuts).
 */
export function buildPrayerTimelineGradientImage(prayerTimes: PrayerTime[], totalHeightPx: number): string {
  const bands = buildPrayerSectionBands(prayerTimes)
  if (totalHeightPx <= 0) {
    return `linear-gradient(to bottom, ${cssSectionRgb('surface')} 0px, ${cssSectionRgb('surface')} 1px)`
  }
  if (bands.length === 0) {
    return `linear-gradient(to bottom, ${cssSectionRgb('surface')} 0px, ${cssSectionRgb('surface')} ${totalHeightPx}px)`
  }

  type Stop = { y: number; c: string }
  const stops: Stop[] = []

  const first = bands[0]!
  const topFeather = Math.min(32, Math.max(14, first.height * 0.2))
  stops.push({ y: 0, c: cssSectionRgb('surface') })
  stops.push({ y: topFeather, c: cssSectionRgb(first.section) })

  for (let i = 0; i < bands.length - 1; i++) {
    const cur = bands[i]!
    const nxt = bands[i + 1]!
    const boundary = cur.top + cur.height
    const F = Math.min(32, Math.max(10, cur.height * 0.22, nxt.height * 0.22))
    const y1 = Math.max(stops[stops.length - 1]!.y + 0.5, boundary - F)
    const y2 = Math.min(boundary + F, totalHeightPx - 0.5)
    if (y1 < y2 - 0.25) {
      stops.push({ y: y1, c: cssSectionRgb(cur.section) })
      stops.push({ y: y2, c: cssSectionRgb(nxt.section) })
    }
  }

  const last = bands[bands.length - 1]!
  const bottomFeather = Math.min(32, Math.max(14, last.height * 0.2))
  const yFade = Math.max(stops[stops.length - 1]!.y + 0.5, totalHeightPx - bottomFeather)
  if (yFade < totalHeightPx - 0.25) {
    stops.push({ y: yFade, c: cssSectionRgb(last.section) })
  }
  stops.push({ y: totalHeightPx, c: cssSectionRgb('surface') })

  stops.sort((a, b) => a.y - b.y)
  const merged: Stop[] = []
  for (const s of stops) {
    const prev = merged[merged.length - 1]
    if (prev && Math.abs(prev.y - s.y) < 0.4) {
      merged[merged.length - 1] = { y: s.y, c: s.c }
    } else {
      merged.push({ ...s })
    }
  }

  return `linear-gradient(to bottom, ${merged.map((s) => `${s.c} ${Number(s.y.toFixed(2))}px`).join(', ')})`
}

export function prayerSectionForMinutes(mins: number, prayerTimes: PrayerTime[]): PrayerSectionKey {
  const ranges = buildPrayerSectionRanges(prayerTimes)
  for (const r of ranges) {
    if (mins >= r.startMins && mins < r.endMins) return r.section
  }
  return ranges[ranges.length - 1]?.section ?? 'pre'
}

export function groupCalendarTasksByPrayerSection<T extends { startTime: string }>(
  tasks: T[],
  prayerTimes: PrayerTime[],
): { section: PrayerSectionKey; tasks: T[] }[] {
  if (tasks.length === 0) return []

  const groups: { section: PrayerSectionKey; tasks: T[] }[] = []
  for (const t of tasks) {
    const mins = timeToMinutes(t.startTime)
    const section = prayerSectionForMinutes(mins, prayerTimes)
    const last = groups[groups.length - 1]
    if (last && last.section === section) {
      last.tasks.push(t)
    } else {
      groups.push({ section, tasks: [t] })
    }
  }
  return groups
}
