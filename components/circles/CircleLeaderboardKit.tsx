'use client'

import { Badge } from '@/components/ui'
import type { PillarScores } from '@/types'
import { cn } from '@/lib/utils'

export type LeaderboardPillar = 'faith' | 'family' | 'fitness'

export type CircleLeaderboardEntry = {
  id: string
  displayName: string
  score: number | null
  trendDelta: number
  pillarScores: PillarScores
  hasWeeklyData: boolean
  isSelf: boolean
}

export const EMPTY_PILLAR_SCORES: PillarScores = {
  faith: 0,
  family: 0,
  career: 0,
  fitness: 0,
}

export const LEADERBOARD_COLUMNS = [
  {
    key: 'faith' as const,
    label: 'Faith',
    subtitle: "Prayer and Qur'an momentum",
    tone: 'faith' as const,
  },
  {
    key: 'fitness' as const,
    label: 'Fitness',
    subtitle: 'Workout consistency this week',
    tone: 'fitness' as const,
  },
  {
    key: 'family' as const,
    label: 'Relationship',
    subtitle: 'Based on the family pillar score',
    tone: 'family' as const,
  },
] as const

export function rankCircleLeaderboardEntries(entries: CircleLeaderboardEntry[], pillar: LeaderboardPillar) {
  return [...entries].sort((left, right) => {
    const leftScore = left.hasWeeklyData ? left.pillarScores[pillar] : -1
    const rightScore = right.hasWeeklyData ? right.pillarScores[pillar] : -1

    if (rightScore !== leftScore) {
      return rightScore - leftScore
    }

    const leftTotal = left.score ?? -1
    const rightTotal = right.score ?? -1

    if (rightTotal !== leftTotal) {
      return rightTotal - leftTotal
    }

    if (left.isSelf !== right.isSelf) {
      return left.isSelf ? -1 : 1
    }

    return left.displayName.localeCompare(right.displayName)
  })
}

export function initials(name: string) {
  const letters = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('')

  return letters || '?'
}

export function formatTrendDelta(delta: number) {
  if (delta > 0) {
    return `+${delta}`
  }

  if (delta < 0) {
    return `${delta}`
  }

  return '0'
}

export function formatLeaderboardScore(score: number | null) {
  return score === null ? '--' : score
}

export type PillarBoard = (typeof LEADERBOARD_COLUMNS)[number] & { entries: CircleLeaderboardEntry[] }

export function PillarLeaderboardColumn({ column }: { column: PillarBoard }) {
  const leader = column.entries[0]
  const leaderScore = leader && leader.hasWeeklyData ? leader.pillarScores[column.key] : null

  return (
    <div
      className={cn(
        'rounded-[24px] border p-4 shadow-card',
        column.tone === 'faith' && 'border-faith-border bg-faith-light/35',
        column.tone === 'fitness' && 'border-fitness-border bg-fitness-light/35',
        column.tone === 'family' && 'border-family-border bg-family-light/35',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-ghost">{column.label}</p>
          <p className="mt-1 text-[12px] text-ink-secondary">{column.subtitle}</p>
        </div>
        <Badge variant={column.tone}>Leaderboard</Badge>
      </div>

      {leader && (
        <div className="mt-4 rounded-2xl border border-surface-border bg-surface-card px-4 py-3 shadow-control dark:border-surface-border dark:bg-surface-raised/80">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-[12px] font-semibold text-brand-500 dark:bg-brand-900/45 dark:text-brand-200">
              {initials(leader.displayName)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-[14px] font-semibold text-ink-primary">{leader.displayName}</p>
                {leader.isSelf ? <Badge variant="brand">You</Badge> : null}
              </div>
              <p className="mt-1 text-[11px] text-ink-ghost">Current leader this week</p>
            </div>
            <div className="text-right">
              <p className="text-[28px] font-semibold leading-none text-ink-primary">{formatLeaderboardScore(leaderScore)}</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-ink-ghost">top score</p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {column.entries.slice(0, 5).map((entry, index) => (
          <LeaderboardRow key={`${column.key}-${entry.id}`} entry={entry} rank={index + 1} pillar={column.key} />
        ))}
      </div>
    </div>
  )
}

function LeaderboardRow({
  entry,
  rank,
  pillar,
}: {
  entry: CircleLeaderboardEntry
  rank: number
  pillar: LeaderboardPillar
}) {
  const pillarScore = entry.hasWeeklyData ? entry.pillarScores[pillar] : null

  return (
    <div className="flex items-center gap-3 rounded-xl border border-surface-border bg-surface-raised/80 px-3 py-2.5 shadow-control dark:bg-surface-raised/50">
      <div className="flex h-7 w-7 items-center justify-center rounded-full border border-surface-border bg-surface-card text-[11px] font-semibold tabular-nums text-ink-secondary">
        {rank}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[13px] font-medium text-ink-primary">{entry.displayName}</p>
          {entry.isSelf ? <Badge variant="brand">You</Badge> : null}
        </div>
        <p className="mt-0.5 text-[10px] text-ink-ghost">
          {entry.hasWeeklyData
            ? `${entry.score ?? 0} overall${entry.isSelf ? ' • live local score' : ` • ${formatTrendDelta(entry.trendDelta)} this week`}`
            : 'Waiting for first weekly sync'}
        </p>
      </div>
      <div className="text-right">
        <p className="text-[18px] font-bold leading-none text-ink-primary">{formatLeaderboardScore(pillarScore)}</p>
        <p className="mt-1 text-[10px] text-ink-ghost">{pillar === 'family' ? 'relationship' : pillar}</p>
      </div>
    </div>
  )
}
