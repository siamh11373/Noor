'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useWeeklyScore } from '@/hooks/useWeeklyScore'
import { useSalahStore } from '@/lib/store'
import { useAuth } from '@/components/providers/AuthProvider'
import {
  Badge,
  DashboardPanel,
  DashboardShellGrid,
  MetricCard,
  MetricGrid,
  PageHero,
  ProgressBar,
} from '@/components/ui'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { PillarScores } from '@/types'
import { cn } from '@/lib/utils'

type LeaderboardPillar = 'faith' | 'family' | 'fitness'

type CircleLeaderboardEntry = {
  id: string
  displayName: string
  score: number | null
  trendDelta: number
  pillarScores: PillarScores
  hasWeeklyData: boolean
  isSelf: boolean
}

const EMPTY_PILLAR_SCORES: PillarScores = {
  faith: 0,
  family: 0,
  career: 0,
  fitness: 0,
}

const LEADERBOARD_COLUMNS = [
  {
    key: 'faith',
    label: 'Faith',
    subtitle: 'Prayer and Qur\'an momentum',
    tone: 'faith',
  },
  {
    key: 'fitness',
    label: 'Fitness',
    subtitle: 'Workout consistency this week',
    tone: 'fitness',
  },
  {
    key: 'family',
    label: 'Relationship',
    subtitle: 'Based on the family pillar score',
    tone: 'family',
  },
] as const

// ─── SAVINGS TRACKER ──────────────────────────────────────────────────────────

function SavingsTracker() {
  const { savingsGoals, addSavingsDeposit } = useSalahStore()
  const [amount, setAmount] = useState('')

  const hajj = savingsGoals.find(g => g.id === 'hajj') ?? {
    id: 'hajj', label: 'Hajj & Umrah', targetAmount: 10000, currentAmount: 0, currency: 'USD'
  }

  const pct = Math.min((hajj.currentAmount / hajj.targetAmount) * 100, 100)

  function handleAdd() {
    const n = parseFloat(amount)
    if (!n || n <= 0) return
    addSavingsDeposit('hajj', n)
    setAmount('')
  }

  return (
    <div className="bg-brand-50 border border-brand-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[13px] font-semibold text-ink-primary">🕋 {hajj.label}</span>
        <span className="text-[11px] font-semibold text-brand-400">{Math.round(pct)}%</span>
      </div>

      <ProgressBar value={pct} color="bg-brand-400" height="h-2" className="mb-2" />

      <div className="flex justify-between text-[11px] text-ink-ghost mb-4">
        <span>${hajj.currentAmount.toLocaleString()} saved</span>
        <span>${hajj.targetAmount.toLocaleString()} goal</span>
      </div>

      <div className="flex gap-2">
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Add amount ($)"
          className="input-base"
        />
        <button onClick={handleAdd} className="btn-primary px-4">+</button>
      </div>
    </div>
  )
}

// ─── FAMILY CONNECTIONS ───────────────────────────────────────────────────────

