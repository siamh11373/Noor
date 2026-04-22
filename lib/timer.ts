/**
 * Noor timer — shared types, presets, and pure helpers.
 *
 * The store (`lib/store.ts`) owns runtime state. This module keeps types
 * and time math decoupled so both store actions and the `useTimer` hook
 * can reuse the same primitives.
 *
 * Time math is **drift-free**: every phase stores an absolute `startedAt`
 * (Date.now()) + `accumulatedPausedMs`. Progress is always computed from
 * `Date.now()` on tick, never from a counter. That means pause, resume,
 * and even a page refresh never accumulate drift.
 */

export type TimerMode = 'focus' | 'countdown' | 'stopwatch' | 'interval'
export type TimerStatus = 'idle' | 'running' | 'paused' | 'completed'

/**
 * A "phase" is a segment within a run:
 *   - focus:     'work' | 'break' | 'longBreak'
 *   - interval:  'warmup' | 'work' | 'rest' | 'cooldown'
 *   - countdown: 'work' (single phase)
 *   - stopwatch: 'work' (count-up)
 */
export type TimerPhase = 'work' | 'break' | 'longBreak' | 'warmup' | 'rest' | 'cooldown'

export interface FocusConfig {
  workMs: number
  breakMs: number
  longBreakMs: number
  cyclesBeforeLongBreak: number
  autoStartBreak: boolean
}

export interface CountdownConfig {
  durationMs: number
  label: string
}

export interface IntervalConfig {
  warmupMs: number
  workMs: number
  restMs: number
  rounds: number
  cooldownMs: number
}

export interface TimerState {
  /** Stable identifier; used as React key + persistence index. */
  id: string
  /** User-facing name. null → UI shows default like "Timer 2". */
  label: string | null
  /** Unix ms of creation (for ordering). */
  createdAt: number
  /** Unix ms of last interaction (used to pick the "focused" timer). */
  lastInteractedAt: number
  mode: TimerMode
  status: TimerStatus
  phase: TimerPhase
  /** Absolute unix ms when the current phase started (reset on each phase change). */
  startedAt: number | null
  /** Absolute unix ms when paused; null while running. */
  pausedAt: number | null
  /** Sum of prior paused durations in the current phase. */
  accumulatedPausedMs: number
  focusConfig: FocusConfig
  countdownConfig: CountdownConfig
  intervalConfig: IntervalConfig
  linkedTaskId: string | null
  /** Focus: pomodoro index (0-based). Interval: round index (0-based). */
  cycleIndex: number
  soundEnabled: boolean
  notificationsEnabled: boolean
}

// ─── PRESETS ──────────────────────────────────────────────────────────────────

export interface FocusPreset {
  id: string
  label: string
  sub: string
  workMin: number
  breakMin: number
  longBreakMin: number
  cyclesBeforeLongBreak: number
}

export const FOCUS_PRESETS: FocusPreset[] = [
  { id: 'classic',    label: '25 / 5',  sub: 'Classic Pomodoro', workMin: 25, breakMin: 5,  longBreakMin: 15, cyclesBeforeLongBreak: 4 },
  { id: 'deep',       label: '50 / 10', sub: 'Deep work',        workMin: 50, breakMin: 10, longBreakMin: 20, cyclesBeforeLongBreak: 3 },
  { id: 'ultradian',  label: '90 / 20', sub: 'Ultradian cycle',  workMin: 90, breakMin: 20, longBreakMin: 30, cyclesBeforeLongBreak: 2 },
]

export interface CountdownPreset {
  id: string
  label: string
  min: number
}

export const COUNTDOWN_PRESETS: CountdownPreset[] = [
  { id: 'c-5',  label: '5 min',  min: 5 },
  { id: 'c-10', label: '10 min', min: 10 },
  { id: 'c-15', label: '15 min', min: 15 },
  { id: 'c-25', label: '25 min', min: 25 },
  { id: 'c-45', label: '45 min', min: 45 },
  { id: 'c-90', label: '90 min', min: 90 },
]

export const MIN_COUNTDOWN_MS = 1_000
export const MAX_COUNTDOWN_MS = 24 * 60 * 60_000

export function clampCountdownMs(ms: number): number {
  if (!Number.isFinite(ms)) return MIN_COUNTDOWN_MS
  return Math.max(MIN_COUNTDOWN_MS, Math.min(MAX_COUNTDOWN_MS, Math.round(ms)))
}

