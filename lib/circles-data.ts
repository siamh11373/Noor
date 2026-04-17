import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database'
import { startOfWeekKey } from '@/lib/date'
import type { AccountabilityPeer, CircleSummary, PendingCircleInvite, PillarScores } from '@/types'

export const ACTIVE_CIRCLE_STORAGE_KEY = 'noor-active-circle-id'

export type CirclesBootstrapPayload = {
  circles: CircleSummary[]
  circleMembers: Record<string, AccountabilityPeer[]>
  pendingCircleInvites: PendingCircleInvite[]
  activeCircleId: string | null
}

function readStoredActiveCircleId(validIds: Set<string>): string | null {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(ACTIVE_CIRCLE_STORAGE_KEY)?.trim()
  if (!raw || !validIds.has(raw)) return null
  return raw
}

async function fetchPendingCircleInvites(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<PendingCircleInvite[]> {
  const { data: pendingRows } = await client
    .from('circle_invites')
    .select('id, circle_id, code, expires_at, created_at, circles(name)')
    .eq('created_by', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  return (pendingRows ?? []).map((row: Record<string, unknown>) => {
    const circlesRel = row.circles as { name?: string } | null
    return {
      id: row.id as string,
      circle_id: row.circle_id as string,
      code: row.code as string,
      expires_at: row.expires_at as string,
      created_at: row.created_at as string,
      circleName: circlesRel?.name?.trim() || 'Circle',
    }
  })
}

export async function loadCirclesBootstrap(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<CirclesBootstrapPayload> {
  const pendingCircleInvites = await fetchPendingCircleInvites(client, userId)

  const empty: CirclesBootstrapPayload = {
    circles: [],
    circleMembers: {},
    pendingCircleInvites,
    activeCircleId: null,
  }

  const { data: myMemberships, error: memErr } = await client
    .from('circle_members')
    .select('circle_id, joined_at')
    .eq('user_id', userId)

  if (memErr || !myMemberships?.length) {
    return empty
  }

  const circleIds = [...new Set(myMemberships.map((m) => m.circle_id))]
  const joinedByCircle = new Map(myMemberships.map((m) => [m.circle_id, m.joined_at]))

  const { data: circlesRows, error: cErr } = await client.from('circles').select('id, name, created_by, created_at').in('id', circleIds)

  if (cErr || !circlesRows?.length) {
    return empty
  }

  const { data: allMembers } = await client.from('circle_members').select('circle_id, user_id, joined_at').in('circle_id', circleIds)

  const membersByCircle = new Map<string, { user_id: string; joined_at: string }[]>()
  for (const row of allMembers ?? []) {
    const list = membersByCircle.get(row.circle_id) ?? []
    list.push({ user_id: row.user_id, joined_at: row.joined_at })
    membersByCircle.set(row.circle_id, list)
  }

  const allPeerIds = [...new Set((allMembers ?? []).map((m) => m.user_id).filter((id) => id !== userId))]
  const weekStart = startOfWeekKey()

  const [{ data: profiles }, { data: snapshots }] = await Promise.all([
    allPeerIds.length ? client.from('profiles').select('*').in('id', allPeerIds) : Promise.resolve({ data: [] as { id: string; display_name: string | null }[] }),
    allPeerIds.length
      ? client.from('weekly_score_snapshots').select('*').in('user_id', allPeerIds).eq('week_start', weekStart)
      : Promise.resolve({ data: [] as { user_id: string; total_score: number; trend_delta: number; pillar_scores: PillarScores }[] }),
  ])

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]))
  const snapshotMap = new Map((snapshots ?? []).map((s) => [s.user_id, s]))

  const circleMembers: Record<string, AccountabilityPeer[]> = {}

  for (const circleId of circleIds) {
    const members = membersByCircle.get(circleId) ?? []
    const peers: AccountabilityPeer[] = []
    for (const m of members) {
      if (m.user_id === userId) continue
      const profile = profileMap.get(m.user_id)
      const snapshot = snapshotMap.get(m.user_id)
      peers.push({
        id: m.user_id,
        displayName: profile?.display_name?.trim() || 'Circle member',
        score: snapshot?.total_score ?? null,
        trendDelta: snapshot?.trend_delta ?? 0,
        pillarScores: snapshot?.pillar_scores ?? null,
        connectedAt: m.joined_at,
      })
    }
    circleMembers[circleId] = peers
  }

  const circles: CircleSummary[] = circlesRows.map((c) => ({
    id: c.id,
    name: c.name.trim(),
    createdBy: c.created_by,
    createdAt: c.created_at,
    memberCount: membersByCircle.get(c.id)?.length ?? 0,
    joinedAt: joinedByCircle.get(c.id) ?? c.created_at,
  }))

  const validIds = new Set(circles.map((c) => c.id))
  let activeCircleId = readStoredActiveCircleId(validIds)
  if (!activeCircleId && circles.length > 0) {
    activeCircleId = circles[0]!.id
  }
  if (activeCircleId && typeof window !== 'undefined') {
    window.localStorage.setItem(ACTIVE_CIRCLE_STORAGE_KEY, activeCircleId)
  }

  return {
    circles,
    circleMembers,
    pendingCircleInvites,
    activeCircleId,
  }
}
