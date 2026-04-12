# CURSOR.md — Noor Project Memory

> Claude reads this file at the start of every Cursor session.
> Update it after each build session so context is never lost.

---

## What This App Is

**Noor** — A Next.js web app that uses the 5 daily Islamic prayers as the structural
backbone of a life management system. Four pillars: Faith, Tasks (Career), Fitness, Family.
Weekly Score (0–100) resets every Monday. No streaks. No guilt. Partial counts.

**One-sentence pitch:**
"The only system built on the rhythm Allah already gave you."

---

## Tech Stack

| Layer        | Choice               | Why                                      |
|--------------|----------------------|------------------------------------------|
| Framework    | Next.js 14 (App Router) | Vercel-native, file-based routing      |
| Language     | TypeScript           | Type safety across all data shapes       |
| Styling      | Tailwind CSS         | Design tokens in tailwind.config.ts      |
| State        | Zustand + localStorage | Client-only, no backend needed yet    |
| Prayer times | adhan npm package    | Offline, all madhabs, no API key needed  |
| UI primitives| Radix UI (headless)  | Accessible, unstyled, easy to customize  |

---

## File Map

```
app/
  layout.tsx          ← root layout (fonts, metadata)
  page.tsx            ← redirects to /faith
  faith/
    layout.tsx        ← TopNav wrapper
    page.tsx          ← Faith dashboard (prayers, heat map, quran, score)
  tasks/
    layout.tsx
    page.tsx          ← Prayer-anchored task manager + calendar
  fitness/
    layout.tsx
    page.tsx          ← Split tracker, exercises, voice food log
  family/
    layout.tsx
    page.tsx          ← Connections, Hajj savings, circle

components/
  layout/
    TopNav.tsx        ← Sticky top nav with page switcher
  ui/
    index.tsx         ← ScoreRing, ProgressBar, Badge, Card, VoiceButton

lib/
  store.ts            ← Zustand store — ALL state lives here
  prayers.ts          ← Prayer time calculation helpers
  score.ts            ← Weekly score math (pure functions)
  utils.ts            ← cn() Tailwind helper

hooks/
  usePrayerTimes.ts   ← Loads adhan, handles location, returns PrayerTime[]
  useWeeklyScore.ts   ← Calculates score from store, returns WeeklyScore

types/
  index.ts            ← ALL TypeScript interfaces
```

---

## Design System (from tailwind.config.ts)

**Colors by pillar:**
- Faith:   `text-faith-text` / `bg-faith-light` / `bg-faith` — green
- Tasks:   `text-tasks-text` / `bg-tasks-light` / `bg-tasks` — blue
- Fitness: `text-fitness-text` / `bg-fitness-light` / `bg-fitness` — orange
- Family:  `text-family-text` / `bg-family-light` / `bg-family` — purple
- Brand:   `text-brand-400` / `bg-brand-50` — gold/amber

