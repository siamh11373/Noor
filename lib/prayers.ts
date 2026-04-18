import type { PrayerTime, PrayerName, Madhab, CalcMethod } from '@/types'

/** Warren, MI — matches usePrayerTimes when geolocation is unavailable or denied. */
export const DEFAULT_PRAYER_COORDS = { lat: 42.5145, lng: -83.0146 } as const

// Adhan.js is imported dynamically (client-only) because it uses browser APIs
// Use getPrayerTimes() from the hook, not directly.

export const PRAYER_META: Record<PrayerName, { displayName: string; icon: string; anchor: string }> = {
  fajr:    { displayName: 'Fajr',    icon: '🌙', anchor: 'Set your intention' },
  dhuhr:   { displayName: 'Dhuhr',   icon: '☀️', anchor: 'Career check-in' },
  asr:     { displayName: 'Asr',     icon: '🌤', anchor: 'Fitness log' },
  maghrib: { displayName: 'Maghrib', icon: '🌅', anchor: 'Family moment' },
  isha:    { displayName: 'Isha',    icon: '🌙', anchor: 'Reflect on the day' },
}

export const PRAYER_ORDER: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']

export function formatTime(date: Date | null): string {
  if (!date) return '--:--'
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

export function minutesUntil(date: Date | null): number | null {
  if (!date) return null
  return Math.round((date.getTime() - Date.now()) / 60000)
}

export function formatCountdown(minutes: number): string {
  if (minutes < 0) return 'passed'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

// Dynamically loads adhan (client only) and returns today's prayer times.
// Call this from the usePrayerTimes hook.
export async function computePrayerTimes(
  lat: number,
  lng: number,
  madhab: Madhab = 'hanafi',
  calcMethod: CalcMethod = 'ISNA',
  forDate?: Date
): Promise<Record<PrayerName, Date>> {
  const adhan: typeof import('adhan') = await import('adhan')

  const coords = new adhan.Coordinates(lat, lng)
  const date = forDate ?? new Date()

  const methodMap = {
    ISNA:      adhan.CalculationMethod.NorthAmerica,
    MWL:       adhan.CalculationMethod.MuslimWorldLeague,
    Egypt:     adhan.CalculationMethod.Egyptian,
    Karachi:   adhan.CalculationMethod.Karachi,
    UmmAlQura: adhan.CalculationMethod.UmmAlQura,
  } satisfies Record<CalcMethod, () => ReturnType<typeof adhan.CalculationMethod.NorthAmerica>>

  const params = (methodMap[calcMethod] ?? adhan.CalculationMethod.NorthAmerica)()
  params.madhab = madhab === 'hanafi' ? adhan.Madhab.Hanafi : adhan.Madhab.Shafi

  const times = new adhan.PrayerTimes(coords, date, params)

  return {
    fajr:    times.fajr,
    dhuhr:   times.dhuhr,
    asr:     times.asr,
    maghrib: times.maghrib,
    isha:    times.isha,
  }
}

export async function computePrayerTimesForDates(
  lat: number,
  lng: number,
  madhab: Madhab = 'hanafi',
  calcMethod: CalcMethod = 'ISNA',
  dates: Date[]
): Promise<Record<string, PrayerTime[]>> {
  const result: Record<string, PrayerTime[]> = {}
  for (const d of dates) {
    const raw = await computePrayerTimes(lat, lng, madhab, calcMethod, d)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    result[key] = buildPrayerTimes(raw)
  }
  return result
}

// Returns prayer times as displayable PrayerTime objects
export function buildPrayerTimes(
  rawTimes: Record<PrayerName, Date>
): PrayerTime[] {
  return PRAYER_ORDER.map(name => ({
    name,
    ...PRAYER_META[name],
    time: rawTimes[name] ?? null,
    formattedTime: formatTime(rawTimes[name] ?? null),
  }))
}

// Which prayer is currently "next"?
export function getNextPrayer(
  prayerTimes: PrayerTime[]
): PrayerTime | null {
  const now = Date.now()
  return prayerTimes.find(p => p.time && p.time.getTime() > now) ?? null
}
