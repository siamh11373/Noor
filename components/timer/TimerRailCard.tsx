'use client'

import { useEffect, useState } from 'react'
import { Timer as TimerIcon, Play, Pause } from 'lucide-react'
import { dispatchShortcutEvent } from '@/lib/shortcut-events'
import { useSalahStore } from '@/lib/store'
import { useTimerTicker, useActiveAndRunningTimers } from '@/hooks/useTimer'
import {
  computeRemaining,
  formatTime,
  modeAccent,
  modeLabel,
  phaseLabel,
  type TimerState,
} from '@/lib/timer'
import { cn } from '@/lib/utils'

/**
 * Tasks left-rail entry point. Shows the **active** timer at the top and,
 * when multiple timers are running, a compact chip row of the others.
 *
 *   - Idle (active)  → eyebrow + duration + Start / Options
 *   - Active (active)→ live remaining + Pause/Resume · Open (click time → open dialog)
 *   - Other running  → chip per timer; click to make active + open dialog
 */
export function TimerRailCard({ onOpen }: { onOpen?: () => void }) {
  const { timer, text } = useTimerTicker(undefined, 500)
  const activeRunning = useActiveAndRunningTimers()
  const startTimer = useSalahStore((s) => s.startTimer)
  const pauseTimer = useSalahStore((s) => s.pauseTimer)
  const resumeTimer = useSalahStore((s) => s.resumeTimer)
  const setActiveTimer = useSalahStore((s) => s.setActiveTimer)

  if (!timer) return null

  const isActive = timer.status === 'running' || timer.status === 'paused'
  const isPaused = timer.status === 'paused'
  const accent = modeAccent(timer.mode)

  const others = activeRunning.filter((t) => t.id !== timer.id)

  function openDialog(id?: string) {
    if (id) dispatchShortcutEvent('timer:open', { timerId: id })
    else dispatchShortcutEvent('timer:open')
    onOpen?.()
  }

  function startHere() {
    startTimer()
  }

  function togglePause() {
    if (isPaused) resumeTimer()
    else pauseTimer()
  }

  const idleHeadline = idleHeadlineFor(timer)
  const idleSubline = idleSublineFor(timer)

  return (
    <div className="flex flex-col gap-2">
      <div
        className="rounded-xl border px-3 py-3 transition-colors duration-200"
        style={{
          borderColor: accent.border,
          backgroundColor: accent.soft,
        }}
      >
        <div className="flex items-center justify-between">
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.2em]"
            style={{ color: accent.text }}
          >
            <TimerIcon size={10} className="mr-1 inline -translate-y-[1px]" aria-hidden />
            {isActive ? `${modeLabel(timer.mode)} · ${phaseLabel(timer)}` : modeLabel(timer.mode)}
          </p>
          {isActive && (
            <span
              aria-hidden
              className={cn(
                'flex h-2 w-2 rounded-full',
                !isPaused && 'noor-timer-dot',
              )}
              style={{ backgroundColor: accent.stroke }}
            />
          )}
        </div>

        {isActive ? (
          <>
            <button
              type="button"
              onClick={() => openDialog()}
              aria-label="Open timer"
              className="mt-1 -mx-1 block w-[calc(100%+0.5rem)] rounded-md px-1 py-0.5 text-left text-[22px] font-semibold tabular-nums tracking-tight text-ink-primary transition-colors duration-150 hover:bg-black/[0.03] focus-visible:bg-black/[0.03] focus-visible:outline-none dark:hover:bg-white/[0.04] dark:focus-visible:bg-white/[0.04]"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {text}
            </button>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={togglePause}
                aria-label={isPaused ? 'Resume timer' : 'Pause timer'}
                className="inline-flex min-h-[32px] flex-1 items-center justify-center gap-1.5 rounded-md border px-3 text-[12px] font-semibold text-white shadow-control transition-[transform,box-shadow,background-color] duration-150 hover:shadow-control-hover active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-bg"
                style={{
                  backgroundColor: accent.stroke,
                  borderColor: accent.stroke,
                  // @ts-expect-error css var for focus ring
                  '--tw-ring-color': `${accent.stroke}66`,
                }}
              >
                {isPaused
                  ? <><Play  size={12} fill="white" aria-hidden /> Resume</>
                  : <><Pause size={12} fill="white" aria-hidden /> Pause</>}
              </button>
              <button
                type="button"
                onClick={() => openDialog()}
                className="btn-secondary min-h-[32px] px-3 text-[12px] font-semibold"
                aria-label="Open timer dialog"
              >
                Open
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-1.5 text-[16px] font-semibold tracking-tight text-ink-primary">
              {idleHeadline}
            </p>
            {idleSubline && <p className="text-[11px] text-ink-muted">{idleSubline}</p>}
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={startHere}
                className="btn-primary inline-flex min-h-[32px] flex-1 items-center justify-center gap-1.5 text-[12px] font-semibold"
              >
                <Play size={12} fill="white" aria-hidden />
                Start
              </button>
              <button
                type="button"
                onClick={() => openDialog()}
                className="btn-secondary min-h-[32px] px-3 text-[12px] font-semibold"
                aria-label="Timer options"
              >
                Options
              </button>
            </div>
          </>
        )}
      </div>

      {others.length > 0 && (
        <OtherTimersRow
          timers={others}
          onSelect={(id) => {
            setActiveTimer(id)
            openDialog(id)
          }}
        />
      )}
    </div>
  )
}

