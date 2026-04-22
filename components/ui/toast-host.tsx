'use client'

import { useEffect } from 'react'
import { create } from 'zustand'
import { cn } from '@/lib/utils'

export type ToastTone = 'neutral' | 'success' | 'warning'

interface ToastItem {
  id: string
  message: string
  tone: ToastTone
  durationMs: number
  actionLabel?: string
  onAction?: () => void
}

interface ToastStore {
  items: ToastItem[]
  push: (toast: Omit<ToastItem, 'id'> & { id?: string }) => string
  dismiss: (id: string) => void
}

const useToastStore = create<ToastStore>((set) => ({
  items: [],
  push: (toast) => {
    const id = toast.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    set((s) => {
      // Replace any existing toast with same id (e.g. rapid undo/redo).
      const filtered = s.items.filter((t) => t.id !== id)
      return { items: [...filtered, { ...toast, id }] }
    })
    return id
  },
  dismiss: (id) => set((s) => ({ items: s.items.filter((t) => t.id !== id) })),
}))

/** Imperative API usable from non-React code paths. */
export const toast = {
  show(message: string, opts: Partial<Omit<ToastItem, 'id' | 'message'>> = {}): string {
    return useToastStore.getState().push({
      message,
      tone: opts.tone ?? 'neutral',
      durationMs: opts.durationMs ?? 2400,
      actionLabel: opts.actionLabel,
      onAction: opts.onAction,
    })
  },
  dismiss(id: string) {
    useToastStore.getState().dismiss(id)
  },
}

const TONE_CLASSES: Record<ToastTone, string> = {
  neutral: 'border-surface-border bg-surface-card text-ink-primary',
  success: 'border-faith-border bg-faith-light text-faith-text',
  warning: 'border-fitness-border bg-fitness-light text-fitness-text',
}

function ToastRow({ item }: { item: ToastItem }) {
  const dismiss = useToastStore((s) => s.dismiss)

  useEffect(() => {
    const timer = setTimeout(() => dismiss(item.id), item.durationMs)
    return () => clearTimeout(timer)
  }, [item.id, item.durationMs, dismiss])

  return (
    <div
      className={cn(
        'pointer-events-auto flex items-center gap-3 rounded-2xl border px-4 py-2.5 text-[13px] shadow-card',
        'animate-in fade-in slide-in-from-bottom-2 duration-200',
        TONE_CLASSES[item.tone]
      )}
      role="status"
      aria-live="polite"
    >
      <span className="flex-1">{item.message}</span>
      {item.actionLabel && item.onAction && (
        <button
          type="button"
          onClick={() => {
            item.onAction?.()
            dismiss(item.id)
          }}
          className="rounded-md px-2 py-0.5 text-[12px] font-medium underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-brand-300"
        >
          {item.actionLabel}
        </button>
      )}
      <button
        type="button"
        onClick={() => dismiss(item.id)}
        className="text-[12px] text-ink-ghost hover:text-ink-muted"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  )
}

export function ToastHost() {
  const items = useToastStore((s) => s.items)
  if (items.length === 0) return null

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex flex-col items-center gap-2 px-4"
      aria-live="polite"
    >
      {items.map((item) => (
        <ToastRow key={item.id} item={item} />
      ))}
    </div>
  )
}
