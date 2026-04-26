'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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

/** Place a fixed panel near an anchor rect while guaranteeing the entire
 *  panel stays inside the viewport (so the Save / Delete row at its bottom
 *  remains clickable even when the anchor is in the lower half of the
 *  screen). Tries multiple anchor-relative candidates in priority order and
 *  falls back to a bottom-pinned / centered placement when none fit beside
 *  the anchor.
 */
function computePanelPlacement(rect: DOMRect, panelW: number, panelH: number): { left: number; top: number } {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const M = VIEW_MARGIN
  const GAP = ANCHOR_GAP
  const w = Math.min(panelW, vw - 2 * M)
  const h = Math.min(panelH, vh - 2 * M)

  const clampLeft = (x: number) => Math.max(M, Math.min(x, vw - w - M))
  const clampTop = (y: number) => Math.max(M, Math.min(y, vh - h - M))

  type Candidate = { left: number; top: number; allowOverlap?: boolean }

  const anchorCenterX = rect.left + rect.width / 2

  const candidates: Candidate[] = []

  // 1. Right of anchor, top-aligned with the anchor (clamped vertically).
  if (rect.right + GAP + w <= vw - M) {
    candidates.push({ left: rect.right + GAP, top: clampTop(rect.top) })
  }

  // 2. Left of anchor, top-aligned with the anchor.
  if (rect.left - GAP - w >= M) {
    candidates.push({ left: rect.left - GAP - w, top: clampTop(rect.top) })
  }

  // 3. Above anchor, horizontally centered on the anchor.
  if (rect.top - GAP - h >= M) {
    candidates.push({ left: clampLeft(anchorCenterX - w / 2), top: rect.top - GAP - h })
  }

  // 4. Below anchor, horizontally centered on the anchor.
  if (rect.bottom + GAP + h <= vh - M) {
    candidates.push({ left: clampLeft(anchorCenterX - w / 2), top: rect.bottom + GAP })
  }

  // 5. Bottom-pinned fallback: stick to the bottom of the viewport, centered
  //    on the anchor horizontally. Always fully on-screen by construction.
  candidates.push({
    left: clampLeft(anchorCenterX - w / 2),
    top: vh - M - h,
    allowOverlap: true,
  })

  // 6. Vertical-center fallback (last resort).
  candidates.push({
    left: clampLeft(anchorCenterX - w / 2),
    top: clampTop((vh - h) / 2),
    allowOverlap: true,
  })

  const fitsViewport = (c: Candidate) =>
    c.left >= M - 0.5 &&
    c.left + w <= vw - M + 0.5 &&
    c.top >= M - 0.5 &&
    c.top + h <= vh - M + 0.5

  const overlapsAnchor = (c: Candidate) =>
    c.left < rect.right + 4 &&
    c.left + w > rect.left - 4 &&
    c.top < rect.bottom + 4 &&
    c.top + h > rect.top - 4

  // Pick the first candidate that fits the viewport and (unless explicitly
  // allowed) doesn't overlap the anchor.
  for (const c of candidates) {
    if (!fitsViewport(c)) continue
    if (overlapsAnchor(c) && !c.allowOverlap) continue
    return { left: c.left, top: c.top }
  }

  // As an absolute last resort, return the bottom-pinned candidate clamped
  // into the viewport. (`fitsViewport` should always have accepted it above
  // for any sane panel size, but be defensive.)
  const fallback = candidates[candidates.length - 2]!
  return { left: clampLeft(fallback.left), top: clampTop(fallback.top) }
}

