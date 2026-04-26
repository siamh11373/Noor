'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSalahStore } from '@/lib/store'
import {
  computeElapsed,
  computeProgress,
  computeRemaining,
  formatTicker,
  formatTime,
  modeAccent,
  modeLabel,
  phaseDurationMs,
  phaseLabel,
  type TimerState,
} from '@/lib/timer'
import { toast } from '@/components/ui/toast-host'

// ─── SELECTORS ────────────────────────────────────────────────────────────────
//
// A `.find()` against a stable array returns a stable reference as long as
// the element itself hasn't changed, which means zustand's default === check
// works correctly and we don't thrash re-renders.

function selectTimer(state: ReturnType<typeof useSalahStore.getState>, id: string | undefined): TimerState | null {
  const targetId = id ?? state.activeTimerId
  if (!targetId) return state.timers[0] ?? null
  return state.timers.find((t) => t.id === targetId) ?? state.timers[0] ?? null
}

/**
 * Returns the "headline" running timer — the one we surface in the nav pill
 * and tab title when multiple are going. Strategy: pick the running timer
 * with the shortest remaining. If none are running, fall back to the most
 * recent paused one. Stable reference across renders while the pick doesn't
 * change.
 */
function pickHeadline(timers: TimerState[]): TimerState | null {
  const running = timers.filter((t) => t.status === 'running')
  if (running.length > 0) {
    let best = running[0]
    let bestRemaining = remainingFor(best)
    for (let i = 1; i < running.length; i++) {
      const r = remainingFor(running[i])
      if (r < bestRemaining) {
        best = running[i]
        bestRemaining = r
      }
    }
    return best
  }
  const paused = timers.filter((t) => t.status === 'paused')
  if (paused.length > 0) {
    return [...paused].sort((a, b) => b.lastInteractedAt - a.lastInteractedAt)[0]
  }
  return null
}

function remainingFor(t: TimerState): number {
  if (t.mode === 'stopwatch') return Number.POSITIVE_INFINITY
  return computeRemaining(t)
}

// ─── PUBLIC HOOKS ─────────────────────────────────────────────────────────────

/**
 * Reactive timer hook. Re-renders at `tickIntervalMs` (default 250 ms) only
 * while the target timer is running. When `timerId` is omitted, reads the
 * store's `activeTimerId` reactively (so switching active timers updates
 * consumers automatically).
 */
export function useTimer(timerId?: string, tickIntervalMs: number = 250) {
  const timer = useSalahStore((s) => selectTimer(s, timerId))
  const [, force] = useState(0)

  useEffect(() => {
    if (!timer || timer.status !== 'running') return
    const id = window.setInterval(() => force((n) => (n + 1) % 1_000_000), tickIntervalMs)
    return () => window.clearInterval(id)
  }, [timer?.status, tickIntervalMs, timer])

  const now = Date.now()
  const safeTimer = timer
  if (!safeTimer) {
    return emptyTimerView()
  }

  const elapsedMs = computeElapsed(safeTimer, now)
  const remainingMs = computeRemaining(safeTimer, now)
  const progress = computeProgress(safeTimer, now)
  const totalMs = phaseDurationMs(safeTimer)
  const accent = modeAccent(safeTimer.mode)
  const displayMs = safeTimer.mode === 'stopwatch' ? elapsedMs : remainingMs
  const displayText =
    safeTimer.mode === 'stopwatch' ? formatTime(elapsedMs) : formatTime(remainingMs)

  return {
    timer: safeTimer,
    elapsedMs,
    remainingMs,
    progress,
    totalMs,
    displayMs,
    displayText,
    phaseLabel: phaseLabel(safeTimer),
    modeLabel: modeLabel(safeTimer.mode),
    accent,
    isIdle: safeTimer.status === 'idle',
    isRunning: safeTimer.status === 'running',
    isPaused: safeTimer.status === 'paused',
    isCompleted: safeTimer.status === 'completed',
  }
}

/** Short ticker string for a specific timer (falls back to active). */
export function useTimerTicker(timerId?: string, tickIntervalMs: number = 500) {
  const timer = useSalahStore((s) => selectTimer(s, timerId))
  const [, force] = useState(0)

  useEffect(() => {
    if (!timer || timer.status !== 'running') return
    const id = window.setInterval(() => force((n) => (n + 1) % 1_000_000), tickIntervalMs)
    return () => window.clearInterval(id)
  }, [timer?.status, tickIntervalMs, timer])

  if (!timer) return { timer: null, text: '' }

  const now = Date.now()
  const text =
    timer.mode === 'stopwatch'
      ? formatTicker(computeElapsed(timer, now))
      : formatTicker(computeRemaining(timer, now))

  return { timer, text }
}

