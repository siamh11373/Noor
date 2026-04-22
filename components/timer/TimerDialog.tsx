'use client'

import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Pause, Play, Plus, RotateCcw, SkipForward, Trash2, Bell, BellOff, Volume2, VolumeX } from 'lucide-react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { TimerRing } from '@/components/timer/TimerRing'
import { useTimer, requestTimerNotifications } from '@/hooks/useTimer'
import { useSalahStore } from '@/lib/store'
import {
  COUNTDOWN_PRESETS,
  FOCUS_PRESETS,
  INTERVAL_PRESETS,
  clampCountdownMs,
  computeRemaining,
  formatTime,
  modeAccent,
  modeLabel as modeLabelFor,
  phaseLabel as phaseLabelFor,
  splitMs,
  type TimerMode,
  type TimerState,
} from '@/lib/timer'
import { onShortcutEvent } from '@/lib/shortcut-events'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/toast-host'

const MODE_TABS: { id: TimerMode; label: string; hint: string }[] = [
  { id: 'countdown', label: 'Timer',     hint: 'Set any duration' },
  { id: 'focus',     label: 'Focus',     hint: 'Pomodoro cycles' },
  { id: 'interval',  label: 'Interval',  hint: 'HIIT / Tabata' },
  { id: 'stopwatch', label: 'Stopwatch', hint: 'Count up' },
]

/**
 * The global timer surface. Mounted once at shell level. Listens for
 * 'timer:open' custom events (from nav / rail / fitness buttons / keys)
 * and manages its own open state.
 */
export function TimerDialog() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    return onShortcutEvent<{ mode?: TimerMode; timerId?: string } | undefined>('timer:open', (detail) => {
      setOpen(true)
      const store = useSalahStore.getState()
      // Optional: focus a specific timer (e.g. rail chip click).
      if (detail?.timerId && store.timers.some((t) => t.id === detail.timerId)) {
        store.setActiveTimer(detail.timerId)
      }
      if (detail?.mode) {
        // Apply to the (now-active) timer.
        store.setTimerMode(detail.mode)
      }
    })
  }, [])

  // Auto-open on completion so the user sees the peak-end moment even if the
  // dialog was closed mid-run. We watch any timer transitioning to 'completed'.
  const anyCompleted = useSalahStore((s) => s.timers.some((t) => t.status === 'completed'))
  useEffect(() => {
    if (anyCompleted) setOpen(true)
  }, [anyCompleted])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[min(96vw,820px)] p-0 overflow-hidden">
        <TimerDialogShell onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}

/** Two-column layout: multi-timer sidebar on the left, active timer body on the right. */
function TimerDialogShell({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex w-full flex-col sm:flex-row">
      <TimerSidebar />
      <div className="min-w-0 flex-1">
        <TimerDialogBody onClose={onClose} />
      </div>
    </div>
  )
}

