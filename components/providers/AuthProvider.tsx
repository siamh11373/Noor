'use client'

import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { Session, SupabaseClient, User } from '@supabase/supabase-js'
import { useShallow } from 'zustand/react/shallow'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/database'
import { isSupabaseConfigured } from '@/lib/supabase/env'
import { upsertUserStateAndSnapshot } from '@/lib/supabase/state-sync'
import {
  clearLocalStateCache,
  createDefaultDataState,
  hasHandledLegacyImport,
  LEGACY_STORAGE_KEY,
  markLegacyImportHandled,
  normalizeSerializedState,
  readLegacyPersistedState,
  serializeStoreData,
  useSalahStore,
  writeLocalStateCache,
} from '@/lib/store'
import { mondayStr } from '@/lib/store'
import type {
  AccountabilityInvite,
  AccountabilityPeer,
  AuthUser,
  Profile,
  SerializedSalahState,
} from '@/types'

type BrowserSupabaseClient = SupabaseClient<Database> | null

interface AuthContextValue {
  client: BrowserSupabaseClient
  session: Session | null
  user: AuthUser | null
  profile: Profile | null
  isConfigured: boolean
  isReady: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  refreshAccountability: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email ?? '',
    emailConfirmedAt: user.email_confirmed_at ?? null,
  }
}

function displayNameForProfile(profile: Profile | null, user: User) {
  const fromProfile = profile?.display_name?.trim()
  if (fromProfile) {
    return fromProfile
  }

  const fromMetadata = typeof user.user_metadata.display_name === 'string'
    ? user.user_metadata.display_name.trim()
    : ''

  if (fromMetadata) {
    return fromMetadata
  }

  const email = user.email?.trim() ?? ''
  return email ? email.split('@')[0] : 'My Account'
}

async function loadProfile(client: SupabaseClient<Database>, user: User) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || null
  const displayName = displayNameForProfile(null, user)

  let { data: profile } = await client
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) {
    await client.from('profiles').upsert(
      {
        id: user.id,
        display_name: displayName,
        timezone,
      },
      { onConflict: 'id' }
    )

    const inserted = await client
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    profile = inserted.data ?? null
  } else if ((!profile.display_name || !profile.timezone) && (displayName || timezone)) {
    const patched = await client
      .from('profiles')
      .update({
        display_name: profile.display_name ?? displayName,
        timezone: profile.timezone ?? timezone,
      })
      .eq('id', user.id)
      .select('*')
      .maybeSingle()

    profile = patched.data ?? profile
  }

  return profile
}