/** Returns every timer whose status is 'running' or 'paused'. Stable reference via store. */
export function useActiveAndRunningTimers() {
  const timers = useSalahStore((s) => s.timers)
  return useMemo(
    () => timers.filter((t) => t.status === 'running' || t.status === 'paused'),
    [timers],
  )
}

/** Returns the headline timer (shortest-remaining running; falls back to paused). */
export function useHeadlineTimer(tickIntervalMs: number = 500) {
  const timers = useSalahStore((s) => s.timers)
  const headline = useMemo(() => pickHeadline(timers), [timers])
  const [, force] = useState(0)

  useEffect(() => {
    const anyRunning = timers.some((t) => t.status === 'running')
    if (!anyRunning) return
    const id = window.setInterval(() => force((n) => (n + 1) % 1_000_000), tickIntervalMs)
    return () => window.clearInterval(id)
  }, [timers, tickIntervalMs])

  if (!headline) return { timer: null as TimerState | null, text: '' }
  const now = Date.now()
  const text =
    headline.mode === 'stopwatch'
      ? formatTicker(computeElapsed(headline, now))
      : formatTicker(computeRemaining(headline, now))
  return { timer: headline, text }
}

function emptyTimerView() {
  // Defensive default. Should never actually render because initialStoreState()
  // always seeds one timer. Kept so TypeScript inference stays clean.
  return {
    timer: null as TimerState | null,
    elapsedMs: 0,
    remainingMs: 0,
    progress: 0,
    totalMs: 0,
    displayMs: 0,
    displayText: '0:00',
    phaseLabel: '',
    modeLabel: '',
    accent: modeAccent('countdown'),
    isIdle: true,
    isRunning: false,
    isPaused: false,
    isCompleted: false,
  }
}

// ─── ENGINE (mount once) ──────────────────────────────────────────────────────
//
// Global timer engine. Responsibilities:
//   1. Rehydrate persisted state on first mount.
//   2. Tick at ~250 ms while any timer is running; per-timer phase/
//      completion transitions.
//   3. Fire completion side effects (chime, toast, notification) per-timer,
//      debounced so simultaneous completions don't dog-pile.
//   4. Keep `document.title` in sync with the headline timer's remaining.