export function TaskDayPanel({
  task,
  weekdayDateLabel,
  recurrenceAnchorDateKey,
  fallbackAnchorRect,
  onPatch,
  onDelete,
  onClose,
  onDirtyChange,
}: {
  task: CalendarTask
  weekdayDateLabel: string
  /** Stored series anchor (master `date`); used for recurrence defaults & summaries. */
  recurrenceAnchorDateKey: string
  /** When no rendered task chip exists yet (e.g. just-added from a month cell
   *  click), use this rect (typically the click target's bounding rect) to
   *  anchor the panel near where the user clicked. */
  fallbackAnchorRect?: DOMRect | null
  onPatch: (patch: Partial<Omit<CalendarTask, 'id'>>) => void
  onDelete: () => void
  onClose: () => void
  /** Notifies the page when the open task has any user-supplied content
   *  (title, description, or a user-driven patch). Used by the page to
   *  decide whether to discard or relocate the task on calendar clicks. */
  onDirtyChange?: (dirty: boolean) => void
}) {
  const [title, setTitle] = useState(() => (task.title === EMPTY_TITLE ? '' : task.title))
  const [note, setNote] = useState(task.note ?? '')
  /** True once the user has invoked any patch (pillar, time, duration,
   *  recurrence, etc.). Combined with non-empty title/note to decide if
   *  the open task is "dirty" — see `onDirtyChange`. Resets when `task.id`
   *  changes (the panel is reused for a different task). */
  const [dirtyFromPatch, setDirtyFromPatch] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const [fixedPos, setFixedPos] = useState<{ left: number; top: number } | null>(null)
  const [entered, setEntered] = useState(false)
  const [exiting, setExiting] = useState(false)
  // Defer portal rendering until after first client mount so SSR markup
  // (which has no `document`) and the client first render match.
  const [portalReady, setPortalReady] = useState(false)
  useEffect(() => {
    setPortalReady(true)
  }, [])

  const syncPanelPosition = useCallback(() => {
    const root = rootRef.current
    const anchor = document.querySelector<HTMLElement>(
      `[data-task-panel-anchor="${String(task.id).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"]`,
    )
    if (!root) {
      setFixedPos(null)
      return
    }
    let rect: DOMRect | null = anchor ? anchor.getBoundingClientRect() : null
    if (rect && rect.width < 2 && rect.height < 2) rect = null
    if (!rect && fallbackAnchorRect) rect = fallbackAnchorRect
    if (!rect) {
      setFixedPos(null)
      return
    }
    const w = root.offsetWidth || Math.min(380, window.innerWidth - 24)
    // Use the panel's CSS-derived max height as the initial fallback so the
    // first placement is computed against the worst-case (tallest) panel and
    // doesn't visibly jump once content paints.
    const h = root.offsetHeight || Math.min(620, window.innerHeight - 96)
    setFixedPos(computePanelPlacement(rect, w, h))
  }, [task.id, fallbackAnchorRect])

  useEffect(() => {
    setTitle(task.title === EMPTY_TITLE ? '' : task.title)
    setNote(task.note ?? '')
    setDirtyFromPatch(false)
  }, [task.id, task.title, task.note])

  /** Wrap every `onPatch` invocation so a patch always marks the panel
   *  dirty. Replaces direct `onPatch(...)` calls inside this component. */
  const markDirtyAndPatch = useCallback(
    (patch: Partial<Omit<CalendarTask, 'id'>>) => {
      setDirtyFromPatch(true)
      onPatch(patch)
    },
    [onPatch],
  )

  const isDirty = dirtyFromPatch || title.trim() !== '' || note.trim() !== ''
  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  /** Fade in when this panel instance mounts (new task / key), without tying to scroll-driven position updates. */
  useEffect(() => {
    setEntered(false)
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setEntered(true))
    })
    return () => cancelAnimationFrame(id)
  }, [task.id])

  useLayoutEffect(() => {
    // The first render returns null while waiting for `portalReady`, so the
    // ref isn't attached yet. Including `portalReady` in deps re-runs this
    // effect once the portal mounts and the ref becomes valid.
    if (!portalReady) return
    syncPanelPosition()
    const id = requestAnimationFrame(() => syncPanelPosition())
    return () => cancelAnimationFrame(id)
  }, [portalReady, syncPanelPosition, task.date, task.startTime, task.duration, task.recurrence])

  useEffect(() => {
    window.addEventListener('resize', syncPanelPosition)
    window.addEventListener('scroll', syncPanelPosition, true)
    return () => {
      window.removeEventListener('resize', syncPanelPosition)
      window.removeEventListener('scroll', syncPanelPosition, true)
    }
  }, [syncPanelPosition])

  useEffect(() => {
    if (!portalReady) return
    const root = rootRef.current
    if (!root || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => syncPanelPosition())
    ro.observe(root)
    return () => ro.disconnect()
  }, [portalReady, syncPanelPosition])

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

  // Outside-click dismissal lives on the page (`app/tasks/page.tsx`) so it can
  // distinguish calendar-surface clicks (which discard empty stubs / relocate
  // dirty tasks) from off-calendar clicks (which keep the panel open). The
  // panel itself only closes via X, Escape, the keyboard shortcuts below, or
  // explicit page-driven state changes.

  // Keyboard shortcuts while the panel is open:
  //   Enter        → save + close (if focus is in the description textarea, only
  //                  on Cmd/Ctrl+Enter so users can still add newlines).
  //   Escape       → close without delete.
  //   Backspace/Del → delete the task, but only when the user is *not* editing
  //                  text (i.e. focus is on the panel root, a button, or a
  //                  non-text control). This avoids hijacking normal text edits.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (exiting) return
      const root = rootRef.current
      if (!root) return
      const target = e.target as HTMLElement | null
      const inPanel = target ? root.contains(target) : false
      if (!inPanel) return

      const tag = target?.tagName
      const isTextField =
        tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable === true
      const isTextarea = tag === 'TEXTAREA'

      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        requestClose()
        return
      }

      if (e.key === 'Enter') {
        if (isTextarea && !(e.metaKey || e.ctrlKey)) return
        e.preventDefault()
        e.stopPropagation()
        requestClose()
        return
      }

      if (e.key === 'Backspace' || e.key === 'Delete') {
        // Allow normal editing when there's text to remove; if the title input
        // is focused but already empty, intercept and delete the task (Gmail
        // / Apple Notes pattern).
        if (isTextField) {
          const isTitleInput = tag === 'INPUT' && target === root.querySelector('input')
          const titleEmpty = isTitleInput && title.trim().length === 0
          if (!titleEmpty) return
        }
        e.preventDefault()
        e.stopPropagation()
        requestDelete()
      }
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [exiting, requestClose, requestDelete, title])

  const rangeLine = `${weekdayDateLabel} ${formatTimeDisplay(task.startTime)} – ${endTimeLabel(task.startTime, task.duration)}`

  const node = (
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
              onClick={() => markDirtyAndPatch({ pillar: p })}
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
                  onChange={(e) => markDirtyAndPatch({ startTime: e.target.value })}
                  className="input-base w-full text-[12px]"
                />
              </div>
              <div>
                <label className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wider text-ink-ghost">Duration</label>
                <select
                  value={task.duration}
                  onChange={(e) => markDirtyAndPatch({ duration: Number(e.target.value) })}
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

        <TaskRecurrenceSection task={task} anchorDateKey={recurrenceAnchorDateKey} onPatch={markDirtyAndPatch} />

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

  // Portal to <body> so position:fixed escapes the .route-transition
  // ancestor (which is a containing block for fixed descendants because it
  // has will-change: transform, filter and an active transform animation).
  // Without this, our viewport-based placement math gets applied relative to
  // the transformed container and the panel can overflow / clip.
  if (!portalReady || typeof document === 'undefined') return null
  return createPortal(node, document.body)
}
