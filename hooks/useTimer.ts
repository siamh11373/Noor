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

  return null
}

// ─── COMPLETION SIDE EFFECTS ──────────────────────────────────────────────────

function handlePhaseTransition(prev: TimerState, completedRun: boolean, lastChimeAtRef: React.MutableRefObject<number>) {
  // Look up the *current* version of this timer (post-transition) for the
  // toast/notification copy.
  const curr = useSalahStore.getState().timers.find((t) => t.id === prev.id) ?? prev

  if (curr.soundEnabled) {
    // Debounce chimes so two timers finishing in the same tick don't overlap
    // harshly.
    const now = Date.now()
    if (now - lastChimeAtRef.current > 120) {
      lastChimeAtRef.current = now
      playChime()
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

let audioCtx: AudioContext | null = null
function playChime() {
  if (typeof window === 'undefined') return
  try {
    const W = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }
    const Ctor = W.AudioContext ?? W.webkitAudioContext
    if (!Ctor) return
    if (!audioCtx) audioCtx = new Ctor()
    if (audioCtx.state === 'suspended') void audioCtx.resume()

    const now = audioCtx.currentTime
    playTone(audioCtx, 880, now, 0.45, 0.18)
    playTone(audioCtx, 1320, now + 0.12, 0.45, 0.22)
  } catch {
    /* silent */
  }
}

function playTone(ctx: AudioContext, freq: number, startAt: number, duration: number, peak: number) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0.0001, startAt)
  gain.gain.exponentialRampToValueAtTime(peak, startAt + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)
  osc.connect(gain).connect(ctx.destination)
  osc.start(startAt)
  osc.stop(startAt + duration + 0.02)
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