export function useTimerEngine() {
  const anyRunning = useSalahStore((s) => s.timers.some((t) => t.status === 'running'))
  const completePhase = useSalahStore((s) => s.completePhase)
  const rehydrateTimer = useSalahStore((s) => s.rehydrateTimer)

  const lastTitleRef = useRef<string | null>(null)
  const hydratedRef = useRef(false)
  const lastChimeAtRef = useRef(0)

  useEffect(() => {
    if (hydratedRef.current) return
    hydratedRef.current = true
    rehydrateTimer()
  }, [rehydrateTimer])

  useEffect(() => {
    if (!anyRunning) {
      restoreTitle(lastTitleRef)
      return
    }

    const tick = () => {
      const state = useSalahStore.getState()
      const timers = state.timers

      // Drive document.title from the headline timer.
      const headline = pickHeadline(timers)
      if (headline) updateTitleForTimer(headline, lastTitleRef)
      else restoreTitle(lastTitleRef)

      // Per-timer completion check.
      for (const t of timers) {
        if (t.status !== 'running') continue
        if (t.mode === 'stopwatch') continue
        const total = phaseDurationMs(t)
        if (!Number.isFinite(total)) continue
        if (computeElapsed(t) >= total) {
          const { completed } = completePhase(t.id)
          handlePhaseTransition(t, completed, lastChimeAtRef)
        }
      }
    }

    tick()
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [anyRunning, completePhase])

  useEffect(() => {
    if (!anyRunning) restoreTitle(lastTitleRef)
  }, [anyRunning])

  // Watchdog: as soon as a ringing timer leaves 'completed' status (user
  // dismissed it, switched modes, deleted it, etc.) we stop its loop on
  // the very next store update — no waiting for the next interval tick.
  useEffect(() => {
    const unsubscribe = useSalahStore.subscribe((state, prev) => {
      if (state.timers === prev.timers) return
      const liveCompleted = new Set(
        state.timers.filter((t) => t.status === 'completed' && t.soundEnabled).map((t) => t.id),
      )
      for (const id of Array.from(ringingTimers.keys())) {
        if (!liveCompleted.has(id)) stopRingingLoop(id)
      }
    })
    return () => {
      unsubscribe()
      // Cleanup any active loops on unmount (HMR / SPA shell teardown).
      for (const id of Array.from(ringingTimers.keys())) stopRingingLoop(id)
    }
  }, [])

  return null
}

// ─── COMPLETION SIDE EFFECTS ──────────────────────────────────────────────────

function handlePhaseTransition(prev: TimerState, completedRun: boolean, lastChimeAtRef: React.MutableRefObject<number>) {
  // Look up the *current* version of this timer (post-transition) for the
  // toast/notification copy.
  const curr = useSalahStore.getState().timers.find((t) => t.id === prev.id) ?? prev

  if (curr.soundEnabled) {
    if (completedRun) {
      // Loop the completion chime until the user explicitly dismisses
      // (status leaves 'completed') — turns the timer into a real alarm
      // rather than a one-shot you might miss while context-switching.
      // Also fires the haptic accent on every iteration on supporting
      // devices.
      startRingingLoop(curr.id)
    } else {
      // Debounce phase chimes so two timers finishing in the same tick
      // don't overlap harshly.
      const now = Date.now()
      if (now - lastChimeAtRef.current > 120) {
        lastChimeAtRef.current = now
        playPhaseChime()
      }
    }
  }

  const name = curr.label || labelForMode(prev)
  if (completedRun) {
    const body =
      prev.mode === 'focus'
        ? 'Focus complete'
        : prev.mode === 'countdown'
        ? 'Timer complete'
        : prev.mode === 'interval'
        ? 'Workout complete'
        : 'Timer complete'
    const headline = curr.label ? `${name} · ${body}` : body
    toast.show(headline, { tone: 'success', durationMs: 4000 })
    if (curr.notificationsEnabled) void fireNotification(headline, 'Nice work. Tap to reopen.')
  } else {
    const next = phaseLabel(curr)
    const headline = curr.label ? `${name} · ${next} started` : `${next} started`
    toast.show(headline, { tone: 'neutral', durationMs: 1800 })
    if (curr.notificationsEnabled) void fireNotification(headline, 'Noor timer')
  }
}

function labelForMode(t: TimerState): string {
  return modeLabel(t.mode)
}

// ─── WEB AUDIO CHIME ─────────────────────────────────────────────────────────
//
// Two distinct cadences keyed off `completedRun`:
//
//   • playPhaseChime — two-note descending bell (G5 → C5), ~0.55s. Light;
//     reads as "next segment", not "finished".
//   • playCompleteChime — ascending C-major arpeggio (C5 → E5 → G5) with
//     a sustained octave anchor (C6), ~1.4s. The V→I-style resolution +
//     the held final note triggers the brain's "closure" response —
//     classic reinforcement cadence for completed work.
//
// Each note is a struck-bell voice: a sine fundamental layered with an
// octave overtone (~25% level) and a triple-frequency shimmer (~8% level),
// with a 6 ms linear attack and exponential decay. That harmonic stack
// is what makes the tone read as a *bell* instead of a flat sine beep.
//
// All paths are wrapped in try/catch — Safari's webkit prefix, suspended
// contexts, autoplay restrictions, and missing AudioContext all degrade
// to silence rather than throwing.

let audioCtx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    const W = window as unknown as {
      AudioContext?: typeof AudioContext
      webkitAudioContext?: typeof AudioContext
    }
    const Ctor = W.AudioContext ?? W.webkitAudioContext
    if (!Ctor) return null
    if (!audioCtx) audioCtx = new Ctor()
    if (audioCtx.state === 'suspended') void audioCtx.resume()
    return audioCtx
  } catch {
    return null
  }
}

/**
 * One struck-bell note. Stacks fundamental + octave overtone + 3×
 * shimmer through a shared gain envelope so the whole voice rises and
 * falls together. Gain shape: silence → linear ramp to peak (6ms) →
 * exponential decay to silence (`duration`s). Linear attack avoids the
 * click that pure exponential ramps from 0.0001 sometimes produce.
 */
function playBell(
  ctx: AudioContext,
  freq: number,
  startAt: number,
  duration: number,
  peak: number,
) {
  const master = ctx.createGain()
  master.gain.setValueAtTime(0, startAt)
  master.gain.linearRampToValueAtTime(peak, startAt + 0.006)
  master.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)
  master.connect(ctx.destination)

  const voice = (f: number, level: number) => {
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = f
    g.gain.value = level
    osc.connect(g).connect(master)
    osc.start(startAt)
    osc.stop(startAt + duration + 0.05)
  }

  voice(freq, 1)
  voice(freq * 2, 0.25)
  voice(freq * 3, 0.08)
}

