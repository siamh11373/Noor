'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

/**
 * Premium full-viewport loading screen shown during auth + initial data
 * hydration. Designed around five loading-UX principles:
 *
 *   1. Occupied time (rotating status messages + animated glyph) feels shorter.
 *   2. Goal-gradient effect (progress rail sweeps left→right continuously).
 *   3. Reduced cognitive load — a skeleton of the real app underneath hints
 *      at layout so the real UI doesn't feel like a jump cut.
 *   4. Peak-end rule — calm fade-in, soft fade-out is handled by React
 *      unmount + Next page transitions.
 *   5. Trust on slow networks — after ~5s a soft line reassures the user
 *      instead of leaving them guessing; after ~12s we flag the connection.
 *
 * All animation lives in globals.css so it's style-pipeline consistent with
 * the rest of the app. Respects `prefers-reduced-motion`.
 */

const STATUS_MESSAGES = [
  'Greeting the day',
  'Gathering your intentions',
  'Aligning prayer times',
  'Weaving your week together',
  'Lighting your dashboard',
] as const

type StatusPhase = 'normal' | 'slow' | 'very-slow'

interface AppLoadingScreenProps {
  label?: string
}

export function AppLoadingScreen({ label }: AppLoadingScreenProps) {
  const [messageIndex, setMessageIndex] = useState(0)
  const [phase, setPhase] = useState<StatusPhase>('normal')

  useEffect(() => {
    const rotator = window.setInterval(() => {
      setMessageIndex((i) => (i + 1) % STATUS_MESSAGES.length)
    }, 2200)
    const slow = window.setTimeout(() => setPhase('slow'), 5000)
    const verySlow = window.setTimeout(() => setPhase('very-slow'), 12000)
    return () => {
      window.clearInterval(rotator)
      window.clearTimeout(slow)
      window.clearTimeout(verySlow)
    }
  }, [])

  const activeMessage = label ?? STATUS_MESSAGES[messageIndex]

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Loading: ${activeMessage}`}
      className="noor-loading-root relative flex min-h-screen items-center justify-center overflow-hidden bg-surface-bg"
    >
      <div aria-hidden className="noor-dawn-backdrop" />

      <div aria-hidden className="noor-motes">
        {Array.from({ length: 14 }).map((_, i) => (
          <span
            key={i}
            className="noor-mote"
            style={{ '--mote-i': i } as CSSProperties}
          />
        ))}
      </div>

      {/* Ghost skeleton of the real app so the real UI doesn't feel like a jump cut. */}
      <div aria-hidden className="noor-skeleton-layer">
        <div className="noor-skeleton-nav">
          <div className="noor-skeleton-logo" />
          <div className="noor-skeleton-tabs">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="noor-skeleton-tab" />
            ))}
          </div>
          <div className="noor-skeleton-avatar" />
        </div>
        <div className="noor-skeleton-body">
          <div className="noor-skeleton-card" />
          <div className="noor-skeleton-card" />
          <div className="noor-skeleton-card" />
        </div>
      </div>

      <div className="relative z-10 flex w-full max-w-md flex-col items-center px-6 text-center">
        <div className="noor-glyph-wrap">
          <span aria-hidden className="noor-glyph-halo" />
          <span aria-hidden className="noor-glyph-ring" />
          <Image
            src="/logo.png"
            alt=""
            width={96}
            height={96}
            priority
            className="relative z-10 h-20 w-20 rounded-full shadow-card"
            sizes="96px"
          />
        </div>

        <h1 className="mt-6 font-serif text-[30px] font-semibold tracking-tight text-ink-primary">
          Noor
        </h1>
        <p className="mt-1 text-[12px] uppercase tracking-[0.24em] text-ink-ghost">
          Light for your week
        </p>

        <div
          className="mt-9 h-[18px] overflow-hidden text-[13px] text-ink-secondary"
          aria-hidden={Boolean(label)}
        >
          <div
            key={`${activeMessage}-${messageIndex}`}
            className="noor-status-line"
          >
            {activeMessage}
          </div>
        </div>

        <div className="mt-5 w-full max-w-[220px]">
          <div className="noor-progress-track">
            <div className="noor-progress-bar" />
          </div>
        </div>

        <div
          className={cn(
            'mt-4 min-h-[16px] text-[12px] transition-opacity duration-500',
            phase === 'normal' ? 'opacity-0' : 'opacity-100',
          )}
          style={{
            color:
              phase === 'very-slow'
                ? 'rgb(var(--attention-text))'
                : 'rgb(var(--ink-ghost))',
          }}
        >
          {phase === 'slow' && 'Taking a breath — still loading'}
          {phase === 'very-slow' && 'Connection seems slow. Hang tight.'}
        </div>
      </div>
    </div>
  )
}