function FamilyConnections() {
  const { getDailyLog, addFamilyEntry } = useSalahStore()
  const [text, setText] = useState('')

  const log = getDailyLog()

  function handleQuick() {
    addFamilyEntry('Connected with family today')
  }

  function handleAdd() {
    if (!text.trim()) return
    addFamilyEntry(text.trim())
    setText('')
  }

  return (
    <div>
      <button
        onClick={handleQuick}
        className="w-full py-3.5 px-4 mb-3 bg-family-light border border-family-border rounded-xl text-[14px] font-semibold text-family-text hover:bg-family-light/70 active:scale-[.99] transition-all"
      >
        ✓ Log a family connection today
      </button>

      <div className="flex gap-2 mb-4">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Who did you connect with? How?"
          className="input-base"
        />
        <button onClick={handleAdd} className="bg-family hover:opacity-90 text-white rounded-lg px-3.5 font-bold text-base transition-opacity">
          +
        </button>
      </div>

      <div className="space-y-1.5">
        {log.familyEntries.length === 0 ? (
          <div className="text-center py-6 text-[12px] text-ink-ghost border border-dashed border-surface-border rounded-xl">
            No connections logged today yet
          </div>
        ) : (
          log.familyEntries.map(entry => (
            <div key={entry.id} className="flex items-start gap-2.5 px-3 py-2.5 bg-surface-raised border border-surface-border rounded-xl">
              <span className="text-[16px] flex-shrink-0">💛</span>
              <div>
                <p className="text-[12px] text-ink-secondary">{entry.text}</p>
                <p className="text-[10px] text-ink-ghost mt-0.5">{entry.date}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ─── WEEKLY GOALS (FAMILY PILLAR) ────────────────────────────────────────────

function FamilyGoals() {
  const { getWeeklyRecord, toggleGoal, addGoal } = useSalahStore()
  const [text, setText] = useState('')
  const record = getWeeklyRecord()
  const familyGoals = record.goals.filter(g => g.pillar === 'family')

  function handleAdd() {
    if (!text.trim()) return
    addGoal(text.trim(), 'family')
    setText('')
  }

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Add a family goal this week..."
          className="input-base"
        />
        <button onClick={handleAdd} className="btn-primary px-4">+</button>
      </div>

      <div className="space-y-1.5">
        {familyGoals.length === 0 ? (
          <p className="text-[12px] text-ink-ghost py-2">No family goals set this week</p>
        ) : (
          familyGoals.map(goal => (
            <div key={goal.id} className={cn('flex items-center gap-2.5 px-3 py-2.5 bg-surface-card border rounded-xl transition-all', goal.completed ? 'opacity-60 border-surface-border' : 'border-surface-border hover:border-ink-ghost')}>
              <button
                onClick={() => toggleGoal(goal.id)}
                className={cn('w-4 h-4 rounded flex-shrink-0 border-[1.5px] flex items-center justify-center transition-all', goal.completed ? 'bg-family border-family' : 'border-surface-border hover:border-family')}
              >
                {goal.completed && (
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1 4l2 2 4-3.5" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
              <span className={cn('text-[12px] flex-1', goal.completed ? 'line-through text-ink-ghost' : 'text-ink-primary')}>
                {goal.text}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function FamilyPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { profile, user, refreshAccountability } = useAuth()
  const { getDailyLog, getWeeklyRecord, addFamilyEntry, pendingInvites, accountabilityPeers } = useSalahStore()
  const weeklyScore = useWeeklyScore()
  const log = getDailyLog()
  const record = getWeeklyRecord()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)

  const familyGoalsDone = record.goals.filter(g => g.pillar === 'family' && g.completed).length
  const familyGoalsTotal = record.goals.filter(g => g.pillar === 'family').length
  const hadConnection = log.familyEntries.length > 0
  const inviteCodeFromLink = searchParams.get('invite')
  const myName = profile?.display_name?.trim() || user?.email?.split('@')[0] || 'You'
  const leaderboardEntries: CircleLeaderboardEntry[] = [
    {
      id: user?.id ?? 'self',
      displayName: myName,
      score: weeklyScore.total,
      trendDelta: 0,
      pillarScores: weeklyScore.pillars,
      hasWeeklyData: true,
      isSelf: true,
    },
    ...accountabilityPeers.map(peer => ({
      id: peer.id,
      displayName: peer.displayName,
      score: peer.score,
      trendDelta: peer.trendDelta,
      pillarScores: peer.pillarScores ?? EMPTY_PILLAR_SCORES,
      hasWeeklyData: peer.pillarScores !== null,
      isSelf: false,
    })),
  ]
  const pillarLeaderboards = LEADERBOARD_COLUMNS.map(column => ({
    ...column,
    entries: rankCircleLeaderboardEntries(leaderboardEntries, column.key),
  }))

  useEffect(() => {
    if (inviteCodeFromLink) {
      setJoinOpen(true)
    }
  }, [inviteCodeFromLink])

  return (
    <div className="space-y-5 px-6 py-6">
      <PageHero
        eyebrow="Your Week, Illuminated"
        title="Family"
        description="Log family presence, move savings goals, and manage score-only accountability from one private surface."
        actions={
          <>
            <button onClick={() => setJoinOpen(true)} className="btn-secondary text-[12px] px-3 py-1.5">
              Join with code
            </button>
            <button onClick={() => setInviteOpen(true)} className="btn-primary text-[12px] px-3 py-1.5">
              Generate invite link
            </button>
          </>
        }
      />

      <MetricGrid>
        <MetricCard label="Weekly score" value={weeklyScore.total} hint="Shared score only" tone="brand" />
        <MetricCard label="Connections today" value={log.familyEntries.length} hint={hadConnection ? 'Connection logged today' : 'No family connection logged yet'} tone="family" />
        <MetricCard label="Family goals" value={`${familyGoalsDone}/${familyGoalsTotal || 0}`} hint="Completed this week" tone="tasks" />
        <MetricCard label="Circle size" value={accountabilityPeers.length} hint={`${pendingInvites.length} pending invites`} tone="faith" />
      </MetricGrid>

      <DashboardShellGrid
        main={
          <>
            <div className="grid gap-5 lg:grid-cols-2">
              <DashboardPanel title="Connections this week" description="Capture real family touchpoints as they happen.">
                <FamilyConnections />
              </DashboardPanel>

              <DashboardPanel title="Family goals this week" description="Translate this week’s family intention into concrete action.">
                <FamilyGoals />
              </DashboardPanel>
            </div>

            <DashboardPanel
              title="Accountability circle"
              description="Share score only. Private logs stay private."
              action={
                <div className="flex gap-2">
                  <button onClick={() => setJoinOpen(true)} className="btn-secondary text-[12px] px-3 py-1.5">
                    Join with code
                  </button>
                  <button onClick={() => setInviteOpen(true)} className="btn-primary text-[12px] px-3 py-1.5">
                    Generate invite link
                  </button>
                </div>
              }
            >
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-[12px] font-semibold text-brand-400">
                    {initials(myName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-ink-primary">{myName}</p>
                    <p className="mt-0.5 text-[10px] text-ink-ghost">Your current week</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[19px] font-bold leading-none text-ink-primary">{weeklyScore.total}</p>
                    <p className="mt-1 text-[10px] text-brand-400">Current score</p>
                  </div>
                </div>

                {pendingInvites.length > 0 && (
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-ghost">Pending</p>
                    <div className="space-y-2">
                      {pendingInvites.map(invite => (
                        <PendingInviteRow key={invite.id} invite={invite} />
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-ghost">Connected</p>
                  {accountabilityPeers.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-surface-border px-4 py-6 text-center text-[12px] text-ink-ghost">
                      No connected brothers yet. Generate an invite or join with a code.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {accountabilityPeers.map(peer => (
                        <ConnectedPeerRow key={peer.id} peer={peer} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </DashboardPanel>

            <DashboardPanel
              title="Pillar leaderboards"
              description="Compare who is leading faith, fitness, and relationship this week. Relationship uses the family pillar, and only score data is shared."
            >
              {accountabilityPeers.length === 0 && (
                <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-dashed border-surface-border bg-surface-raised/40 px-4 py-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-[13px] font-semibold text-ink-primary">You are first on every board right now.</p>
                    <p className="mt-1 text-[12px] text-ink-ghost">Invite someone into your accountability circle to compare pillar scores live each week.</p>
                  </div>
                  <button onClick={() => setInviteOpen(true)} className="btn-primary px-3 py-2 text-[12px]">
                    Invite someone
                  </button>
                </div>
              )}

              <div className="grid gap-4 xl:grid-cols-3">
                {pillarLeaderboards.map(board => (
                  <PillarLeaderboardColumn key={board.key} column={board} />
                ))}
              </div>
            </DashboardPanel>
          </>
        }
        side={
          <>
            <DashboardPanel title="Savings goals" description="Track long-horizon family goals without leaving this page.">
              <SavingsTracker />
            </DashboardPanel>

            <DashboardPanel title="Milestones" description="A compact look at progress on the goals around your family life.">
              <div className="space-y-1.5">
                {[
                  { label: 'Hajj & Umrah', pct: 0, color: 'bg-brand-400' },
                  { label: 'Family home', pct: 12, color: 'bg-tasks' },
                  { label: 'New car', pct: 34, color: 'bg-fitness' },
                ].map(({ label, pct, color }) => (
                  <div key={label} className="flex items-center gap-2.5">
                    <div className={cn('w-2 h-2 rounded-full flex-shrink-0', color)} />
                    <div className="flex-1">
                      <div className="mb-1 flex justify-between text-[11px]">
                        <span className="text-ink-secondary">{label}</span>
                        <span className="text-ink-ghost">{pct}%</span>
                      </div>
                      <ProgressBar value={pct} color={color} />
                    </div>
                  </div>
                ))}
              </div>
            </DashboardPanel>

            <DashboardPanel title="Quick log" description="Fast family actions you can capture in one tap.">
              <div className="space-y-2">
                {['Called mom', 'Spent time with wife', 'Family dinner', 'Helped someone'].map(quick => (
                  <button
                    key={quick}
                    onClick={() => addFamilyEntry(quick)}
                    className="w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2.5 text-left text-[12px] text-ink-secondary transition-all hover:border-family-border hover:bg-family-light hover:text-family-text"
                  >
                    {quick}
                  </button>
                ))}
              </div>
            </DashboardPanel>

            <DashboardPanel title="This week's wins" description="Keep visible proof of what you protected well this week.">
              <div className="space-y-1.5">
                {record.wins.length === 0 ? (
                  <p className="text-[12px] text-ink-ghost">No wins logged yet this week</p>
                ) : (
                  record.wins.slice(-4).map((win, index) => (
                    <div key={index} className="flex items-start gap-2 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-2">
                      <span className="text-[12px] flex-shrink-0">⭐</span>
                      <span className="text-[11px] text-ink-secondary">{win}</span>
                    </div>
                  ))
                )}
                <FamilyWinInput />
              </div>
            </DashboardPanel>
          </>
        }
      />

      <InviteLinkDialog open={inviteOpen} onOpenChange={setInviteOpen} />
      <JoinCircleDialog
        open={joinOpen}
        onOpenChange={open => {
          setJoinOpen(open)
          if (!open && inviteCodeFromLink) {
            router.replace('/family')
          }
        }}
        initialCode={inviteCodeFromLink ?? ''}
        onAccepted={() => {
          void refreshAccountability()
          router.replace('/family')
        }}
      />
    </div>
  )
}

function FamilyWinInput() {
  const { addWin } = useSalahStore()
  const [text, setText] = useState('')

  function handleAdd() {
    if (!text.trim()) return
    addWin(text.trim())
    setText('')
  }

  return (
    <div className="flex gap-1.5 mt-2">
      <input
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleAdd()}
        placeholder="Log a win..."
        className="input-base text-[11px] py-1.5"
      />
      <button onClick={handleAdd} className="bg-brand-400 text-white rounded-lg px-2.5 font-bold text-sm">+</button>
    </div>
  )
}

function buildTrendBars(score: number | null, trendDelta: number) {
  if (score === null) {
    return Array.from({ length: 7 }, (_, index) => index === 6 ? 22 : 8)
  }

  const start = Math.max(18, Math.min(score - trendDelta, 86))

  return Array.from({ length: 7 }, (_, index) => {
    const progress = index / 6
    const value = Math.round(start + (score - start) * progress)
    return Math.max(12, Math.min(value, 100))
  })
}

function rankCircleLeaderboardEntries(entries: CircleLeaderboardEntry[], pillar: LeaderboardPillar) {
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

function initials(name: string) {
  const letters = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('')

  return letters || '?'
}

function formatTrendDelta(delta: number) {
  if (delta > 0) {
    return `+${delta}`
  }

  if (delta < 0) {
    return `${delta}`
  }

  return '0'
}

function formatLeaderboardScore(score: number | null) {
  return score === null ? '--' : score
}

function PillarLeaderboardColumn({
  column,
}: {
  column: (typeof LEADERBOARD_COLUMNS)[number] & { entries: CircleLeaderboardEntry[] }
}) {
  const leader = column.entries[0]
  const leaderScore = leader && leader.hasWeeklyData ? leader.pillarScores[column.key] : null

  return (
    <div
      className={cn(
        'rounded-[24px] border p-4',
        column.tone === 'faith' && 'border-faith-border bg-faith-light/35',
        column.tone === 'fitness' && 'border-fitness-border bg-fitness-light/35',
        column.tone === 'family' && 'border-family-border bg-family-light/35'
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
        <div className="mt-4 rounded-2xl border border-white/70 bg-white/75 px-4 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-[12px] font-semibold text-brand-500">
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
          <LeaderboardRow
            key={`${column.key}-${entry.id}`}
            entry={entry}
            rank={index + 1}
            pillar={column.key}
          />
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
    <div className="flex items-center gap-3 rounded-xl border border-surface-border bg-surface-raised/80 px-3 py-2.5">
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-card text-[11px] font-semibold text-ink-secondary">
        {rank}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[13px] font-medium text-ink-primary">{entry.displayName}</p>
          {entry.isSelf ? <Badge variant="brand">You</Badge> : null}
        </div>
        <p className="mt-0.5 text-[10px] text-ink-ghost">
          {entry.hasWeeklyData ? `${entry.score ?? 0} overall${entry.isSelf ? ' • live local score' : ` • ${formatTrendDelta(entry.trendDelta)} this week`}` : 'Waiting for first weekly sync'}
        </p>
      </div>
      <div className="text-right">
        <p className="text-[18px] font-bold leading-none text-ink-primary">{formatLeaderboardScore(pillarScore)}</p>
        <p className="mt-1 text-[10px] text-ink-ghost">{pillar === 'family' ? 'relationship' : pillar}</p>
      </div>
    </div>
  )
}

function inviteLinkForCode(code: string) {
  if (typeof window === 'undefined') {
    return `/family?invite=${code}`
  }

  return `${window.location.origin}/family?invite=${code}`
}

function randomInviteCode() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()
  }

  return Math.random().toString(36).slice(2, 12).toUpperCase()
}

function ConnectedPeerRow({ peer }: { peer: { id: string; displayName: string; score: number | null; trendDelta: number } }) {
  const trendBars = buildTrendBars(peer.score, peer.trendDelta)

  return (
    <div className="flex items-center gap-3 rounded-xl border border-surface-border bg-surface-raised px-4 py-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-[11px] font-semibold text-brand-400">
        {initials(peer.displayName)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-ink-primary">{peer.displayName}</p>
        <p className="mt-0.5 text-[10px] text-ink-ghost">Connected accountability partner</p>
      </div>
      <div className="text-right">
        <p className="text-[18px] font-bold leading-none text-ink-primary">{peer.score ?? 0}</p>
        <p className="mt-1 text-[10px] text-faith-text">{formatTrendDelta(peer.trendDelta)} this week</p>
      </div>
      <div className="ml-3 flex h-8 items-end gap-0.5">
        {trendBars.map((height, index) => (
          <div
            key={`${peer.id}-${index}`}
            className="w-2 rounded-t-sm"
            style={{
              height: `${height}%`,
              background: index === trendBars.length - 1 ? 'var(--chart-brand)' : 'var(--trend-bar)',
            }}
          />
        ))}
      </div>
    </div>
  )
}

function PendingInviteRow({ invite }: { invite: { code: string; expires_at: string } }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(inviteLinkForCode(invite.code))
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="rounded-xl border border-tasks-border bg-tasks-light/40 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[13px] font-medium text-ink-primary">Invite code: {invite.code}</p>
          <p className="mt-0.5 text-[10px] text-ink-ghost">
            Expires {new Date(invite.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </p>
        </div>
        <button onClick={() => void handleCopy()} className="btn-secondary px-3 py-1.5 text-[12px]">
          {copied ? 'Copied' : 'Copy link'}
        </button>
      </div>
    </div>
  )
}

function InviteLinkDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { client, user, refreshAccountability } = useAuth()
  const [inviteCode, setInviteCode] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) {
      setInviteCode('')
      setInviteLink('')
      setError('')
      setCopied(false)
      setLoading(false)
      return
    }

    if (!client || !user) {
      setError('You need an account session before generating an invite.')
      return
    }

    const supabase = client
    const authUser = user
    let cancelled = false

    async function generateInvite() {
      setLoading(true)
      setError('')

      for (let attempt = 0; attempt < 3; attempt += 1) {
        const code = randomInviteCode()
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

        const { data, error: insertError } = await supabase
          .from('accountability_invites')
          .insert({
            created_by: authUser.id,
            code,
            expires_at: expiresAt,
          })
          .select('*')
          .single()

        if (!insertError && data) {
          if (!cancelled) {
            setInviteCode(data.code)
            setInviteLink(inviteLinkForCode(data.code))
            setLoading(false)
            void refreshAccountability()
          }
          return
        }
    }

      if (!cancelled) {
        setError('Could not generate an invite code right now.')
        setLoading(false)
      }
    }

    void generateInvite()

    return () => {
      cancelled = true
    }
  }, [client, open, refreshAccountability, user])

  async function handleCopy() {
    if (!inviteLink) {
      return
    }

    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(92vw,480px)]">
        <DialogHeader>
          <DialogTitle>Generate invite link</DialogTitle>
          <DialogDescription>
            Share this code with another authenticated user. They can join your circle without exposing any private logs.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-xl border border-surface-border bg-surface-raised px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-ghost">Invite code</p>
            <p className="mt-2 text-[24px] font-semibold tracking-[0.18em] text-ink-primary">
              {loading ? 'Generating…' : inviteCode || '—'}
            </p>
          </div>
          <div className="rounded-xl border border-surface-border bg-surface-raised px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-ghost">Invite link</p>
            <p className="mt-2 break-all text-[12px] text-ink-secondary">{inviteLink || 'Generating link…'}</p>
          </div>
          {error && (
            <p className="text-[12px] text-fitness-text">{error}</p>
          )}
        </div>

        <DialogFooter>
          <button onClick={() => onOpenChange(false)} className="btn-secondary">
            Close
          </button>
          <button onClick={() => void handleCopy()} className="btn-primary" disabled={!inviteLink || loading}>
            {copied ? 'Copied' : 'Copy link'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function JoinCircleDialog({
  open,
  onOpenChange,
  initialCode,
  onAccepted,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialCode: string
  onAccepted: () => void
}) {
  const { client } = useAuth()
  const [code, setCode] = useState(initialCode)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setCode(initialCode)
      setError('')
      setMessage('')
    }
  }, [initialCode, open])

  async function handleJoin() {
    const trimmed = code.trim().toUpperCase()

    if (!client || trimmed.length < 4) {
      setError('Enter a valid invite code.')
      return
    }

    setLoading(true)
    setError('')
    setMessage('')

    const { data, error: rpcError } = await client.rpc('accept_accountability_invite', {
      invite_code: trimmed,
    })

    if (rpcError) {
      setError(rpcError.message)
      setLoading(false)
      return
    }

    const status = typeof data === 'object' && data && 'status' in data ? String(data.status) : 'invalid'

    if (status === 'accepted') {
      setMessage('You are now connected in the accountability circle.')
      setLoading(false)
      onAccepted()
      onOpenChange(false)
      return
    }

    const statusMessage = {
      invalid: 'That invite code does not exist.',
      expired: 'That invite has expired.',
      revoked: 'That invite was revoked.',
      self: 'You cannot join your own invite.',
      duplicate: 'You are already connected to this brother.',
      accepted_already: 'That invite was already accepted.',
      unauthenticated: 'Sign in before accepting an invite.',
    }[status] ?? 'This invite could not be accepted.'

    setError(statusMessage)
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(92vw,480px)]">
        <DialogHeader>
          <DialogTitle>Join with code</DialogTitle>
          <DialogDescription>
            Accept an accountability invite to share weekly score and trend only.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <input
            value={code}
            onChange={event => {
              setCode(event.target.value.toUpperCase())
              if (error) {
                setError('')
              }
            }}
            onKeyDown={event => event.key === 'Enter' && void handleJoin()}
            className="input-base tracking-[0.18em] uppercase"
            placeholder="PASTE-CODE"
          />
          {message && <p className="text-[12px] text-faith-text">{message}</p>}
          {error && <p className="text-[12px] text-fitness-text">{error}</p>}
        </div>

        <DialogFooter>
          <button onClick={() => onOpenChange(false)} className="btn-secondary">
            Cancel
          </button>
          <button onClick={() => void handleJoin()} className="btn-primary" disabled={loading || !code.trim()}>
            {loading ? 'Joining...' : 'Accept invite'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