export function splitMs(ms: number): { h: number; m: number; s: number } {
  const total = Math.max(0, Math.round(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return { h, m, s }
}

export function composeMs(h: number, m: number, s: number): number {
  return (h * 3600 + m * 60 + s) * 1000
}

export interface IntervalPreset {
  id: string
  label: string
  sub: string
  warmupSec: number
  workSec: number
  restSec: number
  rounds: number
  cooldownSec: number
}

export const INTERVAL_PRESETS: IntervalPreset[] = [
  { id: 'tabata',   label: 'Tabata',   sub: '20 / 10 × 8',      warmupSec: 60,  workSec: 20, restSec: 10, rounds: 8, cooldownSec: 60 },
  { id: 'hiit',     label: 'HIIT',     sub: '40 / 20 × 10',     warmupSec: 120, workSec: 40, restSec: 20, rounds: 10, cooldownSec: 120 },
  { id: 'emom',     label: 'EMOM',     sub: '60 / 0 × 10',      warmupSec: 60,  workSec: 60, restSec: 0,  rounds: 10, cooldownSec: 60 },
  { id: 'strength', label: 'Strength', sub: '45 / 90 × 8',      warmupSec: 180, workSec: 45, restSec: 90, rounds: 8, cooldownSec: 60 },
]

// ─── DEFAULTS ─────────────────────────────────────────────────────────────────

export function defaultFocusConfig(): FocusConfig {
  const p = FOCUS_PRESETS[0]
  return {
    workMs: p.workMin * 60_000,
    breakMs: p.breakMin * 60_000,
    longBreakMs: p.longBreakMin * 60_000,
    cyclesBeforeLongBreak: p.cyclesBeforeLongBreak,
    autoStartBreak: true,
  }
}

export function defaultCountdownConfig(): CountdownConfig {
  return { durationMs: 10 * 60_000, label: '' }
}

export function defaultIntervalConfig(): IntervalConfig {
  const p = INTERVAL_PRESETS[0]
  return {
    warmupMs: p.warmupSec * 1000,
    workMs: p.workSec * 1000,
    restMs: p.restSec * 1000,
    rounds: p.rounds,
    cooldownMs: p.cooldownSec * 1000,
  }
}

export function createTimerId(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return (crypto as Crypto).randomUUID()
    }
  } catch { /* fall through */ }
  return `timer-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function createTimerState(overrides: Partial<TimerState> = {}): TimerState {
  const now = Date.now()
  return {
    id: overrides.id ?? createTimerId(),
    label: overrides.label ?? null,
    createdAt: overrides.createdAt ?? now,
    lastInteractedAt: overrides.lastInteractedAt ?? now,
    mode: overrides.mode ?? 'countdown',
    status: overrides.status ?? 'idle',
    phase: overrides.phase ?? 'work',
    startedAt: overrides.startedAt ?? null,
    pausedAt: overrides.pausedAt ?? null,
    accumulatedPausedMs: overrides.accumulatedPausedMs ?? 0,
    focusConfig: overrides.focusConfig ?? defaultFocusConfig(),
    countdownConfig: overrides.countdownConfig ?? defaultCountdownConfig(),
    intervalConfig: overrides.intervalConfig ?? defaultIntervalConfig(),
    linkedTaskId: overrides.linkedTaskId ?? null,
    cycleIndex: overrides.cycleIndex ?? 0,
    soundEnabled: overrides.soundEnabled ?? true,
    notificationsEnabled: overrides.notificationsEnabled ?? false,
  }
}

/** @deprecated Use createTimerState(). Kept as a thin alias during transition. */
export function createDefaultTimerState(): TimerState {
  return createTimerState()
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/** Milliseconds elapsed in the current phase, accounting for pauses. */
export function computeElapsed(state: TimerState, now: number = Date.now()): number {
  if (state.startedAt == null) return 0
  const base = state.status === 'paused' && state.pausedAt != null ? state.pausedAt : now
  return Math.max(0, base - state.startedAt - state.accumulatedPausedMs)
}

/** Total duration of the current phase in milliseconds. Stopwatch returns Infinity. */
export function phaseDurationMs(state: TimerState): number {
  switch (state.mode) {
    case 'focus': {
      if (state.phase === 'longBreak') return state.focusConfig.longBreakMs
      if (state.phase === 'break') return state.focusConfig.breakMs
      return state.focusConfig.workMs
    }
    case 'countdown':
      return state.countdownConfig.durationMs
    case 'stopwatch':
      return Number.POSITIVE_INFINITY
    case 'interval': {
      if (state.phase === 'warmup') return state.intervalConfig.warmupMs
      if (state.phase === 'rest') return state.intervalConfig.restMs
      if (state.phase === 'cooldown') return state.intervalConfig.cooldownMs
      return state.intervalConfig.workMs
    }
  }
}

/** Milliseconds remaining in the current phase. Stopwatch returns Infinity. */
export function computeRemaining(state: TimerState, now: number = Date.now()): number {
  const total = phaseDurationMs(state)
  if (!Number.isFinite(total)) return Number.POSITIVE_INFINITY
  return Math.max(0, total - computeElapsed(state, now))
}

/** 0..1 progress of the current phase. Stopwatch returns 0. */
export function computeProgress(state: TimerState, now: number = Date.now()): number {
  const total = phaseDurationMs(state)
  if (!Number.isFinite(total) || total <= 0) return 0
  return Math.min(1, computeElapsed(state, now) / total)
}

/** Format milliseconds → 'M:SS' or 'H:MM:SS' for large values. */
export function formatTime(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) ms = 0
  const totalSeconds = Math.round(ms / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const pad = (n: number) => n.toString().padStart(2, '0')
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`
  return `${m}:${pad(s)}`
}

