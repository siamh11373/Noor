'use client'

import { Pause, Play } from 'lucide-react'
import { useHeadlineTimer, useActiveAndRunningTimers } from '@/hooks/useTimer'
import { useSalahStore } from '@/lib/store'
import { modeAccent, phaseLabel } from '@/lib/timer'
import { dispatchShortcutEvent } from '@/lib/shortcut-events'
import { cn } from '@/lib/utils'

/**
 * Compact "timer is running / paused" pill shown in the top nav.
 *
 * When multiple timers are active, we surface only the **headline** timer
 * (shortest-remaining; falls back to the most recently paused). Additional
 * active timers are summarised with a small "+N" badge. Tapping that badge
 * opens the timer dialog so the user can triage them.
 *
 *   - Play/pause dot → toggles the headline timer.
 *   - Time area       → opens the full timer dialog focused on the headline.
 *   - +N badge        → opens the dialog (without changing focus).
 */
export function TimerRunningPill({ className }: { className?: string }) {
  const { timer, text } = useHeadlineTimer(500)
  const activeTimers = useActiveAndRunningTimers()
  const pauseTimer = useSalahStore((s) => s.pauseTimer)
  const resumeTimer = useSalahStore((s) => s.resumeTimer)

  if (!timer) return null
  if (timer.status !== 'running' && timer.status !== 'paused') return null

  const accent = modeAccent(timer.mode)
  const isPaused = timer.status === 'paused'
  const extraCount = Math.max(0, activeTimers.length - 1)

  function toggle() {
    if (!timer) return
    if (isPaused) resumeTimer(timer.id)
    else pauseTimer(timer.id)
  }

  return (
    <div
      className={cn(
        'inline-flex items-stretch overflow-hidden rounded-full border text-[12px] font-medium shadow-control transition-shadow duration-200 hover:shadow-control-hover',
        className,
      )}
      style={{
        borderColor: accent.border,
        backgroundColor: accent.soft,
        color: accent.text,
        // @ts-expect-error css var for focus ring
        '--tw-ring-color': `${accent.stroke}40`,
      }}
    >
      <button
        type="button"
        onClick={toggle}
        aria-label={isPaused ? 'Resume timer' : 'Pause timer'}
        className="flex items-center justify-center pl-1.5 pr-1 py-1 transition-[transform] duration-150 active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-bg"
      >
        <span
          aria-hidden
          className={cn(
            'flex h-4 w-4 items-center justify-center rounded-full',
            !isPaused && 'noor-timer-dot',
          )}
          style={{ backgroundColor: accent.stroke, color: 'white' }}
        >
          {isPaused ? <Play size={9} fill="white" /> : <Pause size={9} fill="white" />}
        </span>
      </button>

      <button
        type="button"
        onClick={() => dispatchShortcutEvent('timer:open', { timerId: timer.id })}
        aria-label={`Timer ${isPaused ? 'paused' : 'running'}: ${text}, ${phaseLabel(timer)}. Click to open.`}
        className={cn(
          'group inline-flex items-center pl-1 py-1 transition-[transform] duration-150 active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-bg',
          extraCount > 0 ? 'pr-1.5' : 'pr-2.5',
        )}
      >
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{text}</span>
      </button>

      {extraCount > 0 && (
        <button
          type="button"
          onClick={() => dispatchShortcutEvent('timer:open')}
          aria-label={`${extraCount} more active timer${extraCount === 1 ? '' : 's'}. Click to view all.`}
          className="flex items-center justify-center pl-1 pr-2 py-1 text-[11px] font-semibold transition-[transform] duration-150 active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-bg"
          style={{
            borderLeft: `1px solid ${accent.border}`,
            color: accent.text,
          }}
        >
          +{extraCount}
        </button>
      )}
    </div>
  )
}