function TimerDialogBody({ onClose }: { onClose: () => void }) {
  const t = useTimer(undefined, 250)
  const {
    timer,
    displayText,
    progress,
    phaseLabel,
    accent,
    remainingMs,
    isIdle,
    isRunning,
    isPaused,
    isCompleted,
  } = t

  const setTimerMode = useSalahStore(s => s.setTimerMode)
  const startTimer = useSalahStore(s => s.startTimer)
  const pauseTimer = useSalahStore(s => s.pauseTimer)
  const resumeTimer = useSalahStore(s => s.resumeTimer)
  const resetTimer = useSalahStore(s => s.resetTimer)
  const skipPhase = useSalahStore(s => s.skipPhase)
  const dismissCompletion = useSalahStore(s => s.dismissTimerCompletion)
  const setFocusConfig = useSalahStore(s => s.setFocusConfig)
  const setCountdownConfig = useSalahStore(s => s.setCountdownConfig)
  const setIntervalConfig = useSalahStore(s => s.setIntervalConfig)
  const adjustPausedCountdown = useSalahStore(s => s.adjustPausedCountdown)
  const soundEnabled = timer?.soundEnabled ?? true
  const notificationsEnabled = timer?.notificationsEnabled ?? false
  const setSoundEnabled = useSalahStore(s => s.setTimerSoundEnabled)
  const setNotificationsEnabled = useSalahStore(s => s.setTimerNotificationsEnabled)

  const toggle = useCallback(() => {
    if (isRunning) pauseTimer()
    else if (isPaused) resumeTimer()
    else startTimer()
  }, [isRunning, isPaused, pauseTimer, resumeTimer, startTimer])

  const handleSkip = useCallback(() => {
    if (isIdle || isCompleted) return
    skipPhase()
  }, [isIdle, isCompleted, skipPhase])

  const handleReset = useCallback(() => {
    resetTimer()
  }, [resetTimer])

  // In-dialog keyboard shortcuts.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); toggle() }
      else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); handleReset() }
      else if (e.key === 's' || e.key === 'S') { e.preventDefault(); handleSkip() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggle, handleReset, handleSkip])

  // Empty state: no active timer. Should be rare — initial store always has one.
  if (!timer) {
    return (
      <div className="p-10 text-center text-sm text-ink-muted">
        No timer selected. Create one from the sidebar.
      </div>
    )
  }

  const handleModeChange = (mode: TimerMode) => {
    if (isRunning || isPaused) {
      toast.show('Reset the current run first to switch modes', { tone: 'warning' })
      return
    }
    setTimerMode(mode)
  }

  const handleNotificationsToggle = async () => {
    if (!notificationsEnabled) {
      const granted = await requestTimerNotifications()
      if (!granted) {
        toast.show('Enable browser notifications in your OS settings', { tone: 'warning' })
        return
      }
    }
    setNotificationsEnabled(!notificationsEnabled)
  }

  // Completion peak-end.
  if (isCompleted) {
    return (
      <CompletionView
        label={phaseLabel}
        onDismiss={() => { dismissCompletion(); onClose() }}
        onStartBreak={() => {
          if (timer.mode === 'focus') {
            // advance to break by simulating a skip from the completed state.
            // In practice, completePhase already advanced; here we just start.
            startTimer()
          } else {
            startTimer()
          }
        }}
        mode={timer.mode}
      />
    )
  }

  return (
    <div className="flex flex-col">
      {/* Mode tabs */}
      <div className="flex items-center gap-1 border-b border-surface-border px-5 pt-5 pb-3">
        <DialogPrimitive.Title className="sr-only">Timer</DialogPrimitive.Title>
        <DialogPrimitive.Description className="sr-only">
          Focus, countdown, stopwatch, and interval timers.
        </DialogPrimitive.Description>
        <div className="flex flex-1 items-center gap-1">
          {MODE_TABS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => handleModeChange(m.id)}
              className={cn(
                'rounded-[10px] px-3 py-1.5 text-[12px] font-medium transition-[background-color,color] duration-150',
                timer.mode === m.id
                  ? 'text-ink-primary'
                  : 'text-ink-muted hover:text-ink-secondary',
              )}
              style={
                timer.mode === m.id
                  ? { backgroundColor: modeAccent(m.id).soft, color: modeAccent(m.id).text }
                  : undefined
              }
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ring + display */}
      <div className="flex flex-col items-center px-5 pt-7 pb-4">
        <p
          className="text-[10px] font-semibold uppercase tracking-[0.28em]"
          style={{ color: accent.text }}
        >
          {phaseLabel}
        </p>

        <TimerRing
          progress={progress}
          accent={accent}
          halo={isRunning}
          size={280}
          className="mt-4"
        >
          <div className="flex flex-col items-center">
            <div
              className="font-serif font-semibold leading-none tracking-tight text-ink-primary"
              style={{ fontSize: 68, fontVariantNumeric: 'tabular-nums' }}
            >
              {displayText}
            </div>
            {timer.mode === 'focus' && timer.cycleIndex > 0 && (
              <div className="mt-3 text-[11px] uppercase tracking-[0.24em] text-ink-ghost">
                Cycle {timer.cycleIndex + 1}
              </div>
            )}
            {timer.mode === 'interval' && timer.phase === 'work' && (
              <div className="mt-3 text-[11px] uppercase tracking-[0.24em] text-ink-ghost">
                {timer.cycleIndex + 1} of {timer.intervalConfig.rounds}
              </div>
            )}
          </div>
        </TimerRing>

        {/* Primary controls */}
        <div className="mt-7 flex items-center gap-4">
          <IconButton onClick={handleReset} disabled={isIdle} label="Reset (r)">
            <RotateCcw size={18} />
          </IconButton>

          <button
            type="button"
            onClick={toggle}
            aria-label={isRunning ? 'Pause (space)' : 'Start (space)'}
            className="flex h-14 w-14 items-center justify-center rounded-full text-white shadow-btn-primary transition-[transform,box-shadow] duration-200 ease-out hover:shadow-btn-primary-hover active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-card"
            style={{
              backgroundColor: accent.stroke,
              // @ts-expect-error css var for focus ring
              '--tw-ring-color': `${accent.stroke}59`,
            }}
          >
            {isRunning ? <Pause size={22} fill="white" /> : <Play size={22} fill="white" />}
          </button>

          <IconButton onClick={handleSkip} disabled={isIdle} label="Skip phase (s)">
            <SkipForward size={18} />
          </IconButton>
        </div>
      </div>

      {/* Presets row.
          - Shown while idle (edit configuration).
          - In countdown mode, also shown while paused so the user can edit
            the remaining time in place; chips are hidden in that case since
            tapping one would reset the in-flight run. */}
      {(isIdle || (isPaused && timer.mode === 'countdown')) && (
        <PresetRow
          mode={timer.mode}
          isPausedEdit={isPaused && timer.mode === 'countdown'}
          focusWorkMs={timer.focusConfig.workMs}
          countdownDurationMs={
            // While paused we treat the stepper as a remaining-time editor
            // so the value tracks what the user currently sees.
            isPaused && timer.mode === 'countdown'
              ? Math.max(1_000, remainingMs)
              : timer.countdownConfig.durationMs
          }
          intervalWorkSec={timer.intervalConfig.workMs / 1000}
          intervalRestSec={timer.intervalConfig.restMs / 1000}
          intervalRounds={timer.intervalConfig.rounds}
          onFocusPreset={(p) => setFocusConfig({
            workMs: p.workMin * 60_000,
            breakMs: p.breakMin * 60_000,
            longBreakMs: p.longBreakMin * 60_000,
            cyclesBeforeLongBreak: p.cyclesBeforeLongBreak,
          })}
          onCountdownPreset={(min) => setCountdownConfig({ durationMs: min * 60_000 })}
          onCountdownDuration={(ms) => {
            if (isPaused && timer.mode === 'countdown') {
              adjustPausedCountdown(ms)
            } else {
              setCountdownConfig({ durationMs: clampCountdownMs(ms) })
            }
          }}
          onIntervalPreset={(p) => setIntervalConfig({
            warmupMs: p.warmupSec * 1000,
            workMs: p.workSec * 1000,
            restMs: p.restSec * 1000,
            rounds: p.rounds,
            cooldownMs: p.cooldownSec * 1000,
          })}
          // Enter inside the stepper = "save + act": start the timer when
          // idle, resume the run when paused-editing. Matches Apple's timer.
          onCountdownSubmit={() => {
            if (isPaused) resumeTimer()
            else if (isIdle) startTimer()
          }}
        />
      )}

      {/* Settings row */}
      <div className="flex items-center justify-between border-t border-surface-border px-5 py-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink-primary"
            aria-label={soundEnabled ? 'Disable sound' : 'Enable sound'}
            aria-pressed={soundEnabled}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          <button
            type="button"
            onClick={handleNotificationsToggle}
            className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink-primary"
            aria-label={notificationsEnabled ? 'Disable notifications' : 'Enable notifications'}
            aria-pressed={notificationsEnabled}
          >
            {notificationsEnabled ? <Bell size={16} /> : <BellOff size={16} />}
          </button>
        </div>
        <p className="text-[11px] text-ink-ghost">
          Space · <kbd className="mx-0.5">R</kbd> reset · <kbd>S</kbd> skip
        </p>
      </div>
    </div>
  )
}

