'use client'

import { useEffect, useState, useCallback } from 'react'
import type { PrayerTime } from '@/types'
import {
  computePrayerTimes,
  buildPrayerTimes,
  getNextPrayer,
  formatCountdown,
  minutesUntil,
} from '@/lib/prayers'
import { useSalahStore } from '@/lib/store'

// Warren, MI fallback — update once user sets their location
const FALLBACK = { lat: 42.5145, lng: -83.0146 }

export function usePrayerTimes() {
  const { settings, updateSettings } = useSalahStore()
  const [prayerTimes, setPrayerTimes] = useState<PrayerTime[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    let lat = settings.location.lat
    let lng = settings.location.lng

    // Request location if not stored
    if (lat == null || lng == null) {
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000 })
        )
        lat = pos.coords.latitude
        lng = pos.coords.longitude
        updateSettings({ location: { lat, lng, city: '' } })
      } catch {
        // Fall back to Warren, MI
        lat = FALLBACK.lat
        lng = FALLBACK.lng
      }
    }

    try {
      const raw = await computePrayerTimes(lat, lng, settings.madhab, settings.calcMethod)
      setPrayerTimes(buildPrayerTimes(raw))
    } catch {
      // SECURITY FIX: removed console.error(e) — logging the raw error object in the browser
      // console can expose internal library details or stack traces to end users.
      // The user-facing message below is sufficient.
      setError('Could not calculate prayer times')
    } finally {
      setLoading(false)
    }
  }, [settings.location.lat, settings.location.lng, settings.madhab, settings.calcMethod, updateSettings])

  useEffect(() => { load() }, [load])

  const nextPrayer = getNextPrayer(prayerTimes)
  const minutesUntilNext = nextPrayer ? minutesUntil(nextPrayer.time) : null
  const countdownLabel = minutesUntilNext !== null ? formatCountdown(minutesUntilNext) : null

  return { prayerTimes, nextPrayer, countdownLabel, loading, error, reload: load }
}
