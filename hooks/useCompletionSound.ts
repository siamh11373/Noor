'use client'

import { useCallback } from 'react'

// ─── MODULE-LEVEL SINGLETON (same pattern as hooks/useTimer.ts:298) ───────────
let audioCtx: AudioContext | null = null

function playTone(
  ctx: AudioContext,
  freq: number,
  startAt: number,
  duration: number,
  peak: number,
) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'triangle' // warmer than sine at higher frequencies
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0.0001, startAt)
  gain.gain.exponentialRampToValueAtTime(peak, startAt + 0.02) // 20ms attack
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)
  osc.connect(gain).connect(ctx.destination)
  osc.start(startAt)
  osc.stop(startAt + duration + 0.02)
}

function playCompletionChime() {
  if (typeof window === 'undefined') return
  try {
    const W = window as unknown as {
      AudioContext?: typeof AudioContext
      webkitAudioContext?: typeof AudioContext
    }
    const Ctor = W.AudioContext ?? W.webkitAudioContext
    if (!Ctor) return
    if (!audioCtx) audioCtx = new Ctor()
    if (audioCtx.state === 'suspended') void audioCtx.resume()

    const now = audioCtx.currentTime
    // Ascending major triad arpeggio: C5 → E5 → G5
    playTone(audioCtx, 523, now,        0.18, 0.09)
    playTone(audioCtx, 659, now + 0.08, 0.18, 0.09)
    playTone(audioCtx, 784, now + 0.16, 0.20, 0.09)
  } catch {
    /* silent */
  }
}

/**
 * Returns a stable `playCompletionSound()` function.
 * Automatically skips sound when the user prefers reduced motion.
 */
export function useCompletionSound() {
  return useCallback(() => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return
    playCompletionChime()
  }, [])
}
