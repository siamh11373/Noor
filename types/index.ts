// ─── PRAYERS ─────────────────────────────────────────────────────────────────

export type PrayerName = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'

export interface PrayerTime {
  name: PrayerName
  displayName: string
  time: Date | null
  formattedTime: string
  icon: string
  anchor: string  // the life-pillar this prayer anchors
}

export interface DailyPrayers {
  fajr: boolean
  dhuhr: boolean
  asr: boolean
  maghrib: boolean
  isha: boolean
}

// ─── DAILY LOG ────────────────────────────────────────────────────────────────

export interface DailyLog {
  date: string               // 'YYYY-MM-DD'
  prayers: DailyPrayers
  quranEntries: QuranEntry[]
  fitnessEntries: FitnessEntry[]
  familyEntries: FamilyEntry[]
  careerChecked: boolean
  reflection: string
  dayRating: number          // 1–5
}

// ─── WEEKLY RECORD ────────────────────────────────────────────────────────────

export type PillarKey = 'faith' | 'family' | 'career' | 'fitness'

export interface WeeklyGoal {
  id: string
  text: string
  pillar: PillarKey
  completed: boolean
  carriedFrom?: string       // week start date of origin
}

export interface WeeklyRecord {
  weekStart: string          // Monday 'YYYY-MM-DD'
  score: number              // 0–100
  goals: WeeklyGoal[]
  wins: string[]
  intention: string
  aiPlanUsed: boolean
  fridayReview?: FridayReview
}

export interface FridayReview {
  wins: string
  drifted: string
  intention: string
  completedAt: string
}

// ─── FAITH ────────────────────────────────────────────────────────────────────

export interface QuranEntry {
  id: string
  text: string               // e.g. "Al-Baqarah pages 28–31"
  minutes: number
  date: string
}

export interface DhikrCount {
  subhanAllah: number
  alhamdulillah: number
  allahuAkbar: number
}

export interface CustomDhikrItem {
  id: string
  label: string
  count: number
}

// ─── FITNESS ─────────────────────────────────────────────────────────────────

export type ExerciseType =
  | 'Gym' | 'Run' | 'Walk' | 'Basketball' | 'Swim' | 'Cycling' | 'Other'

export interface WorkoutSet {
  weight: number
  reps: number
  isPersonalRecord?: boolean
}

export interface Exercise {
  id: string
  name: string
  muscleGroup: string
  sets: WorkoutSet[]
}

export interface FitnessEntry {
  id: string
  type: ExerciseType
  note: string
  exercises: Exercise[]
  date: string
  duration?: number          // minutes
}

export interface PersonalRecord {
  exercise: string
  weight: number
  reps: number
  date: string
}

export type SplitDay =
  | 'Chest' | 'Back' | 'Arms' | 'Legs' | 'Shoulders' | 'Full Body' | 'Cardio' | 'Rest'

export interface WeeklySplit {
  monday: SplitDay
  tuesday: SplitDay
  wednesday: SplitDay
  thursday: SplitDay
  friday: SplitDay
  saturday: SplitDay
  sunday: SplitDay
}

export interface FoodEntry {
  id: string
  description: string        // raw voice transcript or typed
  meal: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'pre-workout'
  calories?: number
  protein?: number
  carbs?: number
  fats?: number
  time: string
  date: string
}

// ─── CALENDAR TASKS ──────────────────────────────────────────────────────────

export type RecurrenceFrequencyUnit = 'day' | 'week' | 'month' | 'year'

export type RecurrenceEndMode = 'never' | 'until_date' | 'after_count'

export type RecurrencePresetKind = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'

export interface CalendarTaskRecurrence {
  preset: RecurrencePresetKind
  interval: number
  frequencyUnit: RecurrenceFrequencyUnit
  /** 0 = Sunday … 6 = Saturday (JS getDay); used for weekly / custom-week */
  byWeekday: number[]
  end: RecurrenceEndMode
  untilDate?: string
  afterCount?: number
}

