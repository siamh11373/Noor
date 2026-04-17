'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSalahStore } from '@/lib/store'

const MAX_CHARS = 2000
const DEBOUNCE_MS = 450

type SaveStatus = 'idle' | 'saving' | 'saved'

export function TasksMonthFocusCard({ monthKey, monthLabel }: { monthKey: string; monthLabel: string }) {
  const setTaskMonthNote = useSalahStore((s) => s.setTaskMonthNote)

  const [draft, setDraft] = useState(() => useSalahStore.getState().taskMonthNotes[monthKey] ?? '')
  const draftRef = useRef(draft)
  /** Calendar month the current `draft` belongs to (flush to this key before switching). */
  const activeMonthRef = useRef(monthKey)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')

  useEffect(() => {
    draftRef.current = draft
  }, [draft])

  const persist = useCallback(
    (key: string, body: string) => {
      setTaskMonthNote(key, body)
      setSaveStatus('saved')
    },
    [setTaskMonthNote],
  )

  const clearDebounce = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
  }

  const schedulePersist = useCallback(() => {
    setSaveStatus('saving')
    clearDebounce()
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null
      persist(activeMonthRef.current, draftRef.current)
    }, DEBOUNCE_MS)
  }, [persist])

  useEffect(() => {
    if (activeMonthRef.current === monthKey) {
      return
    }
    clearDebounce()
    persist(activeMonthRef.current, draftRef.current)
    const next = useSalahStore.getState().taskMonthNotes[monthKey] ?? ''
    activeMonthRef.current = monthKey
    draftRef.current = next
    setDraft(next)
    setSaveStatus('idle')
  }, [monthKey, persist])

  useEffect(() => {
    return () => {
      clearDebounce()
      persist(activeMonthRef.current, draftRef.current)
    }
  }, [persist])

  return (
    <div className="rounded-xl border border-surface-border bg-surface-raised/80 px-3 py-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-ghost">Month focus</p>
        {saveStatus === 'saving' ? (
          <span className="text-[10px] text-ink-muted">Saving…</span>
        ) : saveStatus === 'saved' ? (
          <span className="text-[10px] text-ink-muted">Saved</span>
        ) : null}
      </div>
      <p className="mt-1 text-[11px] text-ink-muted">{monthLabel}</p>
      <label htmlFor={`tasks-month-focus-${monthKey}`} className="sr-only">
        Notes and intentions for {monthLabel}
      </label>
      <textarea
        id={`tasks-month-focus-${monthKey}`}
        value={draft}
        onChange={(e) => {
          const next = e.target.value.slice(0, MAX_CHARS)
          setDraft(next)
          draftRef.current = next
          schedulePersist()
        }}
        onBlur={() => {
          clearDebounce()
          persist(activeMonthRef.current, draftRef.current)
        }}
        placeholder="A few lines for this month — rhythm, priorities, what matters."
        rows={4}
        className="input-base mt-2 min-h-[96px] w-full resize-y text-[12px] leading-relaxed text-ink-primary placeholder:text-ink-muted"
      />
    </div>
  )
}