**Surfaces:**
- Page bg: `bg-surface-bg` (#F7F7F5)
- Cards:   `bg-white border border-surface-border`
- Raised:  `bg-surface-raised` — slightly off-white for inputs
- Muted:   `bg-surface-muted` — hover states, disabled bg

**Typography:**
- Primary:   `text-ink-primary` (#1A1A1A)
- Secondary: `text-ink-secondary`
- Muted:     `text-ink-muted`
- Ghost:     `text-ink-ghost` — for labels, timestamps, helpers

**Utility classes (globals.css):**
- `.card` — white card with border
- `.input-base` — styled text input
- `.btn-primary` — gold/brand fill button
- `.btn-secondary` — outline button
- `.btn-ghost` — minimal button

---

## Core Rules Claude Must Follow in This Project

1. **No streaks ever** — use percentages, rings, completion bars
2. **Partial counts** — 3/5 prayers = 60%, not failure
3. **Pillar color consistency** — faith=green, tasks=blue, fitness=orange, family=purple, brand=gold
4. **Store only in lib/store.ts** — no direct localStorage calls in components
5. **Pure functions in lib/score.ts** — no DOM, no side effects
6. **Prayer times are client-only** — always in a `'use client'` component or hook
7. **Never hardcode colors** — always use Tailwind design tokens
8. **Mobile-aware** — minimum 44px tap targets, test at 768px width

---

## Score Formula

```
Weekly Score = (faithScore × 0.40) + (familyScore × 0.25) + (careerScore × 0.20) + (fitnessScore × 0.15)

faithScore   = (prayers prayed this week) / (days elapsed × 5) × 100
familyScore  = any family log entry this week ? 100 : 0
careerScore  = (goals completed) / (goals set) × 100
fitnessScore = any fitness entry this week ? 100 : 0
```

Resets every Monday. Stored in weeklyRecords[mondayDateString].

---

## Prayer → Pillar Anchors

| Prayer  | Pillar  | Checkpoint action          |
|---------|---------|---------------------------|
| Fajr    | Faith   | Set daily intention        |
| Dhuhr   | Career  | Career task check-in       |
| Asr     | Fitness | Log workout/movement       |
| Maghrib | Family  | Log family connection      |
| Isha    | Faith   | Day reflection/rating      |

---

## Data Shapes (quick reference)

All types in `types/index.ts`. Key shapes:

```typescript
DailyLog {
  date: string                  // 'YYYY-MM-DD'
  prayers: Record<PrayerName, boolean>
  quranEntries: QuranEntry[]
  fitnessEntries: FitnessEntry[]
  familyEntries: FamilyEntry[]
  careerChecked: boolean
}

WeeklyRecord {
  weekStart: string             // Monday 'YYYY-MM-DD'
  score: number                 // 0–100
  goals: WeeklyGoal[]
  wins: string[]
  intention: string
}
```

---

## How to Prompt Claude in This Project

**Always start your Cursor session with:**
```
Read @CURSOR.md — I'm continuing Noor. Today I'm working on: [task]
```

**For building a feature:**
```
In @app/[page]/page.tsx, add [feature].
Follow the design system in @tailwind.config.ts.
Use the store from @lib/store.ts.
Match the visual style of the existing components.
```

**For fixing a bug:**
```
In @[file], [describe what's broken].
Expected: [what should happen]
Actual: [what happens]
Do not change any other behavior.
```

**For a new component:**
```
Create a new component in @components/[folder]/[Name].tsx.
It should: [describe]
Use these tailwind tokens: [list relevant ones from tailwind.config.ts]
Export it and add it to @components/ui/index.tsx if it's reusable.
```

---

## Current Build Status

- [x] Project structure
- [x] Types (types/index.ts)
- [x] Zustand store (lib/store.ts)
- [x] Score calculation (lib/score.ts)
- [x] Prayer time utilities (lib/prayers.ts)
- [x] usePrayerTimes hook
- [x] useWeeklyScore hook
- [x] TopNav component
- [x] UI components (ScoreRing, ProgressBar, Badge, Card, VoiceButton)
- [x] Faith page
- [x] Tasks page
- [x] Fitness page
- [x] Family page
- [x] Tailwind config + design tokens
- [ ] Voice input (Web Speech API) — connect VoiceButton to real transcription
- [ ] AI Weekly Planner (Claude API call in /api/planner route)
- [ ] Onboarding flow (first-time user setup)
- [ ] Friday Review modal
- [ ] Settings page (/settings)
- [ ] PWA manifest + service worker
- [ ] Vercel deployment

Update the checkboxes above as you complete each item.

---

## Next Session Priorities

**Start here:**
1. Wire up the VoiceButton to the Web Speech API (`window.SpeechRecognition`)
2. Build the AI Weekly Planner API route at `/app/api/planner/route.ts`
3. Add the onboarding flow that asks for location + madhab on first visit

---

## Deployment

```bash
# Local dev
npm install
npm run dev
# → http://localhost:3000

# Deploy to Vercel
# 1. Push to GitHub
# 2. Import repo in vercel.com
# 3. Framework: Next.js (auto-detected)
# 4. No env vars needed for basic launch
# 5. Add ANTHROPIC_API_KEY for AI planner feature
```