/** Short ticker used in the top nav pill + tab title. */
export function formatTicker(ms: number): string {
  return formatTime(ms)
}

// ─── PHASE TRANSITIONS ────────────────────────────────────────────────────────

export interface PhaseAdvanceResult {
  nextState: TimerState
  /** True if the entire run completed (e.g. all interval rounds finished). */
  completed: boolean
}

/**
 * Advance the timer to the next phase (break → work, work → rest, etc.).
 * Pure — returns the next state + a completion flag. Does NOT start the new
 * phase; caller decides whether to auto-start based on mode rules.
 */
export function advancePhase(state: TimerState, now: number = Date.now()): PhaseAdvanceResult {
  const cleared = { startedAt: now, pausedAt: null, accumulatedPausedMs: 0 }

  if (state.mode === 'focus') {
    if (state.phase === 'work') {
      const nextCycle = state.cycleIndex + 1
      const isLong = nextCycle % state.focusConfig.cyclesBeforeLongBreak === 0
      return {
        nextState: {
          ...state,
          ...cleared,
          phase: isLong ? 'longBreak' : 'break',
          cycleIndex: nextCycle,
          status: state.focusConfig.autoStartBreak ? 'running' : 'paused',
        },
        completed: false,
      }
    }
    return {
      nextState: { ...state, ...cleared, phase: 'work', status: 'running' },
      completed: false,
    }
  }

  if (state.mode === 'interval') {
    const { rounds } = state.intervalConfig
    if (state.phase === 'warmup') {
      return {
        nextState: { ...state, ...cleared, phase: 'work', cycleIndex: 0, status: 'running' },
        completed: false,
      }
    }
    if (state.phase === 'work') {
      if (state.intervalConfig.restMs === 0) {
        const nextIdx = state.cycleIndex + 1
        if (nextIdx >= rounds) {
          if (state.intervalConfig.cooldownMs > 0) {
            return {
              nextState: { ...state, ...cleared, phase: 'cooldown', status: 'running' },
              completed: false,
            }
          }
          return { nextState: { ...state, status: 'completed' }, completed: true }
        }
        return {
          nextState: { ...state, ...cleared, phase: 'work', cycleIndex: nextIdx, status: 'running' },
          completed: false,
        }
      }
      return {
        nextState: { ...state, ...cleared, phase: 'rest', status: 'running' },
        completed: false,
      }
    }
    if (state.phase === 'rest') {
      const nextIdx = state.cycleIndex + 1
      if (nextIdx >= rounds) {
        if (state.intervalConfig.cooldownMs > 0) {
          return {
            nextState: { ...state, ...cleared, phase: 'cooldown', status: 'running' },
            completed: false,
          }
        }
        return { nextState: { ...state, status: 'completed' }, completed: true }
      }
      return {
        nextState: { ...state, ...cleared, phase: 'work', cycleIndex: nextIdx, status: 'running' },
        completed: false,
      }
    }
    if (state.phase === 'cooldown') {
      return { nextState: { ...state, status: 'completed' }, completed: true }
    }
  }

  return { nextState: { ...state, status: 'completed' }, completed: true }
}

// ─── PHASE LABELS (UI helpers) ────────────────────────────────────────────────

export function phaseLabel(state: TimerState): string {
  switch (state.mode) {
    case 'focus':
      if (state.phase === 'longBreak') return 'Long break'
      if (state.phase === 'break') return 'Break'
      return 'Focus'
    case 'countdown':
      return state.countdownConfig.label || 'Countdown'
    case 'stopwatch':
      return 'Stopwatch'
    case 'interval':
      if (state.phase === 'warmup') return 'Warm-up'
      if (state.phase === 'rest') return 'Rest'
      if (state.phase === 'cooldown') return 'Cool-down'
      return `Round ${state.cycleIndex + 1}`
  }
}

