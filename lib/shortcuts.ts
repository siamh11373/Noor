'use client'

import { create } from 'zustand'

export type ShortcutGroup =
  | 'navigation'
  | 'faith'
  | 'tasks'
  | 'fitness'
  | 'circles'
  | 'editing'
  | 'help'

export interface ShortcutDefinition {
  id: string
  keys: string[]
  label: string
  group: ShortcutGroup
  /** Optional: only visible in help overlay when pathname matches this prefix */
  pathPrefix?: string
}

export const GROUP_LABELS: Record<ShortcutGroup, string> = {
  navigation: 'Navigation',
  faith: 'On this page · Faith',
  tasks: 'On this page · Tasks',
  fitness: 'On this page · Fitness',
  circles: 'On this page · Circles',
  editing: 'Editing',
  help: 'Help',
}

export const GROUP_ACCENT: Record<ShortcutGroup, string> = {
  navigation: 'border-surface-border bg-surface-muted text-ink-secondary',
  faith: 'border-faith-border bg-faith-light text-faith-text',
  tasks: 'border-tasks-border bg-tasks-light text-tasks-text',
  fitness: 'border-fitness-border bg-fitness-light text-fitness-text',
  circles: 'border-brand-200 bg-brand-50 text-brand-500',
  editing: 'border-surface-border bg-surface-muted text-ink-secondary',
  help: 'border-surface-border bg-surface-muted text-ink-secondary',
}

export const GROUP_ORDER: ShortcutGroup[] = [
  'navigation',
  'faith',
  'tasks',
  'fitness',
  'circles',
  'editing',
  'help',
]

export const GLOBAL_SHORTCUTS: ShortcutDefinition[] = [
  { id: 'nav-faith',   keys: ['g', 'f'], label: 'Go to Faith',   group: 'navigation' },
  { id: 'nav-tasks',   keys: ['g', 't'], label: 'Go to Tasks',   group: 'navigation' },
  { id: 'nav-fitness', keys: ['g', 'i'], label: 'Go to Fitness', group: 'navigation' },
  { id: 'nav-circles', keys: ['g', 'c'], label: 'Go to Circles', group: 'navigation' },
  { id: 'nav-account', keys: ['g', 'a'], label: 'Go to Account', group: 'navigation' },
  { id: 'timer-open', keys: ['.'], label: 'Open timer', group: 'navigation' },
  { id: 'edit-undo', keys: ['mod', 'z'],          label: 'Undo last change', group: 'editing' },
  { id: 'edit-redo', keys: ['mod', 'shift', 'z'], label: 'Redo',             group: 'editing' },
  { id: 'edit-redo-alt', keys: ['mod', 'y'],      label: 'Redo (alt)',       group: 'editing' },
  { id: 'help-open', keys: ['?'],   label: 'Show keyboard shortcuts', group: 'help' },
  { id: 'help-esc',  keys: ['Esc'], label: 'Close dialog or overlay', group: 'help' },
]

export const FAITH_SHORTCUTS: ShortcutDefinition[] = [
  { id: 'faith-p1', keys: ['1'], label: 'Toggle Fajr',    group: 'faith', pathPrefix: '/faith' },
  { id: 'faith-p2', keys: ['2'], label: 'Toggle Dhuhr',   group: 'faith', pathPrefix: '/faith' },
  { id: 'faith-p3', keys: ['3'], label: 'Toggle Asr',     group: 'faith', pathPrefix: '/faith' },
  { id: 'faith-p4', keys: ['4'], label: 'Toggle Maghrib', group: 'faith', pathPrefix: '/faith' },
  { id: 'faith-p5', keys: ['5'], label: 'Toggle Isha',    group: 'faith', pathPrefix: '/faith' },
  { id: 'faith-dhikr',  keys: ['d'], label: 'Open Dhikr log',     group: 'faith', pathPrefix: '/faith' },
  { id: 'faith-review', keys: ['r'], label: 'Open Friday review', group: 'faith', pathPrefix: '/faith' },
  { id: 'faith-quran',  keys: ['q'], label: 'Focus Quran input',  group: 'faith', pathPrefix: '/faith' },
]

export const TASKS_SHORTCUTS: ShortcutDefinition[] = [
  { id: 'tasks-today', keys: ['t'], label: 'Jump to today', group: 'tasks', pathPrefix: '/tasks' },
  { id: 'tasks-next', keys: ['j'], label: 'Next period', group: 'tasks', pathPrefix: '/tasks' },
  { id: 'tasks-prev', keys: ['k'], label: 'Previous period', group: 'tasks', pathPrefix: '/tasks' },
  { id: 'tasks-view-day',   keys: ['1'], label: 'Day view',   group: 'tasks', pathPrefix: '/tasks' },
  { id: 'tasks-view-week',  keys: ['2'], label: 'Week view',  group: 'tasks', pathPrefix: '/tasks' },
  { id: 'tasks-view-month', keys: ['3'], label: 'Month view', group: 'tasks', pathPrefix: '/tasks' },
  { id: 'tasks-mode', keys: ['m'], label: 'Toggle time / task mode', group: 'tasks', pathPrefix: '/tasks' },
  { id: 'tasks-new',  keys: ['n'], label: 'New task',                group: 'tasks', pathPrefix: '/tasks' },
]

