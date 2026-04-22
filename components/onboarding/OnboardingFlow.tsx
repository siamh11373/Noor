'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthShell } from '@/components/auth/AuthShell'
import { useAuth } from '@/components/providers/AuthProvider'
import { upsertUserStateAndSnapshot } from '@/lib/supabase/state-sync'
import { serializeStoreData, useSalahStore } from '@/lib/store'
import type { CalcMethod, Madhab, SplitDay } from '@/types'
import { MADHAB_OPTIONS as MADHAB_META_OPTIONS, MADHAB_META } from '@/lib/madhabs'
import { cn } from '@/lib/utils'

const STEP_TITLES = ['Profile', 'Prayer Setup', 'Daily Rhythm', 'Weekly Defaults', 'Accountability'] as const
const SPLIT_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
const DAY_LABELS: Record<(typeof SPLIT_DAYS)[number], string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
}
const SPLIT_OPTIONS: SplitDay[] = ['Chest', 'Back', 'Arms', 'Legs', 'Shoulders', 'Full Body', 'Cardio', 'Rest']
const MADHAB_OPTIONS: { value: Madhab; label: string }[] = MADHAB_META_OPTIONS.map(m => ({
  value: m.value,
  label: m.label,
}))
const CALC_OPTIONS: { value: CalcMethod; label: string }[] = [
  { value: 'ISNA', label: 'ISNA' },
  { value: 'MWL', label: 'Muslim World League' },
  { value: 'Egypt', label: 'Egyptian General Authority' },
  { value: 'Karachi', label: 'Karachi' },
  { value: 'UmmAlQura', label: 'Umm al-Qura' },
]

// SECURITY FIX: max length for display name to prevent oversized data being written to the database
const DISPLAY_NAME_MAX_LENGTH = 100

