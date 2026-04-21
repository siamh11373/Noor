'use client'

import { create } from 'zustand'
import { temporal } from 'zundo'
import type { StoreApi } from 'zustand/vanilla'
import type { TemporalState } from 'zundo'
import { startOfWeekKey, toDateKey } from '@/lib/date'
import { calendarTaskMasterId } from '@/lib/task-recurrence'
import type { CirclesBootstrapPayload } from '@/lib/circles-data'
import { ACTIVE_CIRCLE_STORAGE_KEY } from '@/lib/circles-data'
import type {
  AccountabilityInvite,
  AccountabilityPeer,
  AuthStatus,
  CalendarTask,
  CloudSyncStatus,
  DailyLog,
  CustomDhikrItem,
  DhikrCount,
  EmailVerificationStatus,
  ExerciseType,
  FitnessEntry,
  FoodEntry,
  FridayReview,
  OnboardingDraft,
  OnboardingStatus,
  PillarKey,
  PersonalRecord,
  Profile,
  QuranEntry,
  SalahDataState,
  SavingsGoal,
  SerializedSalahState,
  UserSettings,
  WeeklyRecord,
  WeeklySplit,
  WorkoutSet,
  CircleSummary,
  PendingCircleInvite,
} from '@/types'
import type {
  CountdownConfig,
  FocusConfig,
  IntervalConfig,
  TimerMode,
  TimerState,
} from '@/lib/timer'
import {
  advancePhase,
  clearPersistedTimers,
  createTimerState,
  phaseDurationMs,
  readPersistedTimers,
  writePersistedTimers,
} from '@/lib/timer'

export const STATE_SCHEMA_VERSION = 1
export const LEGACY_STORAGE_KEY = 'noor-storage'
export const LOCAL_CACHE_KEY = 'noor-cache-v1'

