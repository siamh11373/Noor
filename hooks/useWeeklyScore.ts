'use client'

import { useMemo } from 'react'
import { toDateKey } from '@/lib/date'
import { useSalahStore, mondayStr } from '@/lib/store'
import { calculateWeeklyScore, getWeekDateStrings } from '@/lib/score'
import type { WeeklyScore } from '@/types'

export function useWeeklyScore(): WeeklyScore {
  const { dailyLogs, weeklyRecords } = useSalahStore()

  return useMemo(() => {
    const monday = mondayStr()
    const dates = getWeekDateStrings(monday)
    const logs = dates.map(d => dailyLogs[d]).filter(Boolean)
    const record = weeklyRecords[monday] ?? { weekStart: monday, score: 0, goals: [], wins: [], intention: '', aiPlanUsed: false }
    return calculateWeeklyScore(logs, record)
  }, [dailyLogs, weeklyRecords])
}

// Returns last N weeks of total scores for trend chart
export function useScoreHistory(weeksBack = 8): number[] {
  const { weeklyRecords } = useSalahStore()

  return useMemo(() => {
    const results: number[] = []
    const now = new Date()
    for (let i = weeksBack - 1; i >= 0; i--) {
      const d = new Date(now)
      const day = d.getDay()
      const diff = day === 0 ? -6 : 1 - day
      d.setDate(d.getDate() + diff - i * 7)
      const key = toDateKey(d)
      results.push(weeklyRecords[key]?.score ?? 0)
    }
    return results
  }, [weeklyRecords, weeksBack])
}

// Returns scores paired with their Monday date keys for interactive trend charts
export function useScoreHistoryWithKeys(weeksBack = 8): { scores: number[]; weekKeys: string[] } {
  const { weeklyRecords } = useSalahStore()

  return useMemo(() => {
    const scores: number[] = []
    const weekKeys: string[] = []
    const now = new Date()
    for (let i = weeksBack - 1; i >= 0; i--) {
      const d = new Date(now)
      const day = d.getDay()
      const diff = day === 0 ? -6 : 1 - day
      d.setDate(d.getDate() + diff - i * 7)
      const key = toDateKey(d)
      weekKeys.push(key)
      scores.push(weeklyRecords[key]?.score ?? 0)
    }
    return { scores, weekKeys }
  }, [weeklyRecords, weeksBack])
}