// ─── Preset row ────────────────────────────────────────────────────────────────

function PresetRow(props: {
  mode: TimerMode
  isPausedEdit?: boolean
  focusWorkMs: number
  countdownDurationMs: number
  intervalWorkSec: number
  intervalRestSec: number
  intervalRounds: number
  onFocusPreset: (p: (typeof FOCUS_PRESETS)[number]) => void
  onCountdownPreset: (min: number) => void
  onIntervalPreset: (p: (typeof INTERVAL_PRESETS)[number]) => void
  onCountdownDuration: (ms: number) => void
  onCountdownSubmit?: () => void
}) {
  const accent = useMemo(() => modeAccent(props.mode), [props.mode])

  if (props.mode === 'countdown') {
    return (
      <div className="flex flex-col items-stretch gap-3 border-t border-surface-border px-5 py-4">
        <DurationStepper
          durationMs={props.countdownDurationMs}
          accent={accent}
          onChange={props.onCountdownDuration}
          onSubmit={props.onCountdownSubmit}
          label={props.isPausedEdit ? 'Edit remaining' : 'Set duration'}
        />
        {!props.isPausedEdit && (
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {COUNTDOWN_PRESETS.map((p) => {
              const active = props.countdownDurationMs === p.min * 60_000
              return (
                <PresetChip key={p.id} active={active} accent={accent} onClick={() => props.onCountdownPreset(p.min)}>
                  {p.label}
                </PresetChip>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-t border-surface-border px-5 py-3">
      {props.mode === 'focus' && FOCUS_PRESETS.map((p) => {
        const active = props.focusWorkMs === p.workMin * 60_000
        return (
          <PresetChip key={p.id} active={active} accent={accent} onClick={() => props.onFocusPreset(p)}>
            {p.label}
            <span className="ml-1.5 text-[10px] text-ink-ghost">{p.sub}</span>
          </PresetChip>
        )
      })}

      {props.mode === 'interval' && INTERVAL_PRESETS.map((p) => {
        const active =
          props.intervalWorkSec === p.workSec &&
          props.intervalRestSec === p.restSec &&
          props.intervalRounds === p.rounds
        return (
          <PresetChip key={p.id} active={active} accent={accent} onClick={() => props.onIntervalPreset(p)}>
            {p.label}
            <span className="ml-1.5 text-[10px] text-ink-ghost">{p.sub}</span>
          </PresetChip>
        )
      })}

      {props.mode === 'stopwatch' && (
        <p className="text-[12px] text-ink-ghost">
          Press start to begin. Timer counts up until you stop.
        </p>
      )}
    </div>
  )
}

// ─── Duration stepper (Apple-style typing) ─────────────────────────────────────

type StepperUnit = 'h' | 'm' | 's'

function DurationStepper({
  durationMs,
  accent,
  onChange,
  onSubmit,
  label = 'Set duration',
}: {
  durationMs: number
  accent: ReturnType<typeof modeAccent>
  onChange: (ms: number) => void
  /** Fires after Enter commits the value — parent typically starts/resumes. */
  onSubmit?: () => void
  label?: string
}) {
  const { h, m, s } = splitMs(durationMs)

  const hRef = useRef<HTMLInputElement>(null)
  const mRef = useRef<HTMLInputElement>(null)
  const sRef = useRef<HTMLInputElement>(null)

  // Local in-progress drafts so typing "1" then "5" isn't prematurely clamped.
  //
  // We mirror `draft` into `draftRef` so that blur handlers — which can fire
  // synchronously inside our own `focus()` calls (auto-advance) — always see
  // the latest value, not the stale closure copy that hasn't flushed yet.
  const [draft, setDraft] = useState<{ h: string | null; m: string | null; s: string | null }>({
    h: null, m: null, s: null,
  })
  const draftRef = useRef(draft)

  function writeDraft(next: { h: string | null; m: string | null; s: string | null }) {
    draftRef.current = next
    setDraft(next)
  }

  const disp = (unit: StepperUnit) => {
    const d = draft[unit]
    if (d != null) return d
    return ({ h, m, s }[unit]).toString().padStart(2, '0')
  }

  function commit(nh: number, nm: number, ns: number) {
    let totalSec = nh * 3600 + nm * 60 + ns
    totalSec = Math.max(1, Math.min(23 * 3600 + 59 * 60 + 59, totalSec))
    onChange(clampCountdownMs(totalSec * 1000))
  }

  function focusAndSelect(ref: React.RefObject<HTMLInputElement>) {
    const el = ref.current
    if (!el) return
    el.focus()
    requestAnimationFrame(() => el.select())
  }

  function handleInput(unit: StepperUnit, raw: string) {
    const clean = raw.replace(/[^0-9]/g, '').slice(0, 2)
    writeDraft({ ...draftRef.current, [unit]: clean })

    // Auto-advance after 2 digits (Apple passcode / timer feel).
    if (clean.length === 2) {
      commitUnit(unit, clean)
      if (unit === 'h') focusAndSelect(mRef)
      else if (unit === 'm') focusAndSelect(sRef)
    }
  }

  function commitUnit(unit: StepperUnit, rawValue?: string) {
    const raw = rawValue ?? draftRef.current[unit]
    // Clear the draft synchronously so any blur that fires before the next
    // paint (e.g. triggered by auto-advance's focus() call) sees `null` and
    // short-circuits — preventing a stale value from overwriting the commit.
    writeDraft({ ...draftRef.current, [unit]: null })
    if (raw == null) return
    const n = raw === '' ? 0 : Number(raw)
    const max = unit === 'h' ? 23 : 59
    const clamped = Number.isFinite(n) ? Math.max(0, Math.min(max, n)) : 0
    const nh = unit === 'h' ? clamped : h
    const nm = unit === 'm' ? clamped : m
    const ns = unit === 's' ? clamped : s
    commit(nh, nm, ns)
  }

  function bumpUnit(unit: StepperUnit, delta: 1 | -1) {
    const cur = unit === 'h' ? h : unit === 'm' ? m : s
    const next = cur + delta
    const nh = unit === 'h' ? next : h
    const nm = unit === 'm' ? next : m
    const ns = unit === 's' ? next : s
    commit(nh, nm, ns)
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <p
        className="text-[10px] font-semibold uppercase tracking-[0.28em]"
        style={{ color: accent.text }}
      >
        {label}
      </p>
      <div
        className="group flex items-center justify-center gap-1 rounded-2xl border border-surface-border bg-surface-card px-4 py-2 shadow-sm transition-[border-color,box-shadow] duration-200 focus-within:shadow-md"
        style={{
          ['--tw-ring-color' as string]: `${accent.stroke}40`,
        }}
        onMouseDown={(e) => {
          // Click anywhere inside the field focuses the nearest input for a
          // one-tap editing feel.
          if ((e.target as HTMLElement).tagName === 'INPUT') return
          e.preventDefault()
          focusAndSelect(hRef)
        }}
      >
        <TimeInput
          ref={hRef}
          value={disp('h')}
          accent={accent}
          label="Hours"
          onChangeRaw={(v) => handleInput('h', v)}
          onBlur={() => commitUnit('h')}
          onArrow={(dir) => bumpUnit('h', dir)}
          onBackspaceEmpty={() => {}}
          onRight={() => focusAndSelect(mRef)}
          onSubmit={onSubmit}
        />
        <Colon accent={accent} />
        <TimeInput
          ref={mRef}
          value={disp('m')}
          accent={accent}
          label="Minutes"
          onChangeRaw={(v) => handleInput('m', v)}
          onBlur={() => commitUnit('m')}
          onArrow={(dir) => bumpUnit('m', dir)}
          onBackspaceEmpty={() => focusAndSelect(hRef)}
          onLeft={() => focusAndSelect(hRef)}
          onRight={() => focusAndSelect(sRef)}
          onSubmit={onSubmit}
        />
        <Colon accent={accent} />
        <TimeInput
          ref={sRef}
          value={disp('s')}
          accent={accent}
          label="Seconds"
          onChangeRaw={(v) => handleInput('s', v)}
          onBlur={() => commitUnit('s')}
          onArrow={(dir) => bumpUnit('s', dir)}
          onBackspaceEmpty={() => focusAndSelect(mRef)}
          onLeft={() => focusAndSelect(mRef)}
          onSubmit={onSubmit}
        />
      </div>
      <div className="flex items-center gap-6 text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-ghost">
        <span className="w-[38px] text-center">Hrs</span>
        <span className="w-[38px] text-center">Min</span>
        <span className="w-[38px] text-center">Sec</span>
      </div>
    </div>
  )
}

function Colon({ accent }: { accent: ReturnType<typeof modeAccent> }) {
  return (
    <span
      aria-hidden
      className="select-none font-serif text-[34px] font-light leading-none"
      style={{ color: accent.text, opacity: 0.55 }}
    >
      :
    </span>
  )
}

type TimeInputProps = {
  value: string
  label: string
  accent: ReturnType<typeof modeAccent>
  onChangeRaw: (v: string) => void
  onBlur: () => void
  onArrow: (dir: 1 | -1) => void
  onBackspaceEmpty: () => void
  onLeft?: () => void
  onRight?: () => void
  /** Fires on Enter *after* the current field has been committed via blur. */
  onSubmit?: () => void
}

const TimeInput = forwardRef<HTMLInputElement, TimeInputProps>(function TimeInput(
  { value, label, accent, onChangeRaw, onBlur, onArrow, onBackspaceEmpty, onLeft, onRight, onSubmit },
  ref,
) {
  return (
    <input
      ref={ref}
      value={value}
      inputMode="numeric"
      pattern="[0-9]*"
      maxLength={2}
      aria-label={label}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => onChangeRaw(e.target.value)}
      onBlur={onBlur}
      onKeyDown={(e) => {
        if (e.key === 'ArrowUp')        { e.preventDefault(); onArrow(1) }
        else if (e.key === 'ArrowDown') { e.preventDefault(); onArrow(-1) }
        else if (e.key === 'ArrowLeft'  && onLeft  && (e.currentTarget.selectionStart ?? 0) === 0) { e.preventDefault(); onLeft() }
        else if (e.key === 'ArrowRight' && onRight && (e.currentTarget.selectionEnd ?? 0) >= e.currentTarget.value.length) { e.preventDefault(); onRight() }
        else if (e.key === 'Backspace') {
          const el = e.currentTarget
          const empty = el.value === '' || (el.selectionStart === 0 && el.selectionEnd === 0)
          if (empty) { e.preventDefault(); onBackspaceEmpty() }
        }
        else if (e.key === 'Enter') {
          e.preventDefault()
          // Commit first (blur flushes the draft through onBlur), then invoke
          // the parent's save/submit action (e.g. start or resume the timer).
          ;(e.currentTarget as HTMLInputElement).blur()
          onSubmit?.()
        }
      }}
      className="w-[54px] rounded-lg bg-transparent text-center font-serif text-[38px] font-semibold leading-none tracking-tight caret-current outline-none transition-colors duration-150"
      style={{
        fontVariantNumeric: 'tabular-nums',
        color: value === '00' ? 'rgb(var(--ink-muted))' : 'rgb(var(--ink-primary))',
        caretColor: accent.stroke,
      }}
    />
  )
})

function PresetChip({
  active,
  accent,
  children,
  onClick,
}: {
  active: boolean
  accent: ReturnType<typeof modeAccent>
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1 text-[12px] font-medium transition-[background-color,border-color,color] duration-150',
        active
          ? 'text-ink-primary'
          : 'border-surface-border bg-surface-card text-ink-secondary hover:border-brand-200',
      )}
      style={
        active
          ? { backgroundColor: accent.soft, borderColor: accent.border, color: accent.text }
          : undefined
      }
    >
      {children}
    </button>
  )
}

function IconButton({
  children,
  onClick,
  disabled,
  label,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border bg-surface-card text-ink-muted shadow-control transition-[transform,box-shadow,color] duration-200 ease-out hover:text-ink-primary hover:shadow-control-hover active:scale-[0.95] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/25 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-card"
    >
      {children}
    </button>
  )
}

// ─── Completion peak-end ───────────────────────────────────────────────────────

function CompletionView({
  label,
  onDismiss,
  onStartBreak,
  mode,
}: {
  label: string
  onDismiss: () => void
  onStartBreak: () => void
  mode: TimerMode
}) {
  const accent = modeAccent(mode)
  return (
    <div className="flex flex-col items-center px-5 pt-8 pb-6">
      <DialogPrimitive.Title className="sr-only">Timer complete</DialogPrimitive.Title>
      <p
        className="text-[10px] font-semibold uppercase tracking-[0.28em]"
        style={{ color: accent.text }}
      >
        {label}
      </p>
      <TimerRing progress={1} accent={accent} size={240} completed className="mt-4">
        <div className="flex flex-col items-center">
          <p className="font-serif text-[44px] font-semibold tracking-tight text-ink-primary">Done.</p>
          <p className="mt-1 text-[13px] text-ink-secondary">
            {mode === 'focus' ? 'Nice focus session.' : mode === 'interval' ? 'Workout complete.' : 'Timer complete.'}
          </p>
        </div>
      </TimerRing>
      <div className="mt-6 flex items-center gap-2">
        {mode === 'focus' && (
          <button
            type="button"
            onClick={onStartBreak}
            className="btn-primary px-4 py-2 text-[13px]"
            style={{ backgroundColor: accent.stroke, borderColor: accent.stroke }}
          >
            Start break
          </button>
        )}
        <button type="button" onClick={onDismiss} className="btn-secondary px-4 py-2 text-[13px]">
          Dismiss
        </button>
      </div>
    </div>
  )
}

// ─── Multi-timer sidebar ──────────────────────────────────────────────────────

function TimerSidebar() {
  const timers = useSalahStore((s) => s.timers)
  const activeTimerId = useSalahStore((s) => s.activeTimerId)
  const setActiveTimer = useSalahStore((s) => s.setActiveTimer)
  const createTimer = useSalahStore((s) => s.createTimer)
  const removeTimer = useSalahStore((s) => s.removeTimer)
  const renameTimer = useSalahStore((s) => s.renameTimer)
  const startTimer = useSalahStore((s) => s.startTimer)
  const pauseTimer = useSalahStore((s) => s.pauseTimer)
  const resumeTimer = useSalahStore((s) => s.resumeTimer)

  // Tick so running rows update remaining text.
  const anyRunning = timers.some((t) => t.status === 'running')
  const [, force] = useState(0)
  useEffect(() => {
    if (!anyRunning) return
    const id = window.setInterval(() => force((n) => (n + 1) % 1_000_000), 500)
    return () => window.clearInterval(id)
  }, [anyRunning])

  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')

  const sorted = useMemo(
    () => [...timers].sort((a, b) => a.createdAt - b.createdAt),
    [timers],
  )

  return (
    <aside className="flex w-full flex-col border-b border-surface-border bg-surface-muted/40 sm:w-[220px] sm:min-w-[220px] sm:border-b-0 sm:border-r">
      <div className="flex items-center justify-between px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-ink-ghost">
          Timers
        </p>
        <button
          type="button"
          onClick={() => createTimer()}
          aria-label="Create timer"
          className="flex h-6 w-6 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-bg hover:text-ink-primary"
        >
          <Plus size={14} />
        </button>
      </div>

      <ul className="flex max-h-[420px] flex-col gap-1 overflow-y-auto px-2 pb-3 sm:max-h-[560px]">
        {sorted.map((t, idx) => {
          const accent = modeAccent(t.mode)
          const isActive = t.id === activeTimerId
          const displayName = t.label?.trim() || defaultTimerName(t, idx)
          const statusText = shortStatusFor(t)
          const isRenaming = renamingId === t.id

          return (
            <li key={t.id}>
              <div
                className={cn(
                  'group flex items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors duration-150',
                  isActive
                    ? 'bg-surface-bg'
                    : 'hover:bg-surface-bg/70',
                )}
                style={isActive ? { boxShadow: `inset 0 0 0 1px ${accent.border}` } : undefined}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (t.status === 'running') pauseTimer(t.id)
                    else if (t.status === 'paused') resumeTimer(t.id)
                    else startTimer(t.id)
                  }}
                  aria-label={
                    t.status === 'running'
                      ? `Pause ${displayName}`
                      : t.status === 'paused'
                      ? `Resume ${displayName}`
                      : `Start ${displayName}`
                  }
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white transition-[transform] duration-150 active:scale-[0.92]"
                  style={{ backgroundColor: accent.stroke }}
                >
                  {t.status === 'running'
                    ? <Pause size={12} fill="white" />
                    : <Play size={12} fill="white" />}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTimer(t.id)}
                  onDoubleClick={() => {
                    setRenamingId(t.id)
                    setRenameDraft(t.label ?? '')
                  }}
                  className="flex min-w-0 flex-1 flex-col text-left"
                >
                  {isRenaming ? (
                    <input
                      autoFocus
                      value={renameDraft}
                      onChange={(e) => setRenameDraft(e.target.value)}
                      onBlur={() => {
                        renameTimer(t.id, renameDraft.trim() || null)
                        setRenamingId(null)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          renameTimer(t.id, renameDraft.trim() || null)
                          setRenamingId(null)
                        } else if (e.key === 'Escape') {
                          setRenamingId(null)
                        }
                      }}
                      className="w-full rounded-sm bg-transparent text-[13px] font-medium text-ink-primary outline-none"
                    />
                  ) : (
                    <span className="truncate text-[13px] font-medium text-ink-primary">
                      {displayName}
                    </span>
                  )}
                  <span
                    className="truncate text-[11px] tabular-nums"
                    style={{
                      color: t.status === 'running' ? accent.text : 'rgb(var(--ink-ghost))',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {statusText}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeTimer(t.id)
                  }}
                  aria-label={`Remove ${displayName}`}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-ink-ghost opacity-0 transition-[opacity,color] duration-150 group-hover:opacity-100 focus-visible:opacity-100"
                  style={{ color: undefined }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'rgb(var(--error-solid))' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '' }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      <div className="mt-auto border-t border-surface-border px-4 py-2 text-[10px] text-ink-ghost">
        Double-click to rename · Click to focus
      </div>
    </aside>
  )
}

function defaultTimerName(t: TimerState, index: number): string {
  const base = modeLabelFor(t.mode)
  return index === 0 ? base : `${base} ${index + 1}`
}

function shortStatusFor(t: TimerState): string {
  if (t.status === 'running' || t.status === 'paused') {
    const remaining =
      t.mode === 'stopwatch' ? 0 : computeRemaining(t)
    if (t.mode === 'stopwatch') return `${t.status === 'paused' ? 'Paused · ' : ''}Stopwatch`
    const label = phaseLabelFor(t)
    const prefix = t.status === 'paused' ? 'Paused · ' : ''
    return `${prefix}${formatTime(remaining)} · ${label}`
  }
  if (t.status === 'completed') return 'Complete'
  // idle
  if (t.mode === 'countdown') return formatTime(t.countdownConfig.durationMs)
  if (t.mode === 'focus') return `${Math.round(t.focusConfig.workMs / 60_000)} min focus`
  if (t.mode === 'interval') return `${t.intervalConfig.rounds} rounds`
  return 'Stopwatch'
}
