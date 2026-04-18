'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronDown, Plus, Sparkles, UserPlus } from 'lucide-react'
import {
  EMPTY_PILLAR_SCORES,
  LEADERBOARD_COLUMNS,
  PillarLeaderboardColumn,
  type CircleLeaderboardEntry,
  initials,
  rankCircleLeaderboardEntries,
  formatTrendDelta,
} from '@/components/circles/CircleLeaderboardKit'
import { useWeeklyScore } from '@/hooks/useWeeklyScore'
import { useSalahStore } from '@/lib/store'
import {
  JoinPairingDialog,
  PairingInviteLinkDialog,
  PairingPendingInviteRow,
} from '@/components/accountability/PairingInviteDialogs'
import { useAuth } from '@/components/providers/AuthProvider'
import { Badge } from '@/components/ui'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

function rhythmTier(score: number | null, hasData: boolean): { label: string; barClass: string } {
  if (!hasData || score == null) return { label: 'Syncing', barClass: 'bg-surface-muted' }
  if (score >= 75) return { label: 'Bright', barClass: 'bg-gradient-to-r from-brand-300 to-brand-400' }
  if (score >= 50) return { label: 'Steady', barClass: 'bg-faith' }
  if (score >= 25) return { label: 'Rising', barClass: 'bg-tasks' }
  return { label: 'Grounding', barClass: 'bg-gradient-to-r from-surface-muted to-surface-border' }
}

function rankByTotal(entries: CircleLeaderboardEntry[]) {
  return [...entries].sort((a, b) => {
    const as = a.hasWeeklyData ? (a.score ?? -1) : -1
    const bs = b.hasWeeklyData ? (b.score ?? -1) : -1
    if (bs !== as) return bs - as
    if (a.isSelf !== b.isSelf) return a.isSelf ? -1 : 1
    return a.displayName.localeCompare(b.displayName)
  })
}

function scoreValue(e: CircleLeaderboardEntry) {
  return e.hasWeeklyData ? (e.score ?? 0) : 0
}

/** PostgREST when RPCs/tables were never applied to the linked project */
function friendlyCircleRpcError(message: string): string {
  if (/Could not find the function public\./i.test(message) && /schema cache/i.test(message)) {
    return 'Circles are not enabled on this database yet. Open the Supabase SQL Editor and run the file supabase/migrations/20260417120000_circles_multi.sql, then try again.'
  }
  return message
}