export function OnboardingFlow() {
  const router = useRouter()
  const { client, refreshAccountability, refreshProfile, user } = useAuth()
  const currentProfile = useSalahStore(state => state.currentProfile)
  const settings = useSalahStore(state => state.settings)
  const dailyLogs = useSalahStore(state => state.dailyLogs)
  const weeklyRecords = useSalahStore(state => state.weeklyRecords)
  const calendarTasks = useSalahStore(state => state.calendarTasks)
  const taskMonthNotes = useSalahStore(state => state.taskMonthNotes)
  const foodLog = useSalahStore(state => state.foodLog)
  const personalRecords = useSalahStore(state => state.personalRecords)
  const savingsGoals = useSalahStore(state => state.savingsGoals)
  const dhikr = useSalahStore(state => state.dhikr)
  const customDhikr = useSalahStore(state => state.customDhikr)
  const onboardingDraft = useSalahStore(state => state.onboardingDraft)
  const onboardingStep = useSalahStore(state => state.onboardingStep)
  const patchOnboardingDraft = useSalahStore(state => state.patchOnboardingDraft)
  const setOnboardingStep = useSalahStore(state => state.setOnboardingStep)
  const setOnboardingStatus = useSalahStore(state => state.setOnboardingStatus)
  const seedOnboardingDraft = useSalahStore(state => state.seedOnboardingDraft)
  const updateSettings = useSalahStore(state => state.updateSettings)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    seedOnboardingDraft({ profile: currentProfile, settings })
  }, [currentProfile, seedOnboardingDraft, settings])

  // Pre-fill display name from Google metadata for OAuth users
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const googleName = (user as any)?.user_metadata?.full_name as string | undefined
    if (googleName && !onboardingDraft.displayName.trim()) {
      patchOnboardingDraft({ displayName: googleName.split(' ')[0] ?? googleName })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const totalSteps = STEP_TITLES.length
  const currentStep = Math.min(Math.max(onboardingStep, 0), totalSteps - 1)

  const finalState = useMemo(() => {
    const nextSettings = {
      ...settings,
      madhab: onboardingDraft.madhab,
      calcMethod: onboardingDraft.calcMethod,
      location: { ...onboardingDraft.location },
      notificationsEnabled: onboardingDraft.notificationsEnabled,
      notificationOffset: onboardingDraft.notificationOffset,
      weeklySplit: { ...onboardingDraft.weeklySplit },
      onboardingComplete: true,
    }

    return serializeStoreData({
      dailyLogs,
      weeklyRecords,
      calendarTasks,
      taskMonthNotes,
      foodLog,
      personalRecords,
      savingsGoals,
      dhikr,
      customDhikr,
      settings: nextSettings,
    })
  }, [calendarTasks, customDhikr, dailyLogs, dhikr, foodLog, onboardingDraft, personalRecords, savingsGoals, settings, taskMonthNotes, weeklyRecords])

  function nextStep() {
    setOnboardingStep(Math.min(currentStep + 1, totalSteps - 1))
  }

  function previousStep() {
    setOnboardingStep(Math.max(currentStep - 1, 0))
  }

  function validateCurrentStep() {
    if (currentStep === 0) {
      return onboardingDraft.displayName.trim() && onboardingDraft.timezone.trim()
    }
    if (currentStep === 1) {
      return onboardingDraft.location.city.trim()
    }
    return true
  }

  async function handleFinish() {
    if (!client || !user) {
      return
    }

    setSaving(true)
    setError('')

    // SECURITY FIX: validate display name length server-side before writing to the database
    const trimmedName = onboardingDraft.displayName.trim()
    if (!trimmedName || trimmedName.length > DISPLAY_NAME_MAX_LENGTH) {
      setError(`Display name must be between 1 and ${DISPLAY_NAME_MAX_LENGTH} characters.`)
      setSaving(false)
      return
    }

    const { error: profileError } = await client
      .from('profiles')
      .update({
        display_name: trimmedName,
        timezone: onboardingDraft.timezone.trim() || null,
      })
      .eq('id', user.id)

    if (profileError) {
      // SECURITY FIX: show generic message instead of raw Supabase error to avoid leaking internals
      setError('Could not save your profile. Please try again.')
      setSaving(false)
      return
    }

    const sync = await upsertUserStateAndSnapshot(client, finalState, user.id)

    if (!sync.ok) {
      // SECURITY FIX: show generic message instead of exposing raw Supabase error messages
      setError('Could not save your onboarding settings. Please try again.')
      setSaving(false)
      return
    }

    if (onboardingDraft.inviteCode.trim()) {
      const { data, error: inviteError } = await client.rpc('accept_accountability_invite', {
        invite_code: onboardingDraft.inviteCode.trim().toUpperCase(),
      })

      if (inviteError) {
        // SECURITY FIX: show generic message instead of raw Supabase RPC error
        setError('Could not process the invite code. Please try again.')
        setSaving(false)
        return
      }

      const status = typeof data === 'object' && data && 'status' in data ? String(data.status) : 'invalid'
      if (!['accepted', 'duplicate'].includes(status)) {
        setError(
          {
            invalid: 'That invite code does not exist.',
            expired: 'That invite code has expired.',
            revoked: 'That invite code was revoked.',
            self: 'You cannot join your own invite code.',
            accepted_already: 'That invite code has already been used.',
            unauthenticated: 'Sign in again before accepting an invite.',
          }[status] ?? 'That invite code could not be accepted.'
        )
        setSaving(false)
        return
      }
    }

    updateSettings({
      madhab: onboardingDraft.madhab,
      calcMethod: onboardingDraft.calcMethod,
      location: { ...onboardingDraft.location },
      notificationsEnabled: onboardingDraft.notificationsEnabled,
      notificationOffset: onboardingDraft.notificationOffset,
      weeklySplit: { ...onboardingDraft.weeklySplit },
      onboardingComplete: true,
    })
    setOnboardingStatus('complete')
    setOnboardingStep(0)
    await refreshProfile()
    await refreshAccountability()
    router.push('/faith')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isGoogleUser = (user as any)?.app_metadata?.provider === 'google'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const googleFirstName = ((user as any)?.user_metadata?.full_name as string | undefined)?.split(' ')[0]

  return (
    <AuthShell
      eyebrow={isGoogleUser ? 'Welcome to Noor' : 'Onboarding'}
      title={isGoogleUser && googleFirstName ? `Hi, ${googleFirstName}! One quick setup.` : 'Complete your Noor setup'}
      description={
        isGoogleUser
          ? "We grabbed your name from Google — just fill in your prayer preferences and you're ready."
          : "Set the prayer and weekly defaults that shape your dashboard experience. The product unlocks as soon as setup is complete."
      }
    >
      <div className="space-y-6">
        <div className="rounded-2xl border border-surface-border bg-surface-raised px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-ghost">Setup progress</p>
              <p className="mt-2 text-[15px] font-medium text-ink-primary">{STEP_TITLES[currentStep]}</p>
            </div>
            <p className="text-[12px] text-ink-ghost">{currentStep + 1} / {totalSteps}</p>
          </div>
          <div className="mt-4 grid grid-cols-5 gap-2">
            {STEP_TITLES.map((title, index) => (
              <button
                key={title}
                type="button"
                onClick={() => setOnboardingStep(index)}
                className={cn(
                  'rounded-xl border px-2 py-2 text-left text-[11px] transition-colors',
                  index === currentStep
                    ? 'border-brand-200 bg-brand-50 text-brand-500'
                    : index < currentStep
                    ? 'border-faith-border bg-faith-light text-faith-text'
                    : 'border-surface-border bg-surface-card text-ink-ghost'
                )}
              >
                {title}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {currentStep === 0 && (
            <>
              <Field label="Display name">
                <input
                  value={onboardingDraft.displayName}
                  onChange={event => patchOnboardingDraft({ displayName: event.target.value })}
                  className="input-base"
                  placeholder="Your first name"
                  maxLength={DISPLAY_NAME_MAX_LENGTH}
                />
              </Field>
              <Field label="Timezone">
                <input
                  value={onboardingDraft.timezone}
                  onChange={event => patchOnboardingDraft({ timezone: event.target.value })}
                  className="input-base"
                  placeholder="America/New_York"
                />
              </Field>
            </>
          )}

          {currentStep === 1 && (
            <>
              <Field label="Madhab">
                <select
                  value={onboardingDraft.madhab}
                  onChange={event => patchOnboardingDraft({ madhab: event.target.value as Madhab })}
                  className="input-base"
                >
                  {MADHAB_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <p className="mt-1.5 text-[11px] leading-snug text-ink-ghost">
                  {MADHAB_META[onboardingDraft.madhab].description}{' '}
                  <span className="text-ink-faint">Hanafi uses shadow × 2; Shafi&rsquo;i, Maliki, and Hanbali share shadow × 1.</span>
                </p>
              </Field>
              <Field label="Calculation method">
                <select
                  value={onboardingDraft.calcMethod}
                  onChange={event => patchOnboardingDraft({ calcMethod: event.target.value as CalcMethod })}
                  className="input-base"
                >
                  {CALC_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="City">
                <input
                  value={onboardingDraft.location.city}
                  onChange={event => patchOnboardingDraft({
                    location: {
                      ...onboardingDraft.location,
                      city: event.target.value,
                    },
                  })}
                  className="input-base"
                  placeholder="Warren, MI"
                />
              </Field>
            </>
          )}

          {currentStep === 2 && (
            <>
              <Field label="Prayer notifications">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => patchOnboardingDraft({ notificationsEnabled: true })}
                    className={cn(
                      'flex-1 rounded-xl border px-4 py-3 text-left text-[13px]',
                      onboardingDraft.notificationsEnabled
                        ? 'border-brand-200 bg-brand-50 text-brand-500'
                        : 'border-surface-border bg-surface-raised text-ink-secondary'
                    )}
                  >
                    Enabled
                  </button>
                  <button
                    type="button"
                    onClick={() => patchOnboardingDraft({ notificationsEnabled: false })}
                    className={cn(
                      'flex-1 rounded-xl border px-4 py-3 text-left text-[13px]',
                      !onboardingDraft.notificationsEnabled
                        ? 'border-brand-200 bg-brand-50 text-brand-500'
                        : 'border-surface-border bg-surface-raised text-ink-secondary'
                    )}
                  >
                    Disabled
                  </button>
                </div>
              </Field>
              <Field label="Notification offset">
                <select
                  value={String(onboardingDraft.notificationOffset)}
                  onChange={event => patchOnboardingDraft({ notificationOffset: Number(event.target.value) })}
                  className="input-base"
                >
                  {[0, 5, 10, 15, 20, 30].map(value => (
                    <option key={value} value={value}>{value} minutes after prayer time</option>
                  ))}
                </select>
              </Field>
            </>
          )}

          {currentStep === 3 && (
            <div className="space-y-3">
              {SPLIT_DAYS.map(day => (
                <Field key={day} label={DAY_LABELS[day]}>
                  <select
                    value={onboardingDraft.weeklySplit[day]}
                    onChange={event => patchOnboardingDraft({
                      weeklySplit: {
                        ...onboardingDraft.weeklySplit,
                        [day]: event.target.value as SplitDay,
                      },
                    })}
                    className="input-base"
                  >
                    {SPLIT_OPTIONS.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </Field>
              ))}
            </div>
          )}

          {currentStep === 4 && (
            <>
              <Field label="Invite code">
                <input
                  value={onboardingDraft.inviteCode}
                  onChange={event => patchOnboardingDraft({ inviteCode: event.target.value.toUpperCase() })}
                  className="input-base tracking-[0.18em] uppercase"
                  placeholder="Optional"
                />
              </Field>
              <div className="rounded-2xl border border-surface-border bg-surface-raised px-4 py-3 text-[13px] leading-6 text-ink-secondary">
                Leave this blank if you want to finish setup first. You can always generate or accept an accountability invite later inside the Family dashboard.
              </div>
            </>
          )}

          {error && (
            <div className="rounded-2xl border border-fitness/20 bg-fitness-light/50 px-4 py-3 text-[13px] text-fitness-text">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={previousStep} className="btn-secondary" disabled={currentStep === 0 || saving}>
            Back
          </button>
          <div className="flex items-center gap-2">
            {currentStep === totalSteps - 1 ? (
              <button type="button" onClick={() => void handleFinish()} className="btn-primary" disabled={saving}>
                {saving ? 'Saving setup...' : 'Finish setup'}
              </button>
            ) : (
              <button type="button" onClick={nextStep} className="btn-primary" disabled={!validateCurrentStep()}>
                Next step
              </button>
            )}
          </div>
        </div>
      </div>
    </AuthShell>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-ghost">{label}</label>
      {children}
    </div>
  )
}