export function modeLabel(mode: TimerMode): string {
  switch (mode) {
    case 'focus':     return 'Focus'
    case 'countdown': return 'Timer'
    case 'stopwatch': return 'Stopwatch'
    case 'interval':  return 'Interval'
  }
}

/**
 * Accent token triple used by ring + pill + breathing halo. Returned as
 * CSS var references so dark-mode overrides flow through automatically.
 */
export interface ModeAccent {
  stroke: string
  track: string
  tint: string
  text: string
  border: string
  soft: string
}

export function modeAccent(mode: TimerMode): ModeAccent {
  if (mode === 'interval') {
    return {
      stroke: 'rgb(var(--fitness))',
      track: 'rgb(var(--surface-border))',
      tint: 'rgb(var(--fitness))',
      text: 'rgb(var(--fitness-text))',
      border: 'rgb(var(--fitness-border))',
      soft: 'rgb(var(--fitness-light))',
    }
  }
  if (mode === 'stopwatch') {
    return {
      stroke: 'rgb(var(--sage-500))',
      track: 'rgb(var(--surface-border))',
      tint: 'rgb(var(--sage-500))',
      text: 'rgb(var(--faith-text))',
      border: 'rgb(var(--faith-border))',
      soft: 'rgb(var(--faith-light))',
    }
  }
  return {
    stroke: 'rgb(var(--brand-400))',
    track: 'rgb(var(--surface-border))',
    tint: 'rgb(var(--brand-400))',
    text: 'rgb(var(--brand-500))',
    border: 'rgb(var(--brand-200))',
    soft: 'rgb(var(--brand-50))',
  }
}

// ─── PERSISTENCE (local-only, survives refresh) ───────────────────────────────
//
// v1: single timer  — { version: 1, state: TimerState, savedAt }
// v2: multi-timer   — { version: 2, timers: TimerState[], activeTimerId, savedAt }
//
// v1 blobs are migrated transparently on read.

export const TIMER_STORAGE_KEY = 'noor-timer-v1'

interface PersistedV1 {
  version: 1
  state: TimerState
  savedAt: number
}

interface PersistedV2 {
  version: 2
  timers: TimerState[]
  activeTimerId: string | null
  savedAt: number
}

export interface PersistedTimers {
  timers: TimerState[]
  activeTimerId: string | null
}

function ensureIds(state: Partial<TimerState>): TimerState {
  // Legacy v1 states were missing id/label/createdAt — backfill them.
  return createTimerState(state)
}

export function readPersistedTimers(): PersistedTimers | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(TIMER_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PersistedV1 | PersistedV2
    if (!parsed) return null

    if (parsed.version === 2 && Array.isArray(parsed.timers)) {
      const timers = parsed.timers.map((t) => ensureIds(t))
      const activeTimerId =
        parsed.activeTimerId && timers.some((t) => t.id === parsed.activeTimerId)
          ? parsed.activeTimerId
          : timers[0]?.id ?? null
      return { timers, activeTimerId }
    }

    if (parsed.version === 1 && parsed.state) {
      const migrated = ensureIds(parsed.state)
      return { timers: [migrated], activeTimerId: migrated.id }
    }

    return null
  } catch {
    return null
  }
}

export function writePersistedTimers(timers: TimerState[], activeTimerId: string | null) {
  if (typeof window === 'undefined') return
  try {
    // Drop idle/completed timers from persistence — no value in restoring them.
    const persistable = timers.filter(
      (t) => t.status === 'running' || t.status === 'paused',
    )
    if (persistable.length === 0) {
      window.localStorage.removeItem(TIMER_STORAGE_KEY)
      return
    }
    const safeActive =
      activeTimerId && persistable.some((t) => t.id === activeTimerId)
        ? activeTimerId
        : persistable[0]?.id ?? null
    const payload: PersistedV2 = {
      version: 2,
      timers: persistable,
      activeTimerId: safeActive,
      savedAt: Date.now(),
    }
    window.localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    /* quota / private mode — silent */
  }
}

export function clearPersistedTimers() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(TIMER_STORAGE_KEY)
  } catch {
    /* silent */
  }
}

// ─── LEGACY ALIASES ────────────────────────────────────────────────────────────
// Kept so older imports (if any) compile. All new code should use the *Timers
// variants above.

/** @deprecated use readPersistedTimers() */
export function readPersistedTimer(): TimerState | null {
  const snap = readPersistedTimers()
  if (!snap) return null
  return snap.timers.find((t) => t.id === snap.activeTimerId) ?? snap.timers[0] ?? null
}

/** @deprecated use writePersistedTimers() */
export function writePersistedTimer(state: TimerState) {
  writePersistedTimers([state], state.id)
}

/** @deprecated use clearPersistedTimers() */
export function clearPersistedTimer() {
  clearPersistedTimers()
}