export interface CalendarTask {
  id: string
  title: string
  date: string              // YYYY-MM-DD (series anchor for recurring tasks)
  startTime: string         // HH:mm (24h format)
  duration: number          // minutes
  pillar: PillarKey
  completed: boolean
  note?: string
  recurrence?: CalendarTaskRecurrence
  /** Present only on expanded synthetic rows in the UI (not persisted on master). */
  recurrenceInstanceOf?: string
}

// ─── FAMILY ───────────────────────────────────────────────────────────────────

export interface FamilyEntry {
  id: string
  text: string
  date: string
}

export interface SavingsGoal {
  id: string
  label: string              // e.g. "Hajj & Umrah"
  targetAmount: number
  currentAmount: number
  currency: string
  targetDate?: string
}

export interface AccountabilityMember {
  id: string
  name: string
  score: number | null
  trend: string
  status: 'active' | 'pending'
  invitedAt: string
}

export interface Profile {
  id: string
  display_name: string | null
  timezone: string | null
  created_at: string
  updated_at: string
}

export interface UserStateRow {
  user_id: string
  state: SerializedSalahState
  schema_version: number
  updated_at: string
}

export interface WeeklyScoreSnapshot {
  user_id: string
  week_start: string
  total_score: number
  trend_delta: number
  pillar_scores: PillarScores
  updated_at: string
}

export type AccountabilityInviteStatus = 'active' | 'accepted' | 'expired' | 'revoked'

export interface AccountabilityInvite {
  id: string
  created_by: string
  code: string
  status: AccountabilityInviteStatus
  expires_at: string
  accepted_by: string | null
  accepted_at: string | null
  created_at: string
}

export interface AccountabilityConnection {
  id: string
  user_id: string
  peer_user_id: string
  created_at: string
}

export interface AccountabilityPeer {
  id: string
  displayName: string
  score: number | null
  trendDelta: number
  pillarScores: PillarScores | null
  connectedAt: string
}

/** Named multi-member circle (parallel to 1:1 accountability). */
export interface CircleSummary {
  id: string
  name: string
  createdBy: string
  createdAt: string
  memberCount: number
  joinedAt: string
}

export interface PendingCircleInvite {
  id: string
  circle_id: string
  code: string
  expires_at: string
  created_at: string
  circleName: string
}

export interface AuthUser {
  id: string
  email: string
  emailConfirmedAt: string | null
}

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'
export type EmailVerificationStatus = 'loading' | 'verified' | 'unverified'
export type CloudSyncStatus = 'idle' | 'syncing' | 'error' | 'synced'
export type OnboardingStatus = 'loading' | 'required' | 'complete'

export interface OnboardingDraft {
  displayName: string
  timezone: string
  madhab: Madhab
  calcMethod: CalcMethod
  location: {
    lat: number | null
    lng: number | null
    city: string
  }
  notificationsEnabled: boolean
  notificationOffset: number
  weeklySplit: WeeklySplit
  inviteCode: string
}

// ─── SETTINGS ─────────────────────────────────────────────────────────────────

export type Madhab = 'hanafi' | 'shafii'
export type CalcMethod = 'ISNA' | 'MWL' | 'Egypt' | 'Karachi' | 'UmmAlQura'

export interface UserSettings {
  madhab: Madhab
  calcMethod: CalcMethod
  location: {
    lat: number | null
    lng: number | null
    city: string
  }
  notificationsEnabled: boolean
  notificationOffset: number  // minutes after salah
  weeklySplit: WeeklySplit
  onboardingComplete: boolean
}

// ─── SCORE ────────────────────────────────────────────────────────────────────

export interface PillarScores {
  faith: number
  family: number
  career: number
  fitness: number
}

export interface WeeklyScore {
  total: number              // 0–100
  pillars: PillarScores
}

export interface SalahDataState {
  dailyLogs: Record<string, DailyLog>
  weeklyRecords: Record<string, WeeklyRecord>
  calendarTasks: CalendarTask[]
  /** Tasks rail: month focus notes, keyed YYYY-MM */
  taskMonthNotes: Record<string, string>
  foodLog: FoodEntry[]
  personalRecords: PersonalRecord[]
  savingsGoals: SavingsGoal[]
  dhikr: DhikrCount
  customDhikr: CustomDhikrItem[]
  settings: UserSettings
}

export type SerializedSalahState = SalahDataState