/** Tiny "moving on" cue. Descending major third — open, not final. */
function playPhaseChime() {
  const ctx = getCtx()
  if (!ctx) return
  const t = ctx.currentTime
  // G5, then C5 (descending P5). Quick + warm.
  playBell(ctx, 783.99, t, 0.45, 0.16)
  playBell(ctx, 523.25, t + 0.14, 0.55, 0.18)
}

// ─── COMPLETION RINGING LOOP ─────────────────────────────────────────────────
//
// On full-run completion the chime repeats every CHIME_LOOP_MS until the
// timer leaves 'completed' status (e.g. user clicks Dismiss). The interval
// handles are tracked module-globally so the engine effect's store
// subscription can stop them immediately without prop-drilling refs.
//
// A hard ceiling (`MAX_LOOPS`) prevents a forgotten timer from ringing
// indefinitely if the dialog is never dismissed (browser tab backgrounded
// for hours, crashed dismiss handler, etc.) — about 4 minutes of alarms.

const CHIME_LOOP_MS = 2200
const MAX_LOOPS = 110
const ringingTimers = new Map<string, { handle: number; count: number }>()

function fireCompletionPulse() {
  playCompleteChime()
  try {
    navigator.vibrate?.([18, 60, 28])
  } catch {
    /* silent */
  }
}

function startRingingLoop(timerId: string) {
  if (ringingTimers.has(timerId)) return
  fireCompletionPulse()
  const handle = window.setInterval(() => {
    const entry = ringingTimers.get(timerId)
    if (!entry) return
    const live = useSalahStore.getState().timers.find((t) => t.id === timerId)
    if (!live || live.status !== 'completed' || !live.soundEnabled || entry.count >= MAX_LOOPS) {
      stopRingingLoop(timerId)
      return
    }
    entry.count += 1
    fireCompletionPulse()
  }, CHIME_LOOP_MS)
  ringingTimers.set(timerId, { handle, count: 1 })
}

function stopRingingLoop(timerId: string) {
  const entry = ringingTimers.get(timerId)
  if (!entry) return
  window.clearInterval(entry.handle)
  ringingTimers.delete(timerId)
}

/** Full-run reinforcement: arpeggio + sustained octave. */
function playCompleteChime() {
  const ctx = getCtx()
  if (!ctx) return
  const t = ctx.currentTime
  // C5 → E5 → G5 ascending (C major triad), then the C6 anchor held
  // longer so the brain registers the resolution. Peaks scale slightly
  // up the line so the final note feels like the arrival point.
  playBell(ctx, 523.25, t + 0.00, 0.55, 0.14)
  playBell(ctx, 659.25, t + 0.13, 0.55, 0.15)
  playBell(ctx, 783.99, t + 0.26, 0.65, 0.17)
  playBell(ctx, 1046.5, t + 0.42, 1.20, 0.22)
  // Faint sub-octave pad under the anchor for body — barely audible
  // alone, but it makes the closing note feel grounded rather than thin.
  playBell(ctx, 261.63, t + 0.42, 1.20, 0.06)
}

async function fireNotification(title: string, body: string) {
  if (typeof window === 'undefined') return
  if (!('Notification' in window)) return
  try {
    if (Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/logo.png', badge: '/logo.png', silent: true })
    }
  } catch {
    /* silent */
  }
}

// ─── TAB TITLE ─────────────────────────────────────────────────────────────────

function updateTitleForTimer(t: TimerState, ref: React.MutableRefObject<string | null>) {
  if (typeof document === 'undefined') return
  if (t.status !== 'running') {
    restoreTitle(ref)
    return
  }
  if (ref.current == null) ref.current = document.title
  const remaining =
    t.mode === 'stopwatch' ? computeElapsed(t) : computeRemaining(t)
  document.title = `${formatTicker(remaining)} · Noor`
}

function restoreTitle(ref: React.MutableRefObject<string | null>) {
  if (typeof document === 'undefined') return
  if (ref.current != null) {
    document.title = ref.current
    ref.current = null
  }
}

// ─── PERMISSION PROMPT ────────────────────────────────────────────────────────

/** Request notification permission; returns true if granted. Safe to call repeatedly. */
export async function requestTimerNotifications(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  try {
    const result = await Notification.requestPermission()
    return result === 'granted'
  } catch {
    return false
  }
}