async function loadAccountabilityData(client: SupabaseClient<Database>, userId: string) {
  const [{ data: invites }, { data: connections }] = await Promise.all([
    client
      .from('accountability_invites')
      .select('*')
      .eq('created_by', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false }),
    client
      .from('accountability_connections')
      .select('peer_user_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
  ])

  const peerIds = Array.from(new Set((connections ?? []).map(connection => connection.peer_user_id)))

  if (peerIds.length === 0) {
    return {
      pendingInvites: (invites ?? []) as AccountabilityInvite[],
      peers: [] as AccountabilityPeer[],
    }
  }

  const weekStart = mondayStr()

  const [{ data: profiles }, { data: snapshots }] = await Promise.all([
    client.from('profiles').select('*').in('id', peerIds),
    client
      .from('weekly_score_snapshots')
      .select('*')
      .in('user_id', peerIds)
      .eq('week_start', weekStart),
  ])

  const profileMap = new Map((profiles ?? []).map(profile => [profile.id, profile]))
  const snapshotMap = new Map((snapshots ?? []).map(snapshot => [snapshot.user_id, snapshot]))

  const peers = (connections ?? []).map(connection => {
    const profile = profileMap.get(connection.peer_user_id)
    const snapshot = snapshotMap.get(connection.peer_user_id)

    return {
      id: connection.peer_user_id,
      displayName: profile?.display_name?.trim() || 'Accountability partner',
      score: snapshot?.total_score ?? null,
      trendDelta: snapshot?.trend_delta ?? 0,
      pillarScores: snapshot?.pillar_scores ?? null,
      connectedAt: connection.created_at,
    }
  })

  return {
    pendingInvites: (invites ?? []) as AccountabilityInvite[],
    peers,
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const client = useMemo(() => createSupabaseBrowserClient(), [])
  const isConfigured = isSupabaseConfigured()
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [pendingImportState, setPendingImportState] = useState<SerializedSalahState | null>(null)
  const [importBusy, setImportBusy] = useState(false)
  const bootIdRef = useRef(0)
  const lastSyncedPayloadRef = useRef<string | null>(null)

  const serializableState = useSalahStore(useShallow(state => ({
    dailyLogs: state.dailyLogs,
    weeklyRecords: state.weeklyRecords,
    calendarTasks: state.calendarTasks,
    taskMonthNotes: state.taskMonthNotes,
    foodLog: state.foodLog,
    personalRecords: state.personalRecords,
    savingsGoals: state.savingsGoals,
    dhikr: state.dhikr,
    settings: state.settings,
  })))
  const authStatus = useSalahStore(state => state.authStatus)
  const dataHydrated = useSalahStore(state => state.dataHydrated)
  const setAccountabilityData = useSalahStore(state => state.setAccountabilityData)
  const setAuthStatus = useSalahStore(state => state.setAuthStatus)
  const setCloudSyncStatus = useSalahStore(state => state.setCloudSyncStatus)
  const setCurrentProfile = useSalahStore(state => state.setCurrentProfile)
  const setDataHydrated = useSalahStore(state => state.setDataHydrated)
  const setEmailVerificationStatus = useSalahStore(state => state.setEmailVerificationStatus)
  const setHasImportedLocalData = useSalahStore(state => state.setHasImportedLocalData)
  const setLastSyncedAt = useSalahStore(state => state.setLastSyncedAt)
  const setOnboardingStatus = useSalahStore(state => state.setOnboardingStatus)
  const setOnboardingStep = useSalahStore(state => state.setOnboardingStep)
  const seedOnboardingDraft = useSalahStore(state => state.seedOnboardingDraft)
  const resetOnboardingDraft = useSalahStore(state => state.resetOnboardingDraft)
  const hydrateFromCloud = useSalahStore(state => state.hydrateFromCloud)
  const resetStore = useSalahStore(state => state.resetStore)

  const refreshAccountability = useCallback(async () => {
    if (!client || !session?.user?.email_confirmed_at) {
      setAccountabilityData({ pendingInvites: [], peers: [] })
      return
    }

    const accountability = await loadAccountabilityData(client, session.user.id)
    setAccountabilityData(accountability)
  }, [client, session?.user, setAccountabilityData])

  const refreshProfile = useCallback(async () => {
    if (!client || !session?.user?.email_confirmed_at) {
      return
    }

    const nextProfile = await loadProfile(client, session.user)
    setProfile(nextProfile)
    setCurrentProfile(nextProfile)
  }, [client, session?.user, setCurrentProfile])

  const bootstrapSession = useCallback(async (nextSession: Session | null) => {
    const runId = ++bootIdRef.current
    const sessionUser = nextSession?.user ?? null

    if (!client || !sessionUser || !sessionUser.email_confirmed_at) {
      resetStore()
      setSession(nextSession)
      setUser(sessionUser && sessionUser.email_confirmed_at ? toAuthUser(sessionUser) : null)
      setProfile(null)
      setAuthStatus('unauthenticated')
      setEmailVerificationStatus(sessionUser ? 'unverified' : 'unverified')
      setCurrentProfile(null)
      setAccountabilityData({ pendingInvites: [], peers: [] })
      setCloudSyncStatus('idle')
      setOnboardingStatus('loading')
      setOnboardingStep(0)
      setLastSyncedAt(null)
      setDataHydrated(true)
      setHasImportedLocalData(false)
      resetOnboardingDraft()
      lastSyncedPayloadRef.current = null
      startTransition(() => setIsReady(true))
      return
    }

    setAuthStatus('loading')
    startTransition(() => {
      setSession(nextSession)
      setUser(toAuthUser(sessionUser))
      setIsReady(false)
    })

    const nextProfile = await loadProfile(client, sessionUser)
    const { data: remoteStateRow } = await client
      .from('user_state')
      .select('*')
      .eq('user_id', sessionUser.id)
      .maybeSingle()

    if (runId !== bootIdRef.current) {
      return
    }

    const remoteState = remoteStateRow?.state ?? null
    const normalizedState = normalizeSerializedState(remoteState ?? createDefaultDataState())
    setProfile(nextProfile)
    setCurrentProfile(nextProfile)
    hydrateFromCloud(normalizedState)
    seedOnboardingDraft({ profile: nextProfile, settings: normalizedState.settings })
    const payload = serializeStoreData(normalizedState)
    lastSyncedPayloadRef.current = JSON.stringify(payload)
    writeLocalStateCache(payload)

    const importAlreadyHandled = hasHandledLegacyImport(sessionUser.id)
    const legacyState = !remoteStateRow && !importAlreadyHandled ? readLegacyPersistedState() : null

    setAuthStatus('authenticated')
    setEmailVerificationStatus('verified')
    setCloudSyncStatus(remoteStateRow ? 'synced' : 'idle')
    setOnboardingStatus(normalizedState.settings.onboardingComplete ? 'complete' : 'required')
    setOnboardingStep(0)
    setLastSyncedAt(remoteStateRow?.updated_at ?? null)
    setHasImportedLocalData(importAlreadyHandled)

    const accountability = await loadAccountabilityData(client, sessionUser.id)

    if (runId !== bootIdRef.current) {
      return
    }

    setAccountabilityData(accountability)
    setPendingImportState(legacyState)
    startTransition(() => setIsReady(true))
  }, [
    client,
    hydrateFromCloud,
    resetStore,
    resetOnboardingDraft,
    setAccountabilityData,
    setAuthStatus,
    setCloudSyncStatus,
    setCurrentProfile,
    setDataHydrated,
    setEmailVerificationStatus,
    setHasImportedLocalData,
    setLastSyncedAt,
    setOnboardingStatus,
    setOnboardingStep,
    seedOnboardingDraft,
  ])

  const signOut = useCallback(async () => {
    if (!client) {
      return
    }

    await client.auth.signOut()
    // SECURITY FIX: clear all cached user state from localStorage on sign out.
    // Without this, sensitive prayer/fitness/family data persists on shared or public devices
    // and is accessible to the next person who opens the browser.
    clearLocalStateCache()
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(LEGACY_STORAGE_KEY)
    }
    resetStore()
    setPendingImportState(null)
    setSession(null)
    setUser(null)
    setProfile(null)
    setEmailVerificationStatus('unverified')
    setOnboardingStatus('loading')
    setOnboardingStep(0)
    resetOnboardingDraft()
    setIsReady(true)
  }, [client, resetOnboardingDraft, resetStore, setEmailVerificationStatus, setOnboardingStatus, setOnboardingStep])

  const syncState = useCallback(async (state: SerializedSalahState, userId: string) => {
    if (!client) {
      return false
    }

    const { ok, syncedAt } = await upsertUserStateAndSnapshot(client, state, userId)

    if (!ok) {
      setCloudSyncStatus('error')
      return false
    }

    setCloudSyncStatus('synced')
    setLastSyncedAt(syncedAt)
    lastSyncedPayloadRef.current = JSON.stringify(state)
    writeLocalStateCache(state)
    return true
  }, [client, setCloudSyncStatus, setLastSyncedAt])

  const handleImport = useCallback(async () => {
    if (!client || !session?.user || !pendingImportState) {
      return
    }

    setImportBusy(true)
    hydrateFromCloud(pendingImportState)
    const ok = await syncState(pendingImportState, session.user.id)

    if (ok) {
      markLegacyImportHandled(session.user.id)
      setHasImportedLocalData(true)
      setPendingImportState(null)
    }

    setImportBusy(false)
  }, [client, hydrateFromCloud, pendingImportState, session?.user, setHasImportedLocalData, syncState])

  const handleStartFresh = useCallback(() => {
    if (!session?.user) {
      return
    }

    markLegacyImportHandled(session.user.id)
    setPendingImportState(null)
    lastSyncedPayloadRef.current = null
  }, [session?.user])

  useEffect(() => {
    if (!client || !isConfigured) {
      setAuthStatus('unauthenticated')
      setEmailVerificationStatus('unverified')
      setOnboardingStatus('loading')
      setDataHydrated(true)
      setIsReady(true)
      return
    }

    let active = true

    client.auth.getSession().then(({ data }) => {
      if (!active) {
        return
      }

      void bootstrapSession(data.session)
    })

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      void bootstrapSession(nextSession)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [bootstrapSession, client, isConfigured, setAuthStatus, setDataHydrated, setEmailVerificationStatus, setOnboardingStatus])

  useEffect(() => {
    if (!client || !session?.user || authStatus !== 'authenticated' || !dataHydrated || pendingImportState) {
      return
    }

    const state = serializeStoreData(serializableState)
    const payload = JSON.stringify(state)
    writeLocalStateCache(state)

    if (payload === lastSyncedPayloadRef.current) {
      return
    }

    setCloudSyncStatus('syncing')

    const timer = window.setTimeout(() => {
      void syncState(state, session.user.id)
    }, 900)

    return () => {
      window.clearTimeout(timer)
    }
  }, [authStatus, client, dataHydrated, pendingImportState, serializableState, session?.user, setCloudSyncStatus, syncState])

  const value = useMemo<AuthContextValue>(() => ({
    client,
    session,
    user,
    profile,
    isConfigured,
    isReady,
    signOut,
    refreshProfile,
    refreshAccountability,
  }), [client, isConfigured, isReady, profile, refreshAccountability, refreshProfile, session, signOut, user])

  return (
    <AuthContext.Provider value={value}>
      {children}
      <Dialog open={Boolean(pendingImportState)} onOpenChange={() => undefined}>
        <DialogContent className="w-[min(92vw,540px)]">
          <DialogHeader>
            <DialogTitle>Import your local Noor data?</DialogTitle>
            <DialogDescription>
              I found an older local-only copy of your logs on this browser. Import it once to save your prayers,
              goals, fitness logs, food logs, savings progress, dhikr counts, and settings into your account.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-[13px] text-ink-secondary">
            Your accountability circle still shares score only. Private journal data stays private to your account.
          </div>

          <DialogFooter>
            <button onClick={handleStartFresh} className="btn-secondary" disabled={importBusy}>
              Start fresh
            </button>
            <button onClick={() => void handleImport()} className="btn-primary" disabled={importBusy}>
              {importBusy ? 'Importing...' : 'Import local data'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}
