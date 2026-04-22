import type { Madhab } from '@/types'

/**
 * Single source of truth for madhab metadata.
 *
 * Fiqh + astronomy reality:
 *   - Fajr, Dhuhr, Maghrib, Isha are identical across all four madhabs.
 *   - Only Asr differs, based on a shadow-length rule:
 *       Hanafi:   shadow = 2 * object height + midday shadow  (later Asr)
 *       Shafi'i:  shadow = 1 * object height + midday shadow  (earlier Asr)
 *       Maliki:   shadow = 1 * object height + midday shadow  (same as Shafi'i)
 *       Hanbali:  shadow = 1 * object height + midday shadow  (same as Shafi'i)
 *
 * This is why Adhan.js (and every other mainstream library) exposes only two
 * Asr calculations: Hanafi and "Shafi" (the majority / jumhur position).
 * We honor all four madhab labels in the UI so the selection feels familiar,
 * and internally map them to the correct shadow factor.
 */

export type AsrShadowFactor = 1 | 2

export interface MadhabMeta {
  value: Madhab
  label: string
  /** Shadow-length multiplier used for Asr. 1 = jumhur (Shafi'i/Maliki/Hanbali), 2 = Hanafi. */
  asrShadowFactor: AsrShadowFactor
  /** Short UI description. Keep to one line. */
  description: string
}

export const MADHAB_META: Record<Madhab, MadhabMeta> = {
  hanafi: {
    value: 'hanafi',
    label: 'Hanafi',
    asrShadowFactor: 2,
    description: 'Asr at shadow × 2 (later afternoon).',
  },
  shafii: {
    value: 'shafii',
    label: "Shafi'i",
    asrShadowFactor: 1,
    description: 'Asr at shadow × 1 (earlier afternoon).',
  },
  maliki: {
    value: 'maliki',
    label: 'Maliki',
    asrShadowFactor: 1,
    description: "Asr at shadow × 1 (same timing as Shafi'i).",
  },
  hanbali: {
    value: 'hanbali',
    label: 'Hanbali',
    asrShadowFactor: 1,
    description: "Asr at shadow × 1 (same timing as Shafi'i).",
  },
}

export const MADHAB_OPTIONS: MadhabMeta[] = [
  MADHAB_META.hanafi,
  MADHAB_META.shafii,
  MADHAB_META.maliki,
  MADHAB_META.hanbali,
]

const MADHAB_VALUES = new Set<Madhab>(['hanafi', 'shafii', 'maliki', 'hanbali'])

/** Type-guard + defensive parse for values arriving from user metadata / cloud state. */
export function isMadhab(value: unknown): value is Madhab {
  return typeof value === 'string' && MADHAB_VALUES.has(value as Madhab)
}

/** Parse any input into a valid Madhab, falling back to Hanafi. */
export function parseMadhab(value: unknown, fallback: Madhab = 'hanafi'): Madhab {
  return isMadhab(value) ? value : fallback
}

export function madhabLabel(madhab: Madhab): string {
  return MADHAB_META[madhab].label
}

export function asrShadowFactorFor(madhab: Madhab): AsrShadowFactor {
  return MADHAB_META[madhab].asrShadowFactor
}

/** Short phrase like "Hanafi · shadow × 2" for compact UI labels. */
export function asrMicroLabel(madhab: Madhab): string {
  const m = MADHAB_META[madhab]
  return `${m.label} · shadow × ${m.asrShadowFactor}`
}
