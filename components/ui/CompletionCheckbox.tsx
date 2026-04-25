'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { useCompletionSound } from '@/hooks/useCompletionSound'

// 6 particles evenly distributed at 20px radius (60° apart)
const PARTICLES: { dx: number; dy: number }[] = [
  { dx:  20,    dy:  0     },  // 0°
  { dx:  10,    dy:  17.32 },  // 60°
  { dx: -10,    dy:  17.32 },  // 120°
  { dx: -20,    dy:  0     },  // 180°
  { dx: -10,    dy: -17.32 },  // 240°
  { dx:  10,    dy: -17.32 },  // 300°
]

const SIZE_MAP = {
  xs: { outer: 'h-3.5 w-3.5', icon: 7,  viewBox: '0 0 8 8',   path: 'M1.5 4l1.5 1.5 3-3', sw: '1.3' },
  sm: { outer: 'h-4 w-4',     icon: 8,  viewBox: '0 0 8 8',   path: 'M1.5 4l1.5 1.5 3-3', sw: '1.3' },
  md: { outer: 'h-5 w-5',     icon: 10, viewBox: '0 0 10 10', path: 'M2 5l2 2 4-4',        sw: '1.5' },
} as const

export function CompletionCheckbox({
  checked,
  onChange,
  size = 'md',
  colorClass = 'border-faith bg-faith',
  className,
  'aria-label': ariaLabel,
  onPointerDown,
}: {
  checked: boolean
  onChange: () => void
  /** 'xs' = 14px (calendar grid week), 'sm' = 16px (week board), 'md' = 20px (faith list) */
  size?: 'xs' | 'sm' | 'md'
  /** Tailwind classes for filled state, e.g. 'border-faith bg-faith' */
  colorClass?: string
  className?: string
  'aria-label'?: string
  onPointerDown?: React.PointerEventHandler
}) {
  const [justCompleted, setJustCompleted] = useState(false)
  const playSound = useCompletionSound()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { outer, viewBox, path, sw } = SIZE_MAP[size]

  function handleToggle() {
    if (!checked) {
      setJustCompleted(true)
      playSound()
      timerRef.current = setTimeout(() => setJustCompleted(false), 620)
    }
    onChange()
  }

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  return (
    <span
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      tabIndex={0}
      onClick={(e) => { e.stopPropagation(); handleToggle() }}
      onPointerDown={onPointerDown}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleToggle()
        }
      }}
      style={{ overflow: 'visible' }}
      className={cn(
        'relative flex shrink-0 cursor-pointer items-center justify-center rounded-full border-[1.5px]',
        outer,
        checked ? colorClass : 'border-current opacity-40',
        justCompleted && 'noor-completing',
        className,
      )}
    >
      {/* Expanding ripple ring */}
      {justCompleted && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full noor-check-ripple"
          style={{ border: '1.5px solid rgb(var(--faith))', transformOrigin: 'center' }}
        />
      )}

      {/* 6 particle dots bursting outward */}
      {justCompleted && PARTICLES.map((p, i) => (
        <span
          key={i}
          aria-hidden
          className="pointer-events-none noor-particle-fly"
          style={{
            '--dx': `${p.dx}px`,
            '--dy': `${p.dy}px`,
            top: '50%',
            left: '50%',
            width: 4,
            height: 4,
            marginTop: -2,
            marginLeft: -2,
            borderRadius: '50%',
            background: 'rgb(var(--faith))',
          } as React.CSSProperties}
        />
      ))}

      {/* Checkmark — draws itself in on completion */}
      {checked && (
        <svg
          width={SIZE_MAP[size].icon}
          height={SIZE_MAP[size].icon}
          viewBox={viewBox}
          fill="none"
          aria-hidden
        >
          <path
            d={path}
            stroke="white"
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={12}
            strokeDasharray={12}
            className={justCompleted ? 'noor-check-draw' : undefined}
          />
        </svg>
      )}
    </span>
  )
}
