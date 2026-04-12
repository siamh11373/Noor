export const LANDING_DISPLAY_FONT = "font-[family-name:var(--font-fraunces)]"
export const LANDING_BODY_FONT = "font-[family-name:var(--font-manrope)]"

export const MARKETING_NAV_ITEMS = [
  { id: 'pillars', label: 'Pillars' },
  { id: 'preview', label: 'Dashboard' },
  { id: 'flow', label: 'How It Works' },
  { id: 'privacy', label: 'Privacy' },
] as const

export type MarketingSectionId = (typeof MARKETING_NAV_ITEMS)[number]['id']