export const FITNESS_SHORTCUTS: ShortcutDefinition[] = [
  { id: 'fitness-exercise', keys: ['e'], label: 'Add exercise',   group: 'fitness', pathPrefix: '/fitness' },
  { id: 'fitness-food',     keys: ['f'], label: 'Log meal',       group: 'fitness', pathPrefix: '/fitness' },
  { id: 'fitness-history',  keys: ['h'], label: 'Open history',   group: 'fitness', pathPrefix: '/fitness' },
  { id: 'fitness-note',     keys: ['s'], label: 'Focus session note', group: 'fitness', pathPrefix: '/fitness' },
  { id: 'fitness-type-1', keys: ['1'], label: 'Select Gym',        group: 'fitness', pathPrefix: '/fitness' },
  { id: 'fitness-type-2', keys: ['2'], label: 'Select Run',        group: 'fitness', pathPrefix: '/fitness' },
  { id: 'fitness-type-3', keys: ['3'], label: 'Select Walk',       group: 'fitness', pathPrefix: '/fitness' },
  { id: 'fitness-type-4', keys: ['4'], label: 'Select Basketball', group: 'fitness', pathPrefix: '/fitness' },
  { id: 'fitness-type-5', keys: ['5'], label: 'Select Swim',       group: 'fitness', pathPrefix: '/fitness' },
  { id: 'fitness-type-6', keys: ['6'], label: 'Select Cycling',    group: 'fitness', pathPrefix: '/fitness' },
  { id: 'fitness-type-7', keys: ['7'], label: 'Select Other',      group: 'fitness', pathPrefix: '/fitness' },
]

export const CIRCLES_SHORTCUTS: ShortcutDefinition[] = [
  { id: 'circles-new',    keys: ['n'], label: 'New circle',     group: 'circles', pathPrefix: '/circles' },
  { id: 'circles-join',   keys: ['j'], label: 'Join with code', group: 'circles', pathPrefix: '/circles' },
  { id: 'circles-invite', keys: ['i'], label: 'Pairing invite', group: 'circles', pathPrefix: '/circles' },
  { id: 'circles-prev',   keys: ['['], label: 'Previous circle', group: 'circles', pathPrefix: '/circles' },
  { id: 'circles-next',   keys: [']'], label: 'Next circle',     group: 'circles', pathPrefix: '/circles' },
]

export const ALL_SHORTCUTS: ShortcutDefinition[] = [
  ...GLOBAL_SHORTCUTS,
  ...FAITH_SHORTCUTS,
  ...TASKS_SHORTCUTS,
  ...FITNESS_SHORTCUTS,
  ...CIRCLES_SHORTCUTS,
]

// UI store for the shortcuts help overlay (separate from data store so it
// isn't tracked by the undo/redo history).
interface ShortcutsUiStore {
  helpOpen: boolean
  setHelpOpen: (open: boolean) => void
  toggleHelp: () => void
}

export const useShortcutsUi = create<ShortcutsUiStore>((set) => ({
  helpOpen: false,
  setHelpOpen: (open) => set({ helpOpen: open }),
  toggleHelp: () => set((s) => ({ helpOpen: !s.helpOpen })),
}))

/** Detects macOS for rendering ⌘ vs Ctrl. SSR-safe: returns false on server. */
export function isMac(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform)
}

const KEY_LABELS: Record<string, { mac?: string; other?: string; both?: string }> = {
  mod:   { mac: '⌘', other: 'Ctrl' },
  shift: { both: '⇧' },
  alt:   { mac: '⌥', other: 'Alt' },
  ctrl:  { both: 'Ctrl' },
  Esc:   { both: 'Esc' },
  ArrowLeft:  { both: '←' },
  ArrowRight: { both: '→' },
  ArrowUp:    { both: '↑' },
  ArrowDown:  { both: '↓' },
  '?':   { both: '?' },
}

export function renderKey(key: string, mac = isMac()): string {
  const entry = KEY_LABELS[key]
  if (!entry) return key.toUpperCase().length === 1 ? key.toUpperCase() : key
  if (entry.both) return entry.both
  return mac ? (entry.mac ?? key) : (entry.other ?? key)
}
