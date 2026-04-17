import type { DailyLog, PillarScores, SalahDataState, WeeklyScore, WeeklyScoreSnapshot, WeeklyRecord } from '@/types'
import { parseDateKey, toDateKey } from '@/lib/date'
import { mondayStr } from './store'

// Weights must sum to 100
const WEIGHTS = { faith: 40, family: 25, career: 20, fitness: 15 } as const

// Returns the 7 date strings for the current week (Mon–Sun)
export function getWeekDateStrings(monday = mondayStr()): string[] {
  const result: string[] = []
  const base = parseDateKey(monday)
  for (let i = 0; i < 7; i++) {
    const d = new Date(base)
    d.setDate(base.getDate() + i)
    result.push(toDateKey(d))
  }
  return result
}

export function previousWeekStart(weekStart = mondayStr()): string {
  const base = parseDateKey(weekStart)
  base.setDate(base.getDate() - 7)
  return toDateKey(base)
}

// ── Pillar score functions (0–100 each) ──────────────────────────────────────

function faithScore(logs: DailyLog[]): number {
  if (!logs.length) return 0
  const total = logs.reduce(
    (sum, l) => sum + Object.values(l.prayers).filter(Boolean).length,
    0
  )
  return Math.round((total / (logs.length * 5)) * 100)
}

function familyScore(logs: DailyLog[]): number {
  return logs.some(l => l.familyEntries.length > 0) ? 100 : 0
}

function careerScore(record: WeeklyRecord): number {
  if (!record.goals.length) return 0
  const done = record.goals.filter(g => g.completed).length
  return Math.round((done / record.goals.length) * 100)
}

function fitnessScore(logs: DailyLog[]): number {
  return logs.some(l => l.fitnessEntries.length > 0) ? 100 : 0
}

// ── Main score function ───────────────────────────────────────────────────────

export function calculateWeeklyScore(
  logs: DailyLog[],
  record: WeeklyRecord
): WeeklyScore {
  const pillars: PillarScores = {
    faith:   faithScore(logs),
    family:  familyScore(logs),
    career:  careerScore(record),
    fitness: fitnessScore(logs),
  }

  const total = Math.round(
    (pillars.faith   * WEIGHTS.faith   / 100) +
    (pillars.family  * WEIGHTS.family  / 100) +
    (pillars.career  * WEIGHTS.career  / 100) +
    (pillars.fitness * WEIGHTS.fitness / 100)
  )

  return { total, pillars }
}

export function calculateWeeklyScoreForWeek(state: Pick<SalahDataState, 'dailyLogs' | 'weeklyRecords'>, weekStart = mondayStr()) {
  const dates = getWeekDateStrings(weekStart)
  const logs = dates.map(date => state.dailyLogs[date]).filter(Boolean)
  const record = state.weeklyRecords[weekStart] ?? {
    weekStart,
    score: 0,
    goals: [],
    wins: [],
    intention: '',
    aiPlanUsed: false,
  }

  return calculateWeeklyScore(logs, record)
}

export function buildWeeklyScoreSnapshotFromState(
  state: Pick<SalahDataState, 'dailyLogs' | 'weeklyRecords'>,
  userId: string,
  weekStart = mondayStr()
): WeeklyScoreSnapshot {
  const current = calculateWeeklyScoreForWeek(state, weekStart)
  const previous = calculateWeeklyScoreForWeek(state, previousWeekStart(weekStart))

  return {
    user_id: userId,
    week_start: weekStart,
    total_score: current.total,
    trend_delta: current.total - previous.total,
    pillar_scores: current.pillars,
    updated_at: new Date().toISOString(),
  }
}

// ── Score helpers ─────────────────────────────────────────────────────────────

export function scoreLabel(score: number): string {
  if (score === 0)  return 'Set your intentions for this week'
  if (score < 41)   return 'Every action counts — keep going'
  if (score < 71)   return 'Building good momentum'
  if (score < 91)   return 'Strong week — keep going'
  return 'Excellent week, alhamdulillah'
}

// SVG ring fill: returns strokeDashoffset for a given score + radius
export function ringOffset(score: number, radius = 36): number {
  const circumference = 2 * Math.PI * radius
  return circumference * (1 - score / 100)
}

export function ringCircumference(radius = 36): number {
  return 2 * Math.PI * radius
}

// Tailwind color class for a score value
export function scoreColorClass(score: number): string {
  if (score >= 91) return 'text-brand-400'
  if (score >= 71) return 'text-faith'
  if (score >= 41) return 'text-brand-300'
  return 'text-ink-ghost'
}

// Stroke color hex for SVG ring
export function scoreStrokeColor(score: number): string {
  if (score >= 91) return '#B8904A'
  if (score >= 71) return '#7A9481'
  if (score >= 41) return '#D4A574'
  return '#9CA0A8'
}
