import type { SVGProps } from 'react'
import type { PrayerName } from '@/types'

/**
 * Line-art prayer pictograms inspired by the in-app reference set: a
 * unified vocabulary (sun, horizon, rays, crescent + star) with a clear
 * time-of-day arc so five circles can be read at a glance without their
 * labels.
 *
 * All icons share a 24×24 viewBox, currentColor strokes, fill="none",
 * round joins / caps, and a stroke width of 1.5 — drop them into any
 * sized container with `w-* h-*` and they'll scale crisply.
 */

type Props = SVGProps<SVGSVGElement> & { prayer: PrayerName }

export function PrayerIcon({ prayer, ...rest }: Props) {
  const common = {
    width: 24,
    height: 24,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    ...rest,
  } as const

  switch (prayer) {
    case 'fajr':
      return (
        <svg {...common}>
          {/* Horizon */}
          <path d="M4 17h16" />
          {/* Half sun rising */}
          <path d="M7.5 17a4.5 4.5 0 0 1 9 0" />
          {/* Three symmetric up-rays — dawn */}
          <path d="M12 10.5v-2.5" />
          <path d="m9.4 11.4-1.7-1.7" />
          <path d="m14.6 11.4 1.7-1.7" />
        </svg>
      )

    case 'dhuhr':
      return (
        <svg {...common}>
          {/* Full sun, peak of day */}
          <circle cx="12" cy="12" r="3.6" />
          <path d="M12 4.5v-1.5" />
          <path d="M12 21v-1.5" />
          <path d="M4.5 12h-1.5" />
          <path d="M21 12h-1.5" />
          <path d="m6.7 6.7-1.1-1.1" />
          <path d="m18.4 18.4-1.1-1.1" />
          <path d="m6.7 17.3-1.1 1.1" />
          <path d="m18.4 5.6-1.1 1.1" />
        </svg>
      )

    case 'asr':
      return (
        <svg {...common}>
          {/* Sun lowering — full disc but with rays only on sides */}
          <circle cx="12" cy="13" r="3.4" />
          <path d="M3.5 13H5" />
          <path d="M19 13h1.5" />
          <path d="m6.5 7.5 1 1" />
          <path d="m17.5 7.5-1 1" />
          <path d="m6.5 18.5 1-1" />
          <path d="m17.5 18.5-1-1" />
        </svg>
      )

    case 'maghrib':
      return (
        <svg {...common}>
          {/* Horizon */}
          <path d="M4 17h16" />
          {/* Half sun on the horizon */}
          <path d="M7.5 17a4.5 4.5 0 0 1 9 0" />
          {/* Down-arrow above the sun — sun setting */}
          <path d="M12 7v3.5" />
          <path d="m10.4 9 1.6 1.6L13.6 9" />
        </svg>
      )

    case 'isha':
      return (
        <svg {...common}>
          {/* Crescent moon */}
          <path d="M16.8 14.4A6.5 6.5 0 1 1 9.6 4.7a5.2 5.2 0 0 0 7.2 9.7Z" />
          {/* 4-point star sparkle */}
          <path d="M18.5 6.5v3" />
          <path d="M17 8h3" />
        </svg>
      )
  }
}