function importDecisionKey(userId: string) {
  return `noor-imported:${userId}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseStorageValue(raw: string | null) {
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as unknown
  } catch {
    return null
  }
}

export function todayStr(): string {
  return toDateKey(new Date())
}

export function mondayStr(date = new Date()): string {
  return startOfWeekKey(date)
}

function defaultDailyLog(date: string): DailyLog {
  return {
    date,
    prayers: { fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false },
    quranEntries: [],
    fitnessEntries: [],
    familyEntries: [],
    careerChecked: false,
    reflection: '',
    dayRating: 0,
  }
}

function defaultWeeklyRecord(weekStart: string): WeeklyRecord {
  return { weekStart, score: 0, goals: [], wins: [], intention: '', aiPlanUsed: false }
}

const defaultSplit: WeeklySplit = {
  monday: 'Chest',
  tuesday: 'Back',
  wednesday: 'Rest',
  thursday: 'Arms',
  friday: 'Legs',
  saturday: 'Shoulders',
  sunday: 'Rest',
}

function createDefaultSettings(): UserSettings {
  return {
    madhab: 'hanafi',
    calcMethod: 'ISNA',
    location: { lat: null, lng: null, city: '' },
    notificationsEnabled: true,
    notificationOffset: 10,
    weeklySplit: { ...defaultSplit },
    onboardingComplete: false,
  }
}

function createDefaultOnboardingDraft(): OnboardingDraft {
  const settings = createDefaultSettings()

  return {
    displayName: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
    madhab: settings.madhab,
    calcMethod: settings.calcMethod,
    location: { ...settings.location },
    notificationsEnabled: settings.notificationsEnabled,
    notificationOffset: settings.notificationOffset,
    weeklySplit: { ...settings.weeklySplit },
    inviteCode: '',
  }
}

function createDefaultSavingsGoals(): SavingsGoal[] {
  return [
    { id: 'hajj', label: 'Hajj & Umrah', targetAmount: 10000, currentAmount: 0, currency: 'USD' },
  ]
}

export function createDefaultDataState(): SalahDataState {
  return {
    dailyLogs: {},
    weeklyRecords: {},
    calendarTasks: [],
    taskMonthNotes: {},
    foodLog: [],
    personalRecords: [],
    savingsGoals: createDefaultSavingsGoals(),
    dhikr: { subhanAllah: 0, alhamdulillah: 0, allahuAkbar: 0 },
    customDhikr: [],
    settings: createDefaultSettings(),
  }
}

const MONTH_NOTE_KEY = /^\d{4}-\d{2}$/
const MAX_MONTH_NOTE_CHARS = 2000

function normalizeTaskMonthNotes(input: unknown, fallback: Record<string, string>): Record<string, string> {
  if (!isRecord(input)) return { ...fallback }
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(input)) {
    if (!MONTH_NOTE_KEY.test(k)) continue
    const text = typeof v === 'string' ? v : String(v ?? '')
    out[k] = text.slice(0, MAX_MONTH_NOTE_CHARS)
  }
  return out
}

export function normalizeSerializedState(input: unknown): SerializedSalahState {
  const defaults = createDefaultDataState()
  const value = isRecord(input) ? input : {}
  const settings = isRecord(value.settings) ? value.settings : {}
  const location = isRecord(settings.location) ? settings.location : {}
  const weeklySplit = isRecord(settings.weeklySplit) ? settings.weeklySplit : {}

  return {
    dailyLogs: isRecord(value.dailyLogs) ? (value.dailyLogs as Record<string, DailyLog>) : defaults.dailyLogs,
    weeklyRecords: isRecord(value.weeklyRecords) ? (value.weeklyRecords as Record<string, WeeklyRecord>) : defaults.weeklyRecords,
    calendarTasks: Array.isArray(value.calendarTasks) ? (value.calendarTasks as CalendarTask[]) : defaults.calendarTasks,
    taskMonthNotes: normalizeTaskMonthNotes(value.taskMonthNotes, defaults.taskMonthNotes),
    foodLog: Array.isArray(value.foodLog) ? (value.foodLog as FoodEntry[]) : defaults.foodLog,
    personalRecords: Array.isArray(value.personalRecords) ? (value.personalRecords as PersonalRecord[]) : defaults.personalRecords,
    savingsGoals: Array.isArray(value.savingsGoals) ? (value.savingsGoals as SavingsGoal[]) : defaults.savingsGoals,
    dhikr: isRecord(value.dhikr)
      ? {
          subhanAllah: Number(value.dhikr.subhanAllah ?? 0),
          alhamdulillah: Number(value.dhikr.alhamdulillah ?? 0),
          allahuAkbar: Number(value.dhikr.allahuAkbar ?? 0),
        }
      : defaults.dhikr,
    customDhikr: Array.isArray(value.customDhikr)
      ? (value.customDhikr as CustomDhikrItem[])
      : defaults.customDhikr,
    settings: {
      ...defaults.settings,
      ...(settings as Partial<UserSettings>),
      location: {
        ...defaults.settings.location,
        ...(location as Partial<UserSettings['location']>),
      },
      weeklySplit: {
        ...defaults.settings.weeklySplit,
        ...(weeklySplit as Partial<UserSettings['weeklySplit']>),
      },
    },
  }
}

export function serializeStoreData(data: SalahDataState): SerializedSalahState {
  return {
    dailyLogs: data.dailyLogs,
    weeklyRecords: data.weeklyRecords,
    calendarTasks: data.calendarTasks,
    taskMonthNotes: data.taskMonthNotes,
    foodLog: data.foodLog,
    personalRecords: data.personalRecords,
    savingsGoals: data.savingsGoals,
    dhikr: data.dhikr,
    customDhikr: data.customDhikr,
    settings: data.settings,
  }
}

function extractPersistedState(raw: unknown) {
  if (isRecord(raw) && 'state' in raw) {
    return normalizeSerializedState(raw.state)
  }

  return normalizeSerializedState(raw)
}

export function readLegacyPersistedState() {
  if (typeof window === 'undefined') {
    return null
  }

  const parsed = parseStorageValue(window.localStorage.getItem(LEGACY_STORAGE_KEY))
  if (!parsed) {
    return null
  }

  return extractPersistedState(parsed)
}

export function readLocalStateCache() {
  if (typeof window === 'undefined') {
    return null
  }

  const parsed = parseStorageValue(window.localStorage.getItem(LOCAL_CACHE_KEY))
  if (!parsed || !isRecord(parsed) || !('state' in parsed)) {
    return null
  }

  return extractPersistedState(parsed.state)
}

export function writeLocalStateCache(state: SerializedSalahState) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(
    LOCAL_CACHE_KEY,
    JSON.stringify({
      schemaVersion: STATE_SCHEMA_VERSION,
      cachedAt: new Date().toISOString(),
      state,
    })
  )
}

export function clearLocalStateCache() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(LOCAL_CACHE_KEY)
}

export function hasHandledLegacyImport(userId: string) {
  if (typeof window === 'undefined') {
    return false
  }

  return window.localStorage.getItem(importDecisionKey(userId)) === '1'
}

export function markLegacyImportHandled(userId: string) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(importDecisionKey(userId), '1')
}

function createWorkoutEntry(
  date: string,
  patch: { type?: ExerciseType; note?: string; duration?: number } = {}
): FitnessEntry {
  return {
    id: Date.now().toString(),
    type: patch.type ?? 'Gym',
    note: patch.note ?? '',
    exercises: [],
    date,
    duration: patch.duration,
  }
}

function withWorkoutEntry(
  log: DailyLog,
  date: string,
  patch: { type?: ExerciseType; note?: string; duration?: number } = {}
): DailyLog {
  const [existing, ...rest] = log.fitnessEntries

  if (!existing) {
    return { ...log, fitnessEntries: [createWorkoutEntry(date, patch)] }
  }

  return {
    ...log,
    fitnessEntries: [
      {
        ...existing,
        ...(patch.type ? { type: patch.type } : {}),
        ...(patch.note !== undefined ? { note: patch.note } : {}),
        ...(patch.duration !== undefined ? { duration: patch.duration } : {}),
      },
      ...rest,
    ],
  }
}

function isBetterRecord(current: PersonalRecord | undefined, next: WorkoutSet): boolean {
  if (!current) {
    return true
  }

  if (next.weight > current.weight) {
    return true
  }

  return next.weight === current.weight && next.reps > current.reps
}

interface SalahStore extends SalahDataState {
  currentProfile: Profile | null
  pendingInvites: AccountabilityInvite[]
  accountabilityPeers: AccountabilityPeer[]
  circles: CircleSummary[]
  circleMembers: Record<string, AccountabilityPeer[]>
  activeCircleId: string | null
  pendingCircleInvites: PendingCircleInvite[]
  authStatus: AuthStatus
  emailVerificationStatus: EmailVerificationStatus
  cloudSyncStatus: CloudSyncStatus
  onboardingStatus: OnboardingStatus
  onboardingStep: number
  onboardingDraft: OnboardingDraft
  lastSyncedAt: string | null
  hasImportedLocalData: boolean
  dataHydrated: boolean
  /** All timers. At least one is created in `initialStoreState()`. */
  timers: TimerState[]
  /** Which timer the UI focuses on by default. Most actions default to this. */
  activeTimerId: string | null

  setAuthStatus: (status: AuthStatus) => void
  setEmailVerificationStatus: (status: EmailVerificationStatus) => void
  setCloudSyncStatus: (status: CloudSyncStatus) => void
  setOnboardingStatus: (status: OnboardingStatus) => void
  setOnboardingStep: (step: number) => void
  setLastSyncedAt: (isoDate: string | null) => void
  setHasImportedLocalData: (value: boolean) => void
  setDataHydrated: (value: boolean) => void
  setCurrentProfile: (profile: Profile | null) => void
  setAccountabilityData: (payload: { pendingInvites: AccountabilityInvite[]; peers: AccountabilityPeer[] }) => void
  setCirclesData: (payload: CirclesBootstrapPayload) => void
  setActiveCircleId: (circleId: string | null) => void
  seedOnboardingDraft: (payload?: { profile?: Profile | null; settings?: UserSettings }) => void
  patchOnboardingDraft: (patch: Partial<OnboardingDraft>) => void
  resetOnboardingDraft: () => void
  hydrateFromCloud: (state: SerializedSalahState | null) => void
  resetStore: () => void

  getDailyLog: (date?: string) => DailyLog
  togglePrayer: (prayer: keyof DailyLog['prayers'], date?: string) => void
  addQuranEntry: (entry: Omit<QuranEntry, 'id'>) => void
  deleteQuranEntry: (id: string) => void
  addFitnessEntry: (entry: Omit<FitnessEntry, 'id'>) => void
  addFamilyEntry: (text: string) => void
  setCareerChecked: (checked: boolean) => void
  setReflection: (text: string) => void
  setDayRating: (rating: number) => void

  getWeeklyRecord: (weekStart?: string) => WeeklyRecord
  addGoal: (text: string, pillar: PillarKey) => void
  toggleGoal: (id: string) => void
  deleteGoal: (id: string) => void
  addWin: (text: string) => void
  setIntention: (text: string) => void
  setFridayReview: (review: Omit<FridayReview, 'completedAt'>) => void

  incrementDhikr: (key: keyof DhikrCount) => void
  setDhikrCount: (key: keyof DhikrCount, count: number) => void
  addDhikrCounts: (counts: Partial<DhikrCount>) => void
  resetDhikr: () => void
  addCustomDhikr: (label: string) => void
  setCustomDhikrCount: (id: string, count: number) => void
  deleteCustomDhikr: (id: string) => void

  upsertWorkoutSession: (session: { type?: ExerciseType; note?: string; duration?: number }, date?: string) => void
  addExerciseToWorkout: (exercise: { name: string; muscleGroup: string }, date?: string) => void
  addSetToExercise: (exerciseId: string, set: WorkoutSet, date?: string) => void
  addFoodEntry: (entry: Omit<FoodEntry, 'id'>) => void
  deleteFoodEntry: (id: string) => void
  upsertPersonalRecord: (record: PersonalRecord) => void
  updateWeeklySplit: (split: WeeklySplit) => void

  addCalendarTask: (task: Omit<CalendarTask, 'id'>) => string
  updateCalendarTask: (id: string, patch: Partial<Omit<CalendarTask, 'id'>>) => void
  /** Apply many task patches in one state update (avoids stale reads between moves). */
  applyCalendarTaskPatches: (patches: Array<{ id: string; patch: Partial<Omit<CalendarTask, 'id'>> }>) => void
  deleteCalendarTask: (id: string) => void
  toggleCalendarTask: (id: string) => void
  setTaskMonthNote: (monthKey: string, body: string) => void

  addSavingsDeposit: (goalId: string, amount: number) => void
  upsertSavingsGoal: (goal: SavingsGoal) => void

  updateSettings: (patch: Partial<UserSettings>) => void

  pruneOldLogs: () => void
  exportData: () => string

  setTimerMode: (mode: TimerMode, id?: string) => void
  setFocusConfig: (patch: Partial<FocusConfig>, id?: string) => void
  setCountdownConfig: (patch: Partial<CountdownConfig>, id?: string) => void
  setIntervalConfig: (patch: Partial<IntervalConfig>, id?: string) => void
  setTimerSoundEnabled: (enabled: boolean, id?: string) => void
  setTimerNotificationsEnabled: (enabled: boolean, id?: string) => void
  setTimerLinkedTask: (taskId: string | null, id?: string) => void
  startTimer: (id?: string) => void
  pauseTimer: (id?: string) => void
  resumeTimer: (id?: string) => void
  resetTimer: (id?: string) => void
  adjustPausedCountdown: (remainingMs: number, id?: string) => void
  /** Skip current phase → advance to the next (break → work, work → rest, etc.). */
  skipPhase: (id?: string) => { completed: boolean }
  /** Called by the hook when elapsed >= phase duration. Returns { completed }. */
  completePhase: (id?: string) => { completed: boolean }
  /** Dismiss the completion screen + reset to idle. */
  dismissTimerCompletion: (id?: string) => void
  /** Rehydrate all timers from localStorage (called once on shell mount). */
  rehydrateTimer: () => void
  // Multi-timer management
  createTimer: (opts?: { mode?: TimerMode; label?: string | null; activate?: boolean }) => string
  removeTimer: (id: string) => void
  setActiveTimer: (id: string) => void
  renameTimer: (id: string, label: string | null) => void
}

function initialStoreState() {
  return {
    ...createDefaultDataState(),
    currentProfile: null as Profile | null,
    pendingInvites: [] as AccountabilityInvite[],
    accountabilityPeers: [] as AccountabilityPeer[],
    circles: [] as CircleSummary[],
    circleMembers: {} as Record<string, AccountabilityPeer[]>,
    activeCircleId: null as string | null,
    pendingCircleInvites: [] as PendingCircleInvite[],
    authStatus: 'loading' as AuthStatus,
    emailVerificationStatus: 'loading' as EmailVerificationStatus,
    cloudSyncStatus: 'idle' as CloudSyncStatus,
    onboardingStatus: 'loading' as OnboardingStatus,
    onboardingStep: 0,
    onboardingDraft: createDefaultOnboardingDraft(),
    lastSyncedAt: null as string | null,
    hasImportedLocalData: false,
    dataHydrated: false,
    ...(() => {
      const seed = createTimerState()
      return { timers: [seed] as TimerState[], activeTimerId: seed.id as string | null }
    })(),
  }
}

// Slice of SalahStore tracked by zundo for undo/redo.
// Excludes transient auth/UI/server state that should never be undoable.
type UndoablePart = Pick<
  SalahStore,
  | 'dailyLogs'
  | 'weeklyRecords'
  | 'calendarTasks'
  | 'taskMonthNotes'
  | 'foodLog'
  | 'personalRecords'
  | 'savingsGoals'
  | 'dhikr'
  | 'settings'
>

// Small debounce used by zundo's handleSet so rapid edits (typing, drags)
// coalesce into a single history entry.
function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  wait: number
): (...args: A) => void {
  let timer: ReturnType<typeof setTimeout> | null = null
  let lastArgs: A | null = null
  return (...args: A) => {
    lastArgs = args
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      if (lastArgs) fn(...lastArgs)
      lastArgs = null
    }, wait)
  }
}

// ─── TIMER MUTATION HELPER ──────────────────────────────────────────────────
//
// Every timer action resolves a target id (explicit > activeTimerId), runs
// an updater against the matched timer, bumps `lastInteractedAt`, and
// persists. Returning the same reference from the updater is a no-op.

type StoreSet = (
  partial:
    | Partial<SalahStore>
    | ((s: SalahStore) => Partial<SalahStore>),
  replace?: false,
) => void
type StoreGet = () => SalahStore

function mutateTimer(
  set: StoreSet,
  get: StoreGet,
  id: string | null | undefined,
  updater: (t: TimerState) => TimerState,
) {
  const state = get()
  const targetId = id ?? state.activeTimerId
  if (!targetId) return
  const idx = state.timers.findIndex((t) => t.id === targetId)
  if (idx < 0) return
  const current = state.timers[idx]
  const updated = updater(current)
  if (updated === current) return
  const touched: TimerState = {
    ...updated,
    id: current.id, // id is immutable
    lastInteractedAt: Date.now(),
  }
  const timers = state.timers.slice()
  timers[idx] = touched
  writePersistedTimers(timers, state.activeTimerId)
  set({ timers })
}

function shallowEqual(a: Record<string, unknown>, b: Record<string, unknown>) {
  if (a === b) return true
  const ak = Object.keys(a)
  const bk = Object.keys(b)
  if (ak.length !== bk.length) return false
  for (const key of ak) {
    if (a[key] !== b[key]) return false
  }
  return true
}

export const useSalahStore = create<SalahStore>()(
  temporal(
    (set, get) => ({
  ...initialStoreState(),

  setAuthStatus(status) {
    set({ authStatus: status })
  },

  setEmailVerificationStatus(status) {
    set({ emailVerificationStatus: status })
  },

  setCloudSyncStatus(status) {
    set({ cloudSyncStatus: status })
  },

  setOnboardingStatus(status) {
    set({ onboardingStatus: status })
  },

  setOnboardingStep(step) {
    set({ onboardingStep: step })
  },

  setLastSyncedAt(isoDate) {
    set({ lastSyncedAt: isoDate })
  },

  setHasImportedLocalData(value) {
    set({ hasImportedLocalData: value })
  },

  setDataHydrated(value) {
    set({ dataHydrated: value })
  },

  setCurrentProfile(profile) {
    set({ currentProfile: profile })
  },

  setAccountabilityData(payload) {
    set({
      pendingInvites: payload.pendingInvites,
      accountabilityPeers: payload.peers,
    })
  },

  setCirclesData(payload) {
    set({
      circles: payload.circles,
      circleMembers: payload.circleMembers,
      pendingCircleInvites: payload.pendingCircleInvites,
      activeCircleId: payload.activeCircleId,
    })
  },

  setActiveCircleId(circleId) {
    if (typeof window !== 'undefined') {
      if (circleId) {
        window.localStorage.setItem(ACTIVE_CIRCLE_STORAGE_KEY, circleId)
      } else {
        window.localStorage.removeItem(ACTIVE_CIRCLE_STORAGE_KEY)
      }
    }
    set({ activeCircleId: circleId })
  },

  seedOnboardingDraft(payload) {
    set(state => {
      const draft = createDefaultOnboardingDraft()
      const settings = payload?.settings ?? state.settings
      const profile = payload?.profile ?? state.currentProfile

      return {
        onboardingDraft: {
          ...draft,
          displayName: profile?.display_name?.trim() || draft.displayName,
          timezone: profile?.timezone?.trim() || draft.timezone,
          madhab: settings.madhab,
          calcMethod: settings.calcMethod,
          location: { ...settings.location },
          notificationsEnabled: settings.notificationsEnabled,
          notificationOffset: settings.notificationOffset,
          weeklySplit: { ...settings.weeklySplit },
          inviteCode: state.onboardingDraft.inviteCode,
        },
      }
    })
  },

  patchOnboardingDraft(patch) {
    set(state => ({
      onboardingDraft: {
        ...state.onboardingDraft,
        ...patch,
        location: patch.location
          ? { ...state.onboardingDraft.location, ...patch.location }
          : state.onboardingDraft.location,
        weeklySplit: patch.weeklySplit
          ? { ...state.onboardingDraft.weeklySplit, ...patch.weeklySplit }
          : state.onboardingDraft.weeklySplit,
      },
    }))
  },

  resetOnboardingDraft() {
    set({ onboardingDraft: createDefaultOnboardingDraft(), onboardingStep: 0 })
  },

  hydrateFromCloud(state) {
    const nextState = normalizeSerializedState(state)
    const nextProfile = get().currentProfile
    const baseDraft = createDefaultOnboardingDraft()

    set({
      ...nextState,
      onboardingStatus: nextState.settings.onboardingComplete ? 'complete' : 'required',
      onboardingDraft: {
        ...baseDraft,
        displayName: nextProfile?.display_name?.trim() || baseDraft.displayName,
        timezone: nextProfile?.timezone?.trim() || baseDraft.timezone,
        madhab: nextState.settings.madhab,
        calcMethod: nextState.settings.calcMethod,
        location: { ...nextState.settings.location },
        notificationsEnabled: nextState.settings.notificationsEnabled,
        notificationOffset: nextState.settings.notificationOffset,
        weeklySplit: { ...nextState.settings.weeklySplit },
        inviteCode: get().onboardingDraft.inviteCode,
      },
      dataHydrated: true,
    })
    useSalahStore.temporal.getState().clear()
  },

  resetStore() {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(ACTIVE_CIRCLE_STORAGE_KEY)
    }
    clearPersistedTimers()
    set(initialStoreState())
    useSalahStore.temporal.getState().clear()
  },

  getDailyLog(date = todayStr()) {
    return get().dailyLogs[date] ?? defaultDailyLog(date)
  },

  togglePrayer(prayer, date = todayStr()) {
    set(s => {
      const log = s.dailyLogs[date] ?? defaultDailyLog(date)
      return {
        dailyLogs: {
          ...s.dailyLogs,
          [date]: { ...log, prayers: { ...log.prayers, [prayer]: !log.prayers[prayer] } },
        },
      }
    })
  },

  addQuranEntry(entry) {
    const id = Date.now().toString()
    const date = todayStr()
    set(s => {
      const log = s.dailyLogs[date] ?? defaultDailyLog(date)
      return {
        dailyLogs: {
          ...s.dailyLogs,
          [date]: { ...log, quranEntries: [...log.quranEntries, { ...entry, id }] },
        },
      }
    })
  },

  deleteQuranEntry(id) {
    const date = todayStr()
    set(s => {
      const log = s.dailyLogs[date] ?? defaultDailyLog(date)
      return {
        dailyLogs: {
          ...s.dailyLogs,
          [date]: { ...log, quranEntries: log.quranEntries.filter(entry => entry.id !== id) },
        },
      }
    })
  },

  addFitnessEntry(entry) {
    const id = Date.now().toString()
    const date = todayStr()
    set(s => {
      const log = s.dailyLogs[date] ?? defaultDailyLog(date)
      return {
        dailyLogs: {
          ...s.dailyLogs,
          [date]: { ...log, fitnessEntries: [...log.fitnessEntries, { ...entry, id }] },
        },
      }
    })
  },

  addFamilyEntry(text) {
    const id = Date.now().toString()
    const date = todayStr()
    set(s => {
      const log = s.dailyLogs[date] ?? defaultDailyLog(date)
      return {
        dailyLogs: {
          ...s.dailyLogs,
          [date]: { ...log, familyEntries: [...log.familyEntries, { id, text, date }] },
        },
      }
    })
  },

  setCareerChecked(checked) {
    const date = todayStr()
    set(s => {
      const log = s.dailyLogs[date] ?? defaultDailyLog(date)
      return {
        dailyLogs: {
          ...s.dailyLogs,
          [date]: { ...log, careerChecked: checked },
        },
      }
    })
  },

  setReflection(text) {
    const date = todayStr()
    set(s => {
      const log = s.dailyLogs[date] ?? defaultDailyLog(date)
      return {
        dailyLogs: {
          ...s.dailyLogs,
          [date]: { ...log, reflection: text },
        },
      }
    })
  },

  setDayRating(rating) {
    const date = todayStr()
    set(s => {
      const log = s.dailyLogs[date] ?? defaultDailyLog(date)
      return {
        dailyLogs: {
          ...s.dailyLogs,
          [date]: { ...log, dayRating: rating },
        },
      }
    })
  },

  getWeeklyRecord(weekStart = mondayStr()) {
    return get().weeklyRecords[weekStart] ?? defaultWeeklyRecord(weekStart)
  },

  addGoal(text, pillar) {
    const weekStart = mondayStr()
    const id = Date.now().toString()
    set(s => {
      const record = s.weeklyRecords[weekStart] ?? defaultWeeklyRecord(weekStart)
      return {
        weeklyRecords: {
          ...s.weeklyRecords,
          [weekStart]: { ...record, goals: [...record.goals, { id, text, pillar, completed: false }] },
        },
      }
    })
  },

  toggleGoal(id) {
    const weekStart = mondayStr()
    set(s => {
      const record = s.weeklyRecords[weekStart] ?? defaultWeeklyRecord(weekStart)
      return {
        weeklyRecords: {
          ...s.weeklyRecords,
          [weekStart]: {
            ...record,
            goals: record.goals.map(goal => goal.id === id ? { ...goal, completed: !goal.completed } : goal),
          },
        },
      }
    })
  },

  deleteGoal(id) {
    const weekStart = mondayStr()
    set(s => {
      const record = s.weeklyRecords[weekStart] ?? defaultWeeklyRecord(weekStart)
      return {
        weeklyRecords: {
          ...s.weeklyRecords,
          [weekStart]: { ...record, goals: record.goals.filter(goal => goal.id !== id) },
        },
      }
    })
  },

  addWin(text) {
    const weekStart = mondayStr()
    set(s => {
      const record = s.weeklyRecords[weekStart] ?? defaultWeeklyRecord(weekStart)
      return {
        weeklyRecords: {
          ...s.weeklyRecords,
          [weekStart]: { ...record, wins: [...record.wins, text] },
        },
      }
    })
  },

  setIntention(text) {
    const weekStart = mondayStr()
    set(s => {
      const record = s.weeklyRecords[weekStart] ?? defaultWeeklyRecord(weekStart)
      return {
        weeklyRecords: {
          ...s.weeklyRecords,
          [weekStart]: { ...record, intention: text },
        },
      }
    })
  },

  setFridayReview(review) {
    const weekStart = mondayStr()
    set(s => {
      const record = s.weeklyRecords[weekStart] ?? defaultWeeklyRecord(weekStart)
      return {
        weeklyRecords: {
          ...s.weeklyRecords,
          [weekStart]: {
            ...record,
            intention: review.intention,
            fridayReview: {
              ...review,
              completedAt: new Date().toISOString(),
            },
          },
        },
      }
    })
  },

  incrementDhikr(key) {
    set(s => ({ dhikr: { ...s.dhikr, [key]: s.dhikr[key] + 1 } }))
  },

  setDhikrCount(key, count) {
    set(s => ({ dhikr: { ...s.dhikr, [key]: Math.max(0, count) } }))
  },

  addDhikrCounts(counts) {
    set(s => ({
      dhikr: {
        subhanAllah: s.dhikr.subhanAllah + Math.max(0, counts.subhanAllah ?? 0),
        alhamdulillah: s.dhikr.alhamdulillah + Math.max(0, counts.alhamdulillah ?? 0),
        allahuAkbar: s.dhikr.allahuAkbar + Math.max(0, counts.allahuAkbar ?? 0),
      },
    }))
  },

  resetDhikr() {
    set(s => ({
      dhikr: { subhanAllah: 0, alhamdulillah: 0, allahuAkbar: 0 },
      customDhikr: s.customDhikr.map(item => ({ ...item, count: 0 })),
    }))
  },

  addCustomDhikr(label) {
    const trimmed = label.trim()
    if (!trimmed) return
    set(s => ({
      customDhikr: [...s.customDhikr, { id: crypto.randomUUID(), label: trimmed, count: 0 }],
    }))
  },

  setCustomDhikrCount(id, count) {
    set(s => ({
      customDhikr: s.customDhikr.map(item =>
        item.id === id ? { ...item, count: Math.max(0, count) } : item
      ),
    }))
  },

  deleteCustomDhikr(id) {
    set(s => ({ customDhikr: s.customDhikr.filter(item => item.id !== id) }))
  },

  upsertWorkoutSession(session, date = todayStr()) {
    set(s => {
      const log = s.dailyLogs[date] ?? defaultDailyLog(date)
      return {
        dailyLogs: {
          ...s.dailyLogs,
          [date]: withWorkoutEntry(log, date, session),
        },
      }
    })
  },

  addExerciseToWorkout(exercise, date = todayStr()) {
    set(s => {
      const log = s.dailyLogs[date] ?? defaultDailyLog(date)
      const nextLog = withWorkoutEntry(log, date)
      const [workout, ...rest] = nextLog.fitnessEntries

      if (!workout) {
        return { dailyLogs: { ...s.dailyLogs, [date]: nextLog } }
      }

      return {
        dailyLogs: {
          ...s.dailyLogs,
          [date]: {
            ...nextLog,
            fitnessEntries: [
              {
                ...workout,
                exercises: [
                  ...workout.exercises,
                  {
                    id: Date.now().toString(),
                    name: exercise.name,
                    muscleGroup: exercise.muscleGroup,
                    sets: [],
                  },
                ],
              },
              ...rest,
            ],
          },
        },
      }
    })
  },

  addSetToExercise(exerciseId, workoutSet, date = todayStr()) {
    set(s => {
      const log = s.dailyLogs[date] ?? defaultDailyLog(date)
      const nextLog = withWorkoutEntry(log, date)
      const [workout, ...rest] = nextLog.fitnessEntries

      if (!workout) {
        return { dailyLogs: { ...s.dailyLogs, [date]: nextLog } }
      }

      let updatedRecord = s.personalRecords

      const nextExercises = workout.exercises.map(exercise => {
        if (exercise.id !== exerciseId) {
          return exercise
        }

        const currentRecord = s.personalRecords.find(record => record.exercise === exercise.name)
        const isPersonalRecord = isBetterRecord(currentRecord, workoutSet)
        const nextSet = { ...workoutSet, isPersonalRecord }

        if (isPersonalRecord) {
          const record = {
            exercise: exercise.name,
            weight: workoutSet.weight,
            reps: workoutSet.reps,
            date,
          }

          const existingIndex = updatedRecord.findIndex(item => item.exercise === exercise.name)
          updatedRecord = existingIndex >= 0
            ? updatedRecord.map((item, index) => index === existingIndex ? record : item)
            : [...updatedRecord, record]
        }

        return {
          ...exercise,
          sets: [...exercise.sets, nextSet],
        }
      })

      return {
        personalRecords: updatedRecord,
        dailyLogs: {
          ...s.dailyLogs,
          [date]: {
            ...nextLog,
            fitnessEntries: [
              {
                ...workout,
                exercises: nextExercises,
              },
              ...rest,
            ],
          },
        },
      }
    })
  },

  addFoodEntry(entry) {
    const id = Date.now().toString()
    set(s => ({ foodLog: [...s.foodLog, { ...entry, id }] }))
  },

  deleteFoodEntry(id) {
    set(s => ({ foodLog: s.foodLog.filter(entry => entry.id !== id) }))
  },

  upsertPersonalRecord(record) {
    set(s => {
      const existing = s.personalRecords.findIndex(item => item.exercise === record.exercise)
      if (existing >= 0) {
        const updated = [...s.personalRecords]
        updated[existing] = record
        return { personalRecords: updated }
      }

      return { personalRecords: [...s.personalRecords, record] }
    })
  },

  updateWeeklySplit(split) {
    set(s => ({ settings: { ...s.settings, weeklySplit: split } }))
  },

  addCalendarTask(task) {
    const id = crypto.randomUUID()
    set(s => ({
      calendarTasks: [...s.calendarTasks, { ...task, id }],
    }))
    return id
  },

  updateCalendarTask(id, patch) {
    const mid = calendarTaskMasterId(id)
    set(s => ({
      calendarTasks: s.calendarTasks.map(t => (t.id === mid ? { ...t, ...patch } : t)),
    }))
  },

  applyCalendarTaskPatches(patches) {
    if (patches.length === 0) return
    set(s => {
      let list = s.calendarTasks
      for (const { id, patch } of patches) {
        const mid = calendarTaskMasterId(id)
        list = list.map(t => (t.id === mid ? { ...t, ...patch } : t))
      }
      return { calendarTasks: list }
    })
  },

  deleteCalendarTask(id) {
    const mid = calendarTaskMasterId(id)
    set(s => ({
      calendarTasks: s.calendarTasks.filter(t => t.id !== mid),
    }))
  },

  toggleCalendarTask(id) {
    const mid = calendarTaskMasterId(id)
    set(s => ({
      calendarTasks: s.calendarTasks.map(t => (t.id === mid ? { ...t, completed: !t.completed } : t)),
    }))
  },

  setTaskMonthNote(monthKey, body) {
    if (!MONTH_NOTE_KEY.test(monthKey)) return
    const trimmed = body.trim().slice(0, MAX_MONTH_NOTE_CHARS)
    set((s) => {
      const next = { ...s.taskMonthNotes }
      if (!trimmed) delete next[monthKey]
      else next[monthKey] = trimmed
      return { taskMonthNotes: next }
    })
  },

  addSavingsDeposit(goalId, amount) {
    set(s => ({
      savingsGoals: s.savingsGoals.map(goal =>
        goal.id === goalId ? { ...goal, currentAmount: goal.currentAmount + amount } : goal
      ),
    }))
  },

  upsertSavingsGoal(goal) {
    set(s => {
      const index = s.savingsGoals.findIndex(item => item.id === goal.id)
      if (index >= 0) {
        const updated = [...s.savingsGoals]
        updated[index] = goal
        return { savingsGoals: updated }
      }

      return { savingsGoals: [...s.savingsGoals, goal] }
    })
  },

  updateSettings(patch) {
    set(s => ({
      settings: {
        ...s.settings,
        ...patch,
        location: patch.location ? { ...s.settings.location, ...patch.location } : s.settings.location,
        weeklySplit: patch.weeklySplit ? { ...s.settings.weeklySplit, ...patch.weeklySplit } : s.settings.weeklySplit,
      },
    }))
  },

  pruneOldLogs() {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 90)
    const cutoffStr = toDateKey(cutoff)
    set(s => ({
      dailyLogs: Object.fromEntries(
        Object.entries(s.dailyLogs).filter(([date]) => date >= cutoffStr)
      ),
    }))
  },

  exportData() {
    const state = get()
    return JSON.stringify(serializeStoreData(state), null, 2)
  },

  // ─── TIMER ACTIONS ───────────────────────────────────────────────────────
  //
  // All timer mutations go through `mutateTimer()`, a tiny helper that finds
  // the target timer (explicit id → falls back to activeTimerId), applies an
  // updater, bumps lastInteractedAt, and writes persistence. Pure state
  // shape; the engine handles ticking/completion side effects.

  setTimerMode(mode, id) {
    mutateTimer(set, get, id, (t) => {
      if (t.status === 'running' || t.status === 'paused') return t
      const nextPhase: TimerState['phase'] =
        mode === 'interval' && t.intervalConfig.warmupMs > 0 ? 'warmup' : 'work'
      return {
        ...t,
        mode,
        phase: nextPhase,
        cycleIndex: 0,
        startedAt: null,
        pausedAt: null,
        accumulatedPausedMs: 0,
        status: 'idle',
      }
    })
  },

  setFocusConfig(patch, id) {
    mutateTimer(set, get, id, (t) => ({ ...t, focusConfig: { ...t.focusConfig, ...patch } }))
  },

  setCountdownConfig(patch, id) {
    mutateTimer(set, get, id, (t) => ({ ...t, countdownConfig: { ...t.countdownConfig, ...patch } }))
  },

  setIntervalConfig(patch, id) {
    mutateTimer(set, get, id, (t) => ({ ...t, intervalConfig: { ...t.intervalConfig, ...patch } }))
  },

  setTimerSoundEnabled(enabled, id) {
    mutateTimer(set, get, id, (t) => ({ ...t, soundEnabled: enabled }))
  },

  setTimerNotificationsEnabled(enabled, id) {
    mutateTimer(set, get, id, (t) => ({ ...t, notificationsEnabled: enabled }))
  },

  setTimerLinkedTask(taskId, id) {
    mutateTimer(set, get, id, (t) => ({ ...t, linkedTaskId: taskId }))
  },

  startTimer(id) {
    mutateTimer(set, get, id, (t) => {
      const now = Date.now()
      const phase: TimerState['phase'] =
        t.mode === 'interval' && t.intervalConfig.warmupMs > 0 ? 'warmup' : 'work'
      return {
        ...t,
        status: 'running',
        phase,
        startedAt: now,
        pausedAt: null,
        accumulatedPausedMs: 0,
        cycleIndex: 0,
      }
    })
  },

  pauseTimer(id) {
    mutateTimer(set, get, id, (t) => {
      if (t.status !== 'running') return t
      return { ...t, status: 'paused', pausedAt: Date.now() }
    })
  },

  resumeTimer(id) {
    mutateTimer(set, get, id, (t) => {
      if (t.status !== 'paused' || t.pausedAt == null) return t
      const pausedFor = Date.now() - t.pausedAt
      return {
        ...t,
        status: 'running',
        pausedAt: null,
        accumulatedPausedMs: t.accumulatedPausedMs + Math.max(0, pausedFor),
      }
    })
  },

  /**
   * Edit-while-paused for countdown mode. `remainingMs` becomes the new
   * remaining; elapsed resets to 0 while status stays 'paused'.
   */
  adjustPausedCountdown(remainingMs, id) {
    mutateTimer(set, get, id, (t) => {
      if (t.mode !== 'countdown' || t.status !== 'paused') return t
      const clean = Math.max(1_000, Math.min(24 * 60 * 60_000, Math.round(remainingMs)))
      const now = Date.now()
      return {
        ...t,
        countdownConfig: { ...t.countdownConfig, durationMs: clean },
        startedAt: now,
        pausedAt: now,
        accumulatedPausedMs: 0,
      }
    })
  },

  resetTimer(id) {
    mutateTimer(set, get, id, (t) => {
      const nextPhase: TimerState['phase'] =
        t.mode === 'interval' && t.intervalConfig.warmupMs > 0 ? 'warmup' : 'work'
      return {
        ...t,
        status: 'idle',
        phase: nextPhase,
        startedAt: null,
        pausedAt: null,
        accumulatedPausedMs: 0,
        cycleIndex: 0,
      }
    })
  },

  skipPhase(id) {
    const s = get()
    const targetId = id ?? s.activeTimerId
    const current = s.timers.find((t) => t.id === targetId)
    if (!current || current.status === 'idle') return { completed: false }
    const { nextState, completed } = advancePhase(current)
    mutateTimer(set, get, targetId, () => nextState)
    return { completed }
  },

  completePhase(id) {
    const s = get()
    const targetId = id ?? s.activeTimerId
    const current = s.timers.find((t) => t.id === targetId)
    if (!current || current.status !== 'running') return { completed: false }
    if (current.mode === 'stopwatch') return { completed: false }
    const total = phaseDurationMs(current)
    if (!Number.isFinite(total)) return { completed: false }

    if (current.mode === 'countdown') {
      mutateTimer(set, get, targetId, (t) => ({ ...t, status: 'completed' }))
      return { completed: true }
    }

    const { nextState, completed } = advancePhase(current)
    mutateTimer(set, get, targetId, () => nextState)
    return { completed }
  },

  dismissTimerCompletion(id) {
    mutateTimer(set, get, id, (t) => {
      const nextPhase: TimerState['phase'] =
        t.mode === 'interval' && t.intervalConfig.warmupMs > 0 ? 'warmup' : 'work'
      return {
        ...t,
        status: 'idle',
        phase: nextPhase,
        startedAt: null,
        pausedAt: null,
        accumulatedPausedMs: 0,
        cycleIndex: 0,
      }
    })
  },

  rehydrateTimer() {
    const persisted = readPersistedTimers()
    if (!persisted || persisted.timers.length === 0) return

    // Drop any completed/idle snapshots defensively (persistence already
    // filters, but be robust).
    const resumable = persisted.timers.filter(
      (t) => t.status === 'running' || t.status === 'paused',
    )
    if (resumable.length === 0) {
      clearPersistedTimers()
      return
    }

    set((s) => {
      // Merge: keep the initial default timer only if no persisted timers
      // collide with it by id. Deduplicate by id (persisted wins).
      const byId = new Map<string, TimerState>()
      for (const t of s.timers) byId.set(t.id, t)
      for (const t of resumable) byId.set(t.id, t)
      const merged = Array.from(byId.values()).sort((a, b) => a.createdAt - b.createdAt)
      const activeTimerId =
        persisted.activeTimerId && merged.some((t) => t.id === persisted.activeTimerId)
          ? persisted.activeTimerId
          : merged[0]?.id ?? null
      return { timers: merged, activeTimerId }
    })
  },

  // ─── MULTI-TIMER MANAGEMENT ──────────────────────────────────────────────

  createTimer(opts = {}) {
    const fresh = createTimerState({
      mode: opts.mode,
      label: opts.label ?? null,
    })
    set((s) => {
      const timers = [...s.timers, fresh]
      const activeTimerId = opts.activate !== false ? fresh.id : s.activeTimerId
      writePersistedTimers(timers, activeTimerId)
      return { timers, activeTimerId }
    })
    return fresh.id
  },

  removeTimer(id) {
    set((s) => {
      const remaining = s.timers.filter((t) => t.id !== id)
      // Never allow an empty list — seed a fresh default if we're about to
      // empty everything, so consumers can always render *something*.
      const timers = remaining.length > 0 ? remaining : [createTimerState()]
      let activeTimerId = s.activeTimerId
      if (activeTimerId === id || !timers.some((t) => t.id === activeTimerId)) {
        // Fall back to the most recently interacted timer.
        activeTimerId =
          [...timers].sort((a, b) => b.lastInteractedAt - a.lastInteractedAt)[0]?.id ?? null
      }
      writePersistedTimers(timers, activeTimerId)
      return { timers, activeTimerId }
    })
  },

  setActiveTimer(id) {
    set((s) => {
      if (!s.timers.some((t) => t.id === id)) return s
      const timers = s.timers.map((t) =>
        t.id === id ? { ...t, lastInteractedAt: Date.now() } : t,
      )
      writePersistedTimers(timers, id)
      return { timers, activeTimerId: id }
    })
  },

  renameTimer(id, label) {
    mutateTimer(set, get, id, (t) => ({ ...t, label }))
  },
    }),
    {
      limit: 50,
      partialize: (state): UndoablePart => ({
        dailyLogs: state.dailyLogs,
        weeklyRecords: state.weeklyRecords,
        calendarTasks: state.calendarTasks,
        taskMonthNotes: state.taskMonthNotes,
        foodLog: state.foodLog,
        personalRecords: state.personalRecords,
        savingsGoals: state.savingsGoals,
        dhikr: state.dhikr,
        customDhikr: state.customDhikr,
        settings: state.settings,
      }),
      equality: (a, b) => shallowEqual(a as unknown as Record<string, unknown>, b as unknown as Record<string, unknown>),
      handleSet: (handleSet) => debounce(handleSet, 150),
    }
  )
)

export const useTemporalStore = useSalahStore.temporal as StoreApi<TemporalState<UndoablePart>>
