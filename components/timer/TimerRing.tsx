'use client'

import type { ModeAccent } from '@/lib/timer'
import { cn } from '@/lib/utils'

interface TimerRingProps {
  /** 0..1 */
  progress: number
  accent: ModeAccent
  /** Diameter in px. Default 280. */
  size?: number
  /** Ring stroke width. Default 6. */
  strokeWidth?: number
  /** Faint breathing halo behind the ring — only active while running. */
  halo?: boolean
  /** Filled-out celebration state. */
  completed?: boolean
  children?: React.ReactNode
  className?: string
}

/**
 * Luxury SVG progress ring with rounded caps, brand-aware color, and
 * optional breathing halo. Progress eases smoothly via CSS transition.
 * Reduced-motion disables halo pulse + stroke tween.
 */
export function TimerRing({
  progress,
  accent,
  size = 280,
  strokeWidth = 6,
  halo = false,
  completed = false,
  children,
  className,
}: TimerRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(1, progress))
  const dashOffset = completed ? 0 : circumference * (1 - clamped)

  return (
    <div
      className={cn('relative grid place-items-center', className)}
      style={{ width: size, height: size }}
    >
      {halo && (
        <span
          aria-hidden
          className="noor-timer-halo absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle at center, ${accent.stroke}33 0%, transparent 60%)`,
          }}
        />
      )}

      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="relative -rotate-90"
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={accent.track}
          strokeWidth={strokeWidth}
          opacity={0.7}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={accent.stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="noor-timer-progress"
          style={{
            transition: 'stroke-dashoffset 360ms cubic-bezier(0.22, 0.61, 0.36, 1)',
            filter: completed ? `drop-shadow(0 0 12px ${accent.stroke}88)` : undefined,
          }}
        />
      </svg>

      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  )
}
