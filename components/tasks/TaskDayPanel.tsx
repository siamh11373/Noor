'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { formatTimeDisplay, minutesToTime, timeToMinutes } from '@/lib/tasks-calendar'
import { cn } from '@/lib/utils'
import { TaskRecurrenceSection } from '@/components/tasks/TaskRecurrenceSection'
import type { CalendarTask } from '@/types'

const EMPTY_TITLE = '(No title)'

/** e.g. 195 → "3h 15m", 60 → "1h", 45 → "45 min" */
function formatDurationLabel(totalMinutes: number): string {
  if (totalMinutes <= 0) return '0 min'
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function endTimeLabel(startTime: string, durationMin: number): string {
  const endMins = timeToMinutes(startTime) + durationMin
  return formatTimeDisplay(minutesToTime(endMins))
}

const VIEW_MARGIN = 12
const ANCHOR_GAP = 10

/** Place fixed panel beside task block; prefer right, then left, then shift vertically to reduce overlap. */
function computePanelPlacement(rect: DOMRect, panelW: number, panelH: number): { left: number; top: number } {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const safeW = Math.min(panelW, vw - 2 * VIEW_MARGIN)
  const safeH = Math.min(panelH, vh - 2 * VIEW_MARGIN)

  const roomRight = vw - VIEW_MARGIN - (rect.right + ANCHOR_GAP)
  const roomLeft = rect.left - ANCHOR_GAP - VIEW_MARGIN

  let left: number
  if (roomRight >= safeW) {
    left = rect.right + ANCHOR_GAP
  } else if (roomLeft >= safeW) {
    left = rect.left - ANCHOR_GAP - safeW
  } else {
    left = Math.max(
      VIEW_MARGIN,
      Math.min(rect.left + rect.width / 2 - safeW / 2, vw - safeW - VIEW_MARGIN),
    )
  }

  let top = Math.max(VIEW_MARGIN, Math.min(rect.top, vh - safeH - VIEW_MARGIN))

  const overlaps =
    left < rect.right + 4 &&
    left + safeW > rect.left - 4 &&
    top < rect.bottom + 4 &&
    top + safeH > rect.top - 4

  if (overlaps) {
    const below = rect.bottom + ANCHOR_GAP
    const above = rect.top - ANCHOR_GAP - safeH
    if (below + safeH <= vh - VIEW_MARGIN) {
      top = below
    } else if (above >= VIEW_MARGIN) {
      top = above
    }
  }

  left = Math.max(VIEW_MARGIN, Math.min(left, vw - safeW - VIEW_MARGIN))
  top = Math.max(VIEW_MARGIN, Math.min(top, vh - safeH - VIEW_MARGIN))
  return { left, top }
}

export function TaskDayPanel({
  task,
  weekdayDateLabel,
  recurrenceAnchorDateKey,
  onPatch,
  onDelete,
  onClose,
}: {
  task: CalendarTask
  weekdayDateLabel: string
  /** Stored series anchor (master `date`); used for recurrence defaults & summaries. */
  recurrenceAnchorDateKey: string
  onPatch: (patch: Partial<Omit<CalendarTask, 'id'>>) => void
  onDelete: () => void
  onClose: () => void
}) {
  const [title, setTitle] = useState(() => (task.title === EMPTY_TITLE ? '' : task.title))
  const [note, setNote] = useState(task.note ?? '')
  const rootRef = useRef<HTMLDivElement>(null)
  const [fixedPos, setFixedPos] = useState<{ left: number; top: number } | null>(null)
  const [entered, setEntered] = useState(false)
  const [exiting, setExiting] = useState(false)

  const syncPanelPosition = useCallback(() => {
    const root = rootRef.current
    const anchor = document.querySelector<HTMLElement>(
      `[data-task-panel-anchor="${String(task.id).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"]`,
    )
    if (!root || !anchor) {
      setFixedPos(null)
      return
    }
    const rect = anchor.getBoundingClientRect()
    if (rect.width < 2 && rect.height < 2) {
      setFixedPos(null)
      return
    }
    const w = root.offsetWidth || Math.min(380, window.innerWidth - 24)
    const h = root.offsetHeight || 420
    setFixedPos(computePanelPlacement(rect, w, h))
  }, [task.id])

  useEffect(() => {
    setTitle(task.title === EMPTY_TITLE ? '' : task.title)
    setNote(task.note ?? '')
  }, [task.id, task.title, task.note])

  /** Fade in when this panel instance mounts (new task / key), without tying to scroll-driven position updates. */
  useEffect(() => {
    setEntered(false)
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setEntered(true))
    })
    return () => cancelAnimationFrame(id)
  }, [task.id])

  useLayoutEffect(() => {
    syncPanelPosition()
    const id = requestAnimationFrame(() => syncPanelPosition())
    return () => cancelAnimationFrame(id)
  }, [syncPanelPosition, task.date, task.startTime, task.duration, task.recurrence])

  useEffect(() => {
    window.addEventListener('resize', syncPanelPosition)
    window.addEventListener('scroll', syncPanelPosition, true)
    return () => {
      window.removeEventListener('resize', syncPanelPosition)
      window.removeEventListener('scroll', syncPanelPosition, true)
    }
  }, [syncPanelPosition])

  useEffect(() => {
    const root = rootRef.current
    if (!root || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => syncPanelPosition())
    ro.observe(root)
    return () => ro.disconnect()
  }, [syncPanelPosition])

  const flushTitleNote = useCallback(() => {
    const trimmed = title.trim()
    onPatch({
      title: trimmed.length ? trimmed : EMPTY_TITLE,
      note: note.trim() || undefined,
    })
  }, [title, note, onPatch])

  const FADE_MS = 220

  const requestClose = useCallback(() => {
    if (exiting) return
    setExiting(true)
    flushTitleNote()
    window.setTimeout(() => {
      onClose()
    }, FADE_MS)
  }, [exiting, flushTitleNote, onClose])

  const requestDelete = useCallback(() => {
    if (exiting) return
    setExiting(true)
    flushTitleNote()
    window.setTimeout(() => {
      onDelete()
    }, FADE_MS)
  }, [exiting, flushTitleNote, onDelete])

  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      const t = e.target as HTMLElement
      if (t.closest('[data-task-day-grid]')) return
      if (t.closest('[data-recurrence-date-popover]')) return
      if (rootRef.current && !rootRef.current.contains(t)) {
        requestClose()
      }
    }
    document.addEventListener('mousedown', onDocDown)
    return () => document.removeEventListener('mousedown', onDocDown)
  }, [requestClose])

  const rangeLine = `${weekdayDateLabel} ${formatTimeDisplay(task.startTime)} – ${endTimeLabel(task.startTime, task.duration)}`

  return (
    <div
      ref={rootRef}
      data-task-day-panel
      style={fixedPos ? { left: fixedPos.left, top: fixedPos.top } : undefined}
      className={cn(
        'fixed z-[60] flex w-[min(380px,calc(100vw-1.5rem))] flex-col rounded-2xl border border-surface-border bg-surface-card',
        'shadow-[0_8px_40px_rgba(0,0,0,0.12)] max-h-[min(620px,calc(100vh-96px))] overflow-hidden',
        'transition-opacity duration-300 ease-out motion-reduce:transition-none',
        entered && !exiting ? 'opacity-100' : 'opacity-0',
        entered && !exiting ? 'pointer-events-auto' : 'pointer-events-none',
        !fixedPos && 'right-3 top-[88px]',
      )}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-surface-border px-3 py-2">
        <span className="text-ink-ghost select-none" aria-hidden>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="opacity-50">
            <path d="M4 8h16M4 16h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </span>
        <button
          type="button"
          onClick={requestClose}
          className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-muted hover:text-ink-primary"
          aria-label="Close panel"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 4l8 8M12 4L4 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 pb-5">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={flushTitleNote}
          placeholder="Add title"
          className="w-full border-0 border-b border-brand-400/40 bg-transparent pb-1.5 text-[20px] font-medium text-ink-primary placeholder:text-ink-ghost focus:border-brand-400 focus:outline-none focus:ring-0"
        />

        <div className="flex flex-wrap gap-1.5">
          {(['faith', 'career', 'fitness', 'family'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPatch({ pillar: p })}
              className={cn(
                'rounded-full px-3 py-1 text-[11px] font-semibold capitalize transition-colors',
                task.pillar === p ? 'bg-brand-400/15 text-brand-500' : 'bg-surface-muted text-ink-muted hover:text-ink-secondary',
              )}
            >
              {p === 'career' ? 'Tasks' : p}
            </button>
          ))}
        </div>

        <div className="flex gap-3 text-[13px] text-ink-secondary">
          <span className="mt-0.5 shrink-0 text-ink-ghost" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.4" />
              <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </span>
          <div>
            <p className="font-medium text-ink-primary">{rangeLine}</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <label className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wider text-ink-ghost">Start</label>
                <input
                  type="time"
                  value={task.startTime}
                  onChange={(e) => onPatch({ startTime: e.target.value })}
                  className="input-base w-full text-[12px]"
                />
              </div>
              <div>
                <label className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wider text-ink-ghost">Duration</label>
                <select
                  value={task.duration}
                  onChange={(e) => onPatch({ duration: Number(e.target.value) })}
                  className="input-base w-full text-[12px]"
                >
                  {![15, 30, 45, 60, 90, 120, 180].includes(task.duration) && (
                    <option value={task.duration}>{formatDurationLabel(task.duration)}</option>
                  )}
                  <option value={15}>{formatDurationLabel(15)}</option>
                  <option value={30}>{formatDurationLabel(30)}</option>
                  <option value={45}>{formatDurationLabel(45)}</option>
                  <option value={60}>{formatDurationLabel(60)}</option>
                  <option value={90}>{formatDurationLabel(90)}</option>
                  <option value={120}>{formatDurationLabel(120)}</option>
                  <option value={180}>{formatDurationLabel(180)}</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <TaskRecurrenceSection task={task} anchorDateKey={recurrenceAnchorDateKey} onPatch={onPatch} />

        <div className="flex gap-3">
          <span className="mt-1 shrink-0 text-ink-ghost" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M4 6h16M4 12h10M4 18h14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => onPatch({ note: note.trim() || undefined })}
            placeholder="Add description"
            rows={3}
            className="input-base min-h-[88px] flex-1 resize-y text-[13px]"
          />
        </div>
      </div>

      <div className="mt-auto flex shrink-0 items-center justify-between gap-2 border-t border-surface-border px-4 py-3">
        <button type="button" onClick={requestDelete} className="text-[12px] font-medium text-fitness-text hover:underline">
          Delete
        </button>
        <button
          type="button"
          onClick={requestClose}
          className="btn-primary rounded-full px-5 py-2 text-[13px] font-semibold"
        >
          Save
        </button>
      </div>
    </div>
  )
}