// ─── other-timers chip row ────────────────────────────────────────────────────

function OtherTimersRow({
  timers,
  onSelect,
}: {
  timers: TimerState[]
  onSelect: (id: string) => void
}) {
  // Re-render every second while any chip is running.
  const anyRunning = timers.some((t) => t.status === 'running')
  const [, force] = useState(0)
  useEffect(() => {
    if (!anyRunning) return
    const id = window.setInterval(() => force((n) => (n + 1) % 1_000_000), 1000)
    return () => window.clearInterval(id)
  }, [anyRunning])

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-ghost">
        Also running
      </span>
      {timers.map((t) => {
        const accent = modeAccent(t.mode)
        const isPaused = t.status === 'paused'
        const text =
          t.mode === 'stopwatch'
            ? modeLabel(t.mode)
            : formatTime(computeRemaining(t))
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t.id)}
            aria-label={`Switch to ${t.label || modeLabel(t.mode)}, ${text}`}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-[transform,box-shadow] duration-150 active:scale-[0.97] hover:shadow-control',
              isPaused ? 'opacity-70' : '',
            )}
            style={{
              borderColor: accent.border,
              backgroundColor: accent.soft,
              color: accent.text,
            }}
          >
            <span
              aria-hidden
              className={cn('h-1.5 w-1.5 rounded-full', !isPaused && 'noor-timer-dot')}
              style={{ backgroundColor: accent.stroke }}
            />
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{text}</span>
          </button>
        )
      })}
    </div>
  )
}

// ─── idle helpers ─────────────────────────────────────────────────────────────

function idleHeadlineFor(t: TimerState): string {
  switch (t.mode) {
    case 'countdown':
      return formatTime(t.countdownConfig.durationMs)
    case 'focus':
      return `${Math.round(t.focusConfig.workMs / 60_000)} min focus`
    case 'interval':
      return `${t.intervalConfig.rounds} × ${Math.round(t.intervalConfig.workMs / 1000)}s`
    case 'stopwatch':
      return 'Count up'
  }
}

function idleSublineFor(t: TimerState): string | null {
  switch (t.mode) {
    case 'countdown':
      return 'Custom duration'
    case 'focus':
      return `Pomodoro · ${Math.round(t.focusConfig.breakMs / 60_000)} min break`
    case 'interval':
      return t.intervalConfig.restMs > 0
        ? `${Math.round(t.intervalConfig.workMs / 1000)}s work / ${Math.round(t.intervalConfig.restMs / 1000)}s rest`
        : `${Math.round(t.intervalConfig.workMs / 1000)}s on EMOM`
    case 'stopwatch':
      return null
  }
}
