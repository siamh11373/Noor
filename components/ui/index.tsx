'use client'

import { cn } from '@/lib/utils'
import { ringCircumference, ringOffset, scoreStrokeColor } from '@/lib/score'
export {
  CommandCenterGrid,
  DashboardPanel,
  DashboardShellGrid,
  EmptyStateCard,
  MetricCard,
  MetricGrid,
  PageHero,
  ProductSectionLabel,
} from '@/components/ui/dashboard'

// ─── SCORE RING ───────────────────────────────────────────────────────────────

interface ScoreRingProps {
  score: number
  size?: number
  strokeWidth?: number
  className?: string
}

export function ScoreRing({ score, size = 88, strokeWidth = 7, className }: ScoreRingProps) {
  const r = (size - strokeWidth * 2) / 2
  const circ = ringCircumference(r)
  const offset = ringOffset(score, r)
  const color = scoreStrokeColor(score)

  return (
    <div
      className={cn('relative flex-shrink-0', className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(-90deg)' }}
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--ring-track)"
          strokeWidth={strokeWidth}
        />
        {/* Fill */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.7s ease-out, stroke 0.4s' }}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[26px] font-bold text-ink-primary leading-none">{score}</span>
        <span className="text-[9px] uppercase tracking-widest text-ink-ghost mt-0.5">faith</span>
      </div>
    </div>
  )
}

// ─── PROGRESS BAR ─────────────────────────────────────────────────────────────

interface ProgressBarProps {
  value: number          // 0–100
  color?: string         // Tailwind bg class e.g. 'bg-brand-400'
  height?: string        // Tailwind h class e.g. 'h-1.5'
  className?: string
}

export function ProgressBar({
  value,
  color = 'bg-brand-400',
  height = 'h-1.5',
  className,
}: ProgressBarProps) {
  return (
    <div className={cn('w-full bg-surface-border rounded-full overflow-hidden', height, className)}>
      <div
        className={cn('h-full rounded-full transition-all duration-500', color)}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  )
}

// ─── BADGE ────────────────────────────────────────────────────────────────────

interface BadgeProps {
  children: React.ReactNode
  variant?: 'faith' | 'tasks' | 'fitness' | 'family' | 'brand' | 'neutral'
  className?: string
}

const BADGE_VARIANTS = {
  faith:   'bg-faith-light text-faith-text',
  tasks:   'bg-tasks-light text-tasks-text',
  fitness: 'bg-fitness-light text-fitness-text',
  family:  'bg-family-light text-family-text',
  brand:   'bg-brand-100 text-brand-600',
  neutral: 'bg-surface-muted text-ink-muted',
}

export function Badge({ children, variant = 'neutral', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center text-[9px] font-semibold px-2 py-0.5 rounded-full',
        BADGE_VARIANTS[variant],
        className
      )}
    >
      {children}
    </span>
  )
}

// ─── CARD ─────────────────────────────────────────────────────────────────────

interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export function Card({ children, className, onClick }: CardProps) {
  return (
    <div
      className={cn(
        'bg-surface-card rounded-card border border-surface-border',
        onClick && 'cursor-pointer hover:border-ink-ghost transition-colors',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

// ─── SECTION LABEL ────────────────────────────────────────────────────────────

export function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn('text-[10px] font-semibold uppercase tracking-widest text-ink-ghost mb-2.5', className)}>
      {children}
    </p>
  )
}

// ─── VOICE BUTTON ─────────────────────────────────────────────────────────────

interface VoiceButtonProps {
  label?: string
  hint?: string
  onClick?: () => void
  className?: string
}

export function VoiceButton({
  label = 'Add by voice',
  hint = 'Speak naturally...',
  onClick,
  className,
}: VoiceButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3',
        'bg-tasks-light border border-tasks-border rounded-xl',
        'cursor-pointer transition-all hover:shadow-card-hover active:scale-[.99]',
        className
      )}
    >
      {/* Mic icon */}
      <div className="w-9 h-9 rounded-full bg-tasks flex items-center justify-center flex-shrink-0">
        <svg width="14" height="16" viewBox="0 0 12 14" fill="none">
          <rect x="3" y="0" width="6" height="9" rx="3" fill="white" />
          <path d="M1 6.5C1 9.26 3.24 11.5 6 11.5s5-2.24 5-5" stroke="white" strokeWidth="1.2" strokeLinecap="round" fill="none" />
          <line x1="6" y1="11.5" x2="6" y2="13.5" stroke="white" strokeWidth="1.2" />
        </svg>
      </div>
      <div className="text-left">
        <div className="text-[13px] font-medium text-tasks-text">{label}</div>
        <div className="text-[11px] text-tasks-text/60">{hint}</div>
      </div>
    </button>
  )
}
