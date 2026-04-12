import type { SupabaseClient } from '@supabase/supabase-js'
import { buildWeeklyScoreSnapshotFromState } from '@/lib/score'
import type { Database } from '@/lib/supabase/database'
import { STATE_SCHEMA_VERSION } from '@/lib/store'
import type { SerializedSalahState } from '@/types'

export async function upsertUserStateAndSnapshot(
  client: SupabaseClient<Database>,
  state: SerializedSalahState,
  userId: string
) {
  const snapshot = buildWeeklyScoreSnapshotFromState(state, userId)
  const now = new Date().toISOString()

  const [{ error: stateError }, { error: snapshotError }] = await Promise.all([
    client.from('user_state').upsert(
      {
        user_id: userId,
        state,
        schema_version: STATE_SCHEMA_VERSION,
        updated_at: now,
      },
      { onConflict: 'user_id' }
    ),
    client.from('weekly_score_snapshots').upsert(
      {
        ...snapshot,
        updated_at: now,
      },
      { onConflict: 'user_id,week_start' }
    ),
  ])

  return {
    ok: !stateError && !snapshotError,
    stateError,
    snapshotError,
    syncedAt: now,
  }
}