export default function CirclesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { client, profile, user, refreshCircles, refreshAccountability } = useAuth()
  const weeklyScore = useWeeklyScore()
  const accountabilityPeers = useSalahStore((s) => s.accountabilityPeers)
  const pendingInvites = useSalahStore((s) => s.pendingInvites)
  const circles = useSalahStore((s) => s.circles)
  const circleMembers = useSalahStore((s) => s.circleMembers)
  const activeCircleId = useSalahStore((s) => s.activeCircleId)
  const setActiveCircleId = useSalahStore((s) => s.setActiveCircleId)
  const pendingCircleInvites = useSalahStore((s) => s.pendingCircleInvites)

  const [pillarsOpen, setPillarsOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [newCircleName, setNewCircleName] = useState('')
  const [dialogBusy, setDialogBusy] = useState(false)
  const [dialogError, setDialogError] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const [inviteCopied, setInviteCopied] = useState(false)
  const [pairingInviteOpen, setPairingInviteOpen] = useState(false)
  const [pairingJoinOpen, setPairingJoinOpen] = useState(false)

  const pairInviteFromUrl = searchParams.get('invite')?.trim() ?? ''
  useEffect(() => {
    if (pairInviteFromUrl) setPairingJoinOpen(true)
  }, [pairInviteFromUrl])

  const circleInviteCode = searchParams.get('circleInvite')?.trim() ?? ''
  useEffect(() => {
    if (!circleInviteCode || !client || !user?.id) return
    let cancelled = false
    void (async () => {
      const { error } = await client.rpc('accept_circle_invite', { invite_code: circleInviteCode })
      if (cancelled) return
      if (error) {
        setDialogError(friendlyCircleRpcError(error.message))
        return
      }
      await refreshCircles()
      if (cancelled) return
      router.replace('/circles')
    })()
    return () => {
      cancelled = true
    }
  }, [circleInviteCode, client, user?.id, refreshCircles, router])

  const useNamedCircles = circles.length > 0
  const peersForBoard = useMemo(() => {
    if (!useNamedCircles || !activeCircleId) return accountabilityPeers
    return circleMembers[activeCircleId] ?? []
  }, [useNamedCircles, activeCircleId, circleMembers, accountabilityPeers])

  const activeCircle = circles.find((c) => c.id === activeCircleId) ?? null
  const pendingForActiveCircle = pendingCircleInvites.filter((i) => i.circle_id === activeCircleId).length

  const myName = profile?.display_name?.trim() || user?.email?.split('@')[0] || 'You'
  const leaderboardEntries: CircleLeaderboardEntry[] = useMemo(
    () => [
      {
        id: user?.id ?? 'self',
        displayName: myName,
        score: weeklyScore.total,
        trendDelta: 0,
        pillarScores: weeklyScore.pillars,
        hasWeeklyData: true,
        isSelf: true,
      },
      ...peersForBoard.map((peer) => ({
        id: peer.id,
        displayName: peer.displayName,
        score: peer.score,
        trendDelta: peer.trendDelta,
        pillarScores: peer.pillarScores ?? EMPTY_PILLAR_SCORES,
        hasWeeklyData: peer.pillarScores !== null,
        isSelf: false as const,
      })),
    ],
    [peersForBoard, myName, user?.id, weeklyScore.pillars, weeklyScore.total],
  )

  const ordered = useMemo(() => rankByTotal(leaderboardEntries), [leaderboardEntries])
  const pillarLeaderboards = useMemo(
    () =>
      LEADERBOARD_COLUMNS.map((column) => ({
        ...column,
        entries: rankCircleLeaderboardEntries(leaderboardEntries, column.key),
      })),
    [leaderboardEntries],
  )

  const topScore = ordered[0] ? scoreValue(ordered[0]) : 0
  const scoresForAvg = leaderboardEntries.filter((e) => e.hasWeeklyData && e.score != null).map((e) => e.score as number)
  const circleAvg = scoresForAvg.length ? Math.round(scoresForAvg.reduce((a, b) => a + b, 0) / scoresForAvg.length) : null

  async function handleCreateCircle() {
    if (!client || !newCircleName.trim()) return
    setDialogBusy(true)
    setDialogError('')
    const { data, error } = await client.rpc('create_circle', { p_name: newCircleName.trim() })
    setDialogBusy(false)
    if (error) {
      setDialogError(friendlyCircleRpcError(error.message))
      return
    }
    const row = data as { status?: string; circle_id?: string } | null
    if (row?.status === 'created' && row.circle_id) {
      setCreateOpen(false)
      setNewCircleName('')
      await refreshCircles()
      setActiveCircleId(row.circle_id)
      return
    }
    setDialogError('Could not create circle.')
  }

  async function openInviteDialog() {
    if (!client || !activeCircleId) return
    setDialogBusy(true)
    setDialogError('')
    setInviteLink('')
    const { data, error } = await client.rpc('create_circle_invite', {
      p_circle_id: activeCircleId,
      expires_in_hours: 168,
    })
    setDialogBusy(false)
    if (error) {
      setDialogError(friendlyCircleRpcError(error.message))
      return
    }
    const row = data as { status?: string; code?: string } | null
    if (row?.status === 'created' && row.code) {
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      setInviteLink(`${origin}/circles?circleInvite=${encodeURIComponent(row.code)}`)
      setInviteOpen(true)
      void refreshCircles()
      return
    }
    setDialogError('Could not create invite.')
  }

  async function handleLeaveCircle() {
    if (!client || !activeCircleId) return
    if (!window.confirm('Leave this circle? You can rejoin with a new invite if the group keeps one.')) return
    setDialogBusy(true)
    const { error } = await client.rpc('leave_circle', { p_circle_id: activeCircleId })
    setDialogBusy(false)
    if (error) {
      setDialogError(friendlyCircleRpcError(error.message))
      return
    }
    await refreshCircles()
  }

  if (circleInviteCode && searchParams.get('circleInvite')) {
    return (
      <div className="flex min-h-[45vh] flex-col items-center justify-center gap-3 px-4 py-12">
        <div className="h-8 w-8 animate-pulse rounded-full bg-brand-200 dark:bg-brand-800" />
        <p className="text-[13px] font-medium text-ink-primary">Joining circle…</p>
        {dialogError ? <p className="max-w-sm text-center text-[12px] text-fitness-text">{dialogError}</p> : null}
      </div>
    )
  }

  const podiumOrder =
    ordered.length >= 3
      ? [ordered[1]!, ordered[0]!, ordered[2]!]
      : ordered.length === 2
        ? [ordered[1]!, ordered[0]!]
        : ordered

  return (
    <div className="relative min-h-[calc(100vh-5rem)] overflow-hidden px-4 pb-10 pt-6 sm:px-6">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[min(42vh,320px)] bg-gradient-to-b from-brand-50/90 via-surface-bg to-surface-bg dark:from-brand-950/40 dark:via-surface-bg dark:to-surface-bg"
        aria-hidden
      />

      <div className="relative mx-auto max-w-4xl">
        <header className="mb-6 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-brand-200/80 bg-brand-50/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-600 dark:border-brand-800 dark:bg-brand-950/50 dark:text-brand-300">
            <Sparkles className="h-3 w-3" aria-hidden />
            This week
          </div>
          <h1 className="mt-4 text-[clamp(1.75rem,4vw,2.25rem)] font-semibold tracking-tight text-ink-primary">Circles</h1>
          <p className="mt-1.5 text-[14px] text-ink-muted">
            {useNamedCircles && activeCircle ? (
              <>
                <span className="font-medium text-ink-secondary">{activeCircle.name}</span>
                <span className="text-ink-ghost"> · </span>
                <span>{activeCircle.memberCount} members</span>
              </>
            ) : (
              <>Named circles and 1:1 pairing · Monday reset</>
            )}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button type="button" onClick={() => setCreateOpen(true)} className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px]">
              <Plus className="h-3.5 w-3.5" aria-hidden />
              New circle
            </button>
            <button
              type="button"
              onClick={() => setPairingJoinOpen(true)}
              className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px]"
            >
              Join with code
            </button>
            <button
              type="button"
              onClick={() => setPairingInviteOpen(true)}
              className="btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px]"
            >
              <UserPlus className="h-3.5 w-3.5" aria-hidden />
              Pairing invite
            </button>
            {useNamedCircles && activeCircleId ? (
              <button
                type="button"
                onClick={() => void openInviteDialog()}
                disabled={dialogBusy}
                className="btn-secondary inline-flex items-center gap-1.5 border-brand-200 px-3 py-1.5 text-[12px] dark:border-brand-800"
              >
                <UserPlus className="h-3.5 w-3.5" aria-hidden />
                Circle invite link
              </button>
            ) : null}
          </div>
        </header>

        {pendingInvites.length > 0 ? (
          <div className="mx-auto mb-8 w-full max-w-lg">
            <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-ghost">Your pairing invites</p>
            <div className="space-y-2">
              {pendingInvites.map((inv) => (
                <PairingPendingInviteRow key={inv.id} invite={inv} />
              ))}
            </div>
          </div>
        ) : null}

        {useNamedCircles ? (
          <div className="ui-segment mx-auto mb-8 flex max-w-full flex-wrap justify-center gap-0.5 overflow-x-auto p-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:max-w-2xl [&::-webkit-scrollbar]:hidden">
            {circles.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCircleId(c.id)}
                className={cn(
                  'ui-segment-btn max-w-[11rem] shrink-0 truncate px-3 py-2 sm:px-4',
                  activeCircleId === c.id
                    ? 'bg-surface-card text-ink-primary shadow-control'
                    : 'text-ink-muted hover:bg-surface-card/60 hover:text-ink-secondary',
                )}
              >
                <span className="truncate">{c.name}</span>
                <span className="ml-1.5 tabular-nums text-[11px] text-ink-ghost">{c.memberCount}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="mx-auto mb-8 max-w-md text-center text-[12px] leading-relaxed text-ink-muted">
            Create a <span className="font-medium text-ink-secondary">named circle</span> for a class, cousins, or a crew—each has its own board. 1:1 accountability from Family stays on the Family page.
          </p>
        )}

        {useNamedCircles && activeCircleId ? (
          <div className="mb-6 flex justify-center">
            <button type="button" onClick={() => void handleLeaveCircle()} disabled={dialogBusy} className="text-[11px] font-medium text-ink-muted underline-offset-2 hover:text-fitness-text hover:underline">
              Leave this circle
            </button>
          </div>
        ) : null}

        <div className="mb-10 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {[
            {
              k: 'Here',
              v: String(leaderboardEntries.length),
              sub: useNamedCircles ? `${pendingForActiveCircle} open invites` : `${pendingInvites.length} pairing invites`,
              cls: 'border-brand-200 bg-brand-50/80 text-brand-700 dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-200',
            },
            { k: 'Avg', v: circleAvg == null ? '—' : String(circleAvg), sub: 'Group', cls: 'border-faith-border bg-faith-light/60 text-faith-text dark:border-faith-border/50 dark:bg-faith-light/10' },
            { k: 'Top', v: ordered[0]?.hasWeeklyData ? String(ordered[0].score ?? '—') : '—', sub: 'High mark', cls: 'border-family-border bg-family-light/60 text-family-text dark:border-family-border/50 dark:bg-family-light/10' },
          ].map((s) => (
            <div
              key={s.k}
              className={cn(
                'flex min-w-[5.5rem] flex-col rounded-2xl border px-4 py-2.5 text-center shadow-control sm:min-w-[6.5rem]',
                s.cls,
              )}
            >
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] opacity-80">{s.k}</span>
              <span className="mt-0.5 text-[22px] font-bold tabular-nums leading-none">{s.v}</span>
              <span className="mt-0.5 text-[10px] opacity-75">{s.sub}</span>
            </div>
          ))}
        </div>

        {ordered.length > 0 && (
          <section aria-label="Top three this week" className="mb-10">
            <div className={cn('flex items-end justify-center gap-2 sm:gap-4', podiumOrder.length === 1 && 'justify-center')}>
              {podiumOrder.map((entry) => {
                const displayRank = ordered.indexOf(entry) + 1
                const isFirst = entry.id === ordered[0]?.id
                const solo = podiumOrder.length === 1
                const h = solo ? 'min-h-[200px] sm:min-h-[240px]' : isFirst ? 'min-h-[188px] sm:min-h-[220px]' : 'min-h-[148px] sm:min-h-[168px]'
                const tier = rhythmTier(entry.score, entry.hasWeeklyData)
                const podiumTint =
                  displayRank === 1
                    ? 'border-brand-300/60 bg-gradient-to-b from-brand-50 to-surface-card dark:from-brand-950/50 dark:to-surface-card'
                    : displayRank === 2
                      ? 'border-faith-border/70 bg-gradient-to-b from-faith-light/80 to-surface-card dark:from-faith-light/10'
                      : 'border-family-border/70 bg-gradient-to-b from-family-light/80 to-surface-card dark:from-family-light/10'

                return (
                  <div
                    key={entry.id}
                    className={cn(
                      'relative flex flex-col rounded-t-2xl border-2 border-b-0 px-2 pb-3 pt-4 shadow-card transition-transform duration-300',
                      solo ? 'w-full max-w-[16rem] sm:max-w-[18rem]' : 'w-[min(30vw,7.5rem)] sm:w-[min(26vw,9.5rem)]',
                      h,
                      podiumTint,
                      isFirst && !solo && 'z-[1] w-[min(34vw,8.5rem)] scale-[1.02] sm:w-[min(28vw,11rem)]',
                    )}
                  >
                    <div className="absolute -top-3 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border-2 border-surface-card bg-surface-card text-[13px] font-bold text-ink-primary shadow-control">
                      {displayRank}
                    </div>
                    <div className="mt-4 flex flex-1 flex-col items-center text-center">
                      <div
                        className={cn(
                          'flex h-12 w-12 items-center justify-center rounded-full border text-[13px] font-bold sm:h-14 sm:w-14',
                          entry.isSelf
                            ? 'border-brand-300 bg-brand-100 text-brand-600 dark:border-brand-600 dark:bg-brand-900/60 dark:text-brand-200'
                            : 'border-surface-border bg-surface-muted text-ink-secondary',
                        )}
                      >
                        {initials(entry.displayName)}
                      </div>
                      <p className="mt-2 line-clamp-2 min-h-[2.25rem] text-[11px] font-semibold leading-tight text-ink-primary sm:text-[12px]">
                        {entry.displayName}
                      </p>
                      {entry.isSelf ? (
                        <Badge variant="brand" className="mt-1">
                          You
                        </Badge>
                      ) : null}
                      <p className="mt-auto text-[26px] font-bold tabular-nums leading-none text-ink-primary sm:text-[30px]">
                        {entry.hasWeeklyData ? entry.score ?? '—' : '—'}
                      </p>
                      <span className="mt-1 rounded-full bg-surface-muted/90 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-ink-secondary">
                        {tier.label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        <section
          aria-label="Full leaderboard"
          className="rounded-[28px] border border-surface-border bg-surface-card/95 p-1 shadow-card backdrop-blur-sm dark:bg-surface-card/90"
        >
          <div className="rounded-[24px] bg-surface-raised/50 p-3 sm:p-4 dark:bg-surface-raised/30">
            <div className="mb-3 flex items-center justify-between px-1">
              <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-ink-ghost">Leaderboard</p>
              {ordered.length > 1 && topScore > 0 ? (
                <p className="text-[11px] text-ink-muted">
                  <span className="tabular-nums font-semibold text-ink-secondary">{topScore}</span> leads
                </p>
              ) : null}
            </div>
            <ul className="space-y-2">
              {ordered.map((entry, index) => {
                const s = scoreValue(entry)
                const tier = rhythmTier(entry.score, entry.hasWeeklyData)
                const pct = entry.hasWeeklyData ? Math.min(100, Math.max(0, s)) : 0
                const avgPct = circleAvg != null ? Math.min(100, Math.max(0, circleAvg)) : null

                return (
                  <li key={entry.id}>
                    <div
                      className={cn(
                        'relative overflow-hidden rounded-2xl border px-3 py-3 transition-[box-shadow,transform] duration-200 sm:px-4',
                        entry.isSelf
                          ? 'border-brand-200 bg-brand-50/90 shadow-control dark:border-brand-700/50 dark:bg-brand-950/35'
                          : 'border-surface-border bg-surface-card shadow-control hover:shadow-card-hover',
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex w-7 shrink-0 justify-center text-[13px] font-bold tabular-nums text-ink-ghost">{index + 1}</span>
                        <div
                          className={cn(
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-[12px] font-bold',
                            entry.isSelf
                              ? 'border-brand-200 bg-brand-100 text-brand-600 dark:border-brand-600 dark:bg-brand-900/55 dark:text-brand-200'
                              : 'border-surface-border bg-surface-muted text-ink-secondary',
                          )}
                        >
                          {initials(entry.displayName)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-[14px] font-semibold text-ink-primary">{entry.displayName}</span>
                            {entry.isSelf ? <Badge variant="brand">You</Badge> : null}
                            <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-ink-muted">
                              {tier.label}
                            </span>
                          </div>
                          <div className="relative mt-2 h-2 overflow-hidden rounded-full bg-surface-border">
                            <div className={cn('h-full rounded-full transition-all duration-500', tier.barClass)} style={{ width: `${pct}%` }} />
                            {avgPct != null && entry.isSelf ? (
                              <div
                                className="pointer-events-none absolute top-0 h-full w-px bg-ink-primary/25"
                                style={{ left: `${avgPct}%` }}
                                title="Circle average"
                              />
                            ) : null}
                          </div>
                          <p className="mt-1 text-[10px] text-ink-ghost">
                            {entry.isSelf
                              ? 'Bar = your week · line = circle average'
                              : entry.hasWeeklyData
                                ? `${formatTrendDelta(entry.trendDelta)} vs last week`
                                : 'Awaiting sync'}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[22px] font-bold tabular-nums leading-none text-ink-primary sm:text-[24px]">{entry.hasWeeklyData ? entry.score ?? '—' : '—'}</p>
                        </div>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </section>

        <div className="mx-auto mt-8 max-w-4xl">
          <button
            type="button"
            onClick={() => setPillarsOpen((o) => !o)}
            className="flex w-full items-center justify-between rounded-2xl border border-surface-border bg-surface-card px-4 py-3 text-left text-[13px] font-semibold text-ink-primary shadow-control transition-colors hover:border-brand-200 hover:bg-brand-50/40 dark:hover:border-brand-800 dark:hover:bg-brand-950/20"
            aria-expanded={pillarsOpen}
          >
            <span>Pillar breakdown</span>
            <ChevronDown className={cn('h-4 w-4 text-ink-muted transition-transform', pillarsOpen && 'rotate-180')} aria-hidden />
          </button>
          {pillarsOpen ? (
            <div className="mt-4 grid gap-4 xl:grid-cols-3">
              {pillarLeaderboards.map((board) => (
                <PillarLeaderboardColumn key={board.key} column={board} />
              ))}
            </div>
          ) : null}
        </div>

        <p className="mx-auto mt-10 max-w-md text-center text-[11px] leading-relaxed text-ink-ghost">
          Score-only on boards · private logs stay on each account
        </p>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="w-[min(92vw,420px)]">
          <DialogHeader>
            <DialogTitle>New circle</DialogTitle>
            <DialogDescription>A separate board—invite people with a link. You can belong to many at once.</DialogDescription>
          </DialogHeader>
          <input
            value={newCircleName}
            onChange={(e) => setNewCircleName(e.target.value)}
            placeholder="e.g. Friday halaqa, Cousins, Gym crew"
            className="input-base"
            maxLength={80}
          />
          {dialogError && createOpen ? <p className="text-[12px] text-fitness-text">{dialogError}</p> : null}
          <DialogFooter>
            <button type="button" className="btn-secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn-primary" disabled={dialogBusy || !newCircleName.trim()} onClick={() => void handleCreateCircle()}>
              {dialogBusy ? 'Creating…' : 'Create'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="w-[min(92vw,480px)]">
          <DialogHeader>
            <DialogTitle>Circle invite</DialogTitle>
            <DialogDescription>Anyone with a Noor account can open this link to join this circle only.</DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-surface-border bg-surface-raised px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-ghost">Link</p>
            <p className="mt-1 break-all text-[12px] text-ink-secondary">{inviteLink || '—'}</p>
          </div>
          <DialogFooter>
            <button type="button" className="btn-secondary" onClick={() => setInviteOpen(false)}>
              Close
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={!inviteLink}
              onClick={() => {
                void navigator.clipboard.writeText(inviteLink).then(() => {
                  setInviteCopied(true)
                  window.setTimeout(() => setInviteCopied(false), 1500)
                })
              }}
            >
              {inviteCopied ? 'Copied' : 'Copy link'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PairingInviteLinkDialog open={pairingInviteOpen} onOpenChange={setPairingInviteOpen} />
      <JoinPairingDialog
        open={pairingJoinOpen}
        onOpenChange={(open) => {
          setPairingJoinOpen(open)
          if (!open && pairInviteFromUrl) router.replace('/circles')
        }}
        initialCode={pairInviteFromUrl}
        onAccepted={() => {
          void refreshAccountability()
          router.replace('/circles')
        }}
      />
    </div>
  )
}
