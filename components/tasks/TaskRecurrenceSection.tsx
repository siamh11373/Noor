'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  defaultRecurrenceForPreset,
  formatRecurrenceSummary,
  hasActiveRecurrence,
} from '@/lib/task-recurrence'
import { RecurrenceEndDatePicker } from '@/components/tasks/RecurrenceEndDatePicker'
import { cn } from '@/lib/utils'
import type { CalendarTask, CalendarTaskRecurrence, RecurrenceFrequencyUnit, RecurrencePresetKind } from '@/types'

const MENU_PRESETS: Array<{ key: RecurrencePresetKind | 'off'; label: string }> = [
  { key: 'off', label: 'Does not repeat' },
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly', label: 'Yearly' },
  { key: 'custom', label: 'Custom…' },
]

const DOW_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function mergeRecurrence(base: CalendarTaskRecurrence | undefined, patch: Partial<CalendarTaskRecurrence>): CalendarTaskRecurrence {
  const b = base ?? {
    preset: 'custom' as const,
    interval: 1,
    frequencyUnit: 'week' as const,
    byWeekday: [],
    end: 'never' as const,
  }
  return { ...b, ...patch }
}

export function TaskRecurrenceSection({
  task,
  anchorDateKey,
  onPatch,
}: {
  task: CalendarTask
  anchorDateKey: string
  onPatch: (patch: Partial<Omit<CalendarTask, 'id'>>) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function shouldIgnoreClose(target: EventTarget | null) {
      const el = target as HTMLElement | null
      if (!el?.closest) return false
      if (el.closest('[data-task-block]') || el.closest('[data-task-day-grid]')) return true
      return false
    }
    function onDoc(e: PointerEvent) {
      if (shouldIgnoreClose(e.target)) return
      const el = wrapRef.current
      if (el && !el.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('pointerdown', onDoc)
    return () => document.removeEventListener('pointerdown', onDoc)
  }, [menuOpen])

  const summary = formatRecurrenceSummary(task, anchorDateKey)

  const applyPreset = useCallback(
    (key: RecurrencePresetKind | 'off') => {
      if (key === 'off') {
        onPatch({ recurrence: undefined })
        setMenuOpen(false)
        return
      }
      const next = defaultRecurrenceForPreset(key, anchorDateKey)
      if (next) onPatch({ recurrence: next })
      setMenuOpen(false)
    },
    [anchorDateKey, onPatch],
  )

  const r = task.recurrence
  const showCustom = r?.preset === 'custom'

  const patchRec = useCallback(
    (patch: Partial<CalendarTaskRecurrence>) => {
      onPatch({ recurrence: mergeRecurrence(r, patch) })
    },
    [onPatch, r],
  )

  const toggleWeekday = (dow: number) => {
    if (!r || r.preset !== 'custom' || r.frequencyUnit !== 'week') return
    const set = new Set(r.byWeekday ?? [])
    if (set.has(dow)) set.delete(dow)
    else set.add(dow)
    const next = Array.from(set).sort((a, b) => a - b)
    patchRec({ byWeekday: next.length ? next : [dow] })
  }

  return (
    <div className="flex gap-3 text-[13px] text-ink-secondary">
      <span className="mt-0.5 shrink-0 text-ink-ghost" aria-hidden>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 5a3 3 0 1 0-3-3M12 5v2M12 5a3 3 0 1 1 3-3M17 12h2M5 12H3m13.364 5.364 1.414 1.414M6.222 6.222 4.808 4.808m11.556 11.556 1.414 1.414M18.364 6.364l1.414-1.414M6.222 17.778l-1.414 1.414"
            stroke="currentColor"
            strokeWidth="1.35"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <div ref={wrapRef} className="relative min-w-0 flex-1">
        <label className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wider text-ink-ghost">Repeat</label>
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className={cn(
            'input-base flex w-full items-center justify-between gap-2 text-left text-[12px] font-medium text-ink-primary',
            menuOpen && 'ring-1 ring-brand-400/35',
          )}
          aria-expanded={menuOpen}
          aria-haspopup="listbox"
        >
          <span className="min-w-0 truncate">{summary}</span>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 text-ink-muted">
            <path d="M3.5 5.25L7 8.75l3.5-3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {menuOpen && (
          <ul
            role="listbox"
            className="absolute left-0 right-0 top-full z-[80] mt-1 max-h-[240px] overflow-auto rounded-xl border border-surface-border bg-surface-card py-1 shadow-[0_12px_32px_rgba(0,0,0,0.12)]"
          >
            {MENU_PRESETS.map((opt) => (
              <li key={opt.key}>
                <button
                  type="button"
                  role="option"
                  onClick={() => applyPreset(opt.key)}
                  className={cn(
                    'flex w-full px-3 py-2 text-left text-[12px] transition-colors hover:bg-surface-muted/80',
                    opt.key === 'off' && !hasActiveRecurrence(task) && 'bg-brand-400/8 font-medium text-brand-600',
                    opt.key !== 'off' && task.recurrence?.preset === opt.key && 'bg-brand-400/8 font-medium text-brand-600',
                  )}
                >
                  {opt.label}
                </button>
              </li>
            ))}
          </ul>
        )}

        {showCustom && r && (
          <div className="mt-3 space-y-4 rounded-xl border border-surface-border bg-surface-muted/20 p-3 pb-4">
            <div className="flex flex-wrap items-end gap-2">
              <span className="text-[11px] font-medium text-ink-muted">Every</span>
              <input
                type="number"
                min={1}
                max={99}
                value={r.interval}
                onChange={(e) => {
                  const n = Math.max(1, Math.min(99, Number(e.target.value) || 1))
                  patchRec({ interval: n })
                }}
                className="input-base w-14 text-center text-[12px]"
              />
              <select
                value={r.frequencyUnit}
                onChange={(e) => {
                  const frequencyUnit = e.target.value as RecurrenceFrequencyUnit
                  const patch: Partial<CalendarTaskRecurrence> = { frequencyUnit }
                  if (frequencyUnit === 'week' && (!r.byWeekday?.length)) {
                    const anchor = new Date(`${anchorDateKey}T12:00:00`)
                    patch.byWeekday = [anchor.getDay()]
                  }
                  patchRec(patch)
                }}
                className="input-base min-w-[5.5rem] flex-1 text-[12px]"
              >
                <option value="day">day(s)</option>
                <option value="week">week(s)</option>
                <option value="month">month(s)</option>
                <option value="year">year(s)</option>
              </select>
            </div>

            {r.frequencyUnit === 'week' && (
              <div>
                <p className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-ink-ghost">On</p>
                <div className="flex flex-wrap gap-1.5">
                  {DOW_LABELS.map((label, i) => {
                    const active = (r.byWeekday ?? []).includes(i)
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => toggleWeekday(i)}
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold transition-colors',
                          active ? 'bg-brand-400 text-white' : 'bg-surface-card text-ink-muted ring-1 ring-surface-border hover:text-ink-secondary',
                        )}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div>
              <p className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-ink-ghost">Ends</p>
              <div className="space-y-3">
                <label className="flex cursor-pointer items-center gap-2.5 text-[12px]">
                  <input
                    type="radio"
                    name={`rec-end-${task.id}`}
                    checked={r.end === 'never'}
                    onChange={() => patchRec({ end: 'never', untilDate: undefined })}
                    className="h-4 w-4 accent-brand-500"
                  />
                  <span className="text-ink-secondary">Never</span>
                </label>
                <div className="space-y-2">
                  <label className="flex cursor-pointer items-center gap-2.5 text-[12px]">
                    <input
                      type="radio"
                      name={`rec-end-${task.id}`}
                      checked={r.end === 'until_date'}
                      onChange={() => {
                        const patch: Partial<CalendarTaskRecurrence> = { end: 'until_date' }
                        if (!r.untilDate) {
                          const d = new Date(`${anchorDateKey}T12:00:00`)
                          d.setMonth(d.getMonth() + 3)
                          patch.untilDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
                        }
                        patchRec(patch)
                      }}
                      className="h-4 w-4 accent-brand-500"
                    />
                    <span className="text-ink-secondary">On date</span>
                  </label>
                  <div className="pl-7">
                    <RecurrenceEndDatePicker
                      value={r.untilDate}
                      disabled={r.end !== 'until_date'}
                      onChange={(iso) => patchRec({ untilDate: iso })}
                      onClearToNever={() => patchRec({ end: 'never', untilDate: undefined })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="flex cursor-pointer items-center gap-2.5 text-[12px]">
                    <input
                      type="radio"
                      name={`rec-end-${task.id}`}
                      checked={r.end === 'after_count'}
                      onChange={() =>
                        patchRec({
                          end: 'after_count',
                          afterCount: r.afterCount != null && r.afterCount >= 1 ? r.afterCount : 10,
                        })
                      }
                      className="h-4 w-4 accent-brand-500"
                    />
                    <span className="text-ink-secondary">After</span>
                  </label>
                  <div className="flex flex-wrap items-center gap-2 pl-7">
                    <input
                      type="number"
                      min={1}
                      max={999}
                      disabled={r.end !== 'after_count'}
                      value={r.afterCount ?? 10}
                      onChange={(e) => patchRec({ afterCount: Math.max(1, Math.min(999, Number(e.target.value) || 1)) })}
                      className="input-base w-16 text-center text-[12px] disabled:opacity-45"
                    />
                    <span className="text-[11px] text-ink-muted">occurrences</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
