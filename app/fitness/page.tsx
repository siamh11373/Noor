'use client'

import { useEffect, useState } from 'react'
import { toDateKey } from '@/lib/date'
import { useSpeechCapture } from '@/hooks/useSpeechCapture'
import { useSalahStore } from '@/lib/store'
import {
  DashboardPanel,
  DashboardShellGrid,
  ProgressBar,
} from '@/components/ui'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { SplitDay, ExerciseType, FoodEntry, Exercise } from '@/types'
import { getWeekDateStrings } from '@/lib/score'

const SPLIT_DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as const
type DayKey = typeof SPLIT_DAYS[number]
const DAY_LABELS: Record<DayKey, string> = {
  monday:'Mon', tuesday:'Tue', wednesday:'Wed', thursday:'Thu',
  friday:'Fri', saturday:'Sat', sunday:'Sun',
}

const EXERCISE_TYPES: ExerciseType[] = ['Gym','Run','Walk','Basketball','Swim','Cycling','Other']
const MUSCLE_GROUPS = ['Chest','Back','Arms','Legs','Shoulders','Core','Full Body','Cardio'] as const

const SPLIT_COLORS: Record<string, string> = {
  Chest:       'text-fitness-text bg-fitness-light border-fitness-border',
  Back:        'text-tasks-text bg-tasks-light border-tasks-border',
  Arms:        'text-family-text bg-family-light border-family-border',
  Legs:        'text-faith-text bg-faith-light border-faith-border',
  Shoulders:   'text-brand-600 bg-brand-100 border-brand-200',
  'Full Body': 'text-brand-500 bg-brand-50 border-brand-200',
  Cardio:      'text-fitness-text bg-fitness-light border-fitness-border',
  Rest:        'text-ink-ghost bg-surface-muted border-surface-border',
}

function guessMeal(date = new Date()): FoodEntry['meal'] {
  const h = date.getHours()
  if (h < 11) return 'breakfast'
  if (h < 15) return 'lunch'
  if (h < 18) return 'pre-workout'
  if (h < 21) return 'dinner'
  return 'snack'
}

function timeLabel(date = new Date()) {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

/* ─── WEEKLY SPLIT PANEL ────────────────────────────────────────────────────── */

function SplitPanel({ todayMuscle }: { todayMuscle: SplitDay }) {
  const { settings } = useSalahStore()
  const split = settings.weeklySplit
  const todayKey = SPLIT_DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]
  const todayColor = SPLIT_COLORS[todayMuscle] ?? SPLIT_COLORS.Rest

  return (
    <div className="space-y-3">
      {/* Today's focus — prominent */}
      <div className={cn('rounded-2xl border px-4 py-3', todayColor)}>
        <p className="text-[11px] font-semibold uppercase tracking-wide opacity-70 mb-0.5">Today</p>
        <p className="text-[22px] font-semibold leading-tight">{todayMuscle}</p>
      </div>

      {/* Week compact row */}
      <div className="grid grid-cols-7 gap-1">
        {SPLIT_DAYS.map(day => {
          const muscle: SplitDay = split[day] ?? 'Rest'
          const isToday = day === todayKey
          const colorClass = SPLIT_COLORS[muscle] ?? SPLIT_COLORS.Rest
          return (
            <div
              key={day}
              title={`${DAY_LABELS[day]} · ${muscle}`}
              className={cn(
                'flex flex-col items-center gap-1 rounded-xl border py-2 text-center',
                isToday ? cn(colorClass, 'shadow-sm') : 'bg-surface-raised border-surface-border',
              )}
            >
              <p className={cn('text-[10px] font-semibold uppercase', isToday ? 'opacity-80' : 'text-ink-ghost')}>
                {DAY_LABELS[day][0]}
              </p>
              <div className={cn(
                'h-1 w-1 rounded-full',
                muscle === 'Rest' ? 'bg-surface-border' : isToday ? 'bg-current opacity-50' : 'bg-ink-faint/40',
              )} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── EXERCISE CARD ──────────────────────────────────────────────────────────── */

function ExerciseCard({
  exercise,
  onAddSet,
}: {
  exercise: Exercise
  onAddSet: (exercise: Exercise) => void
}) {
  return (
    <div className="rounded-2xl border border-surface-border bg-surface-raised p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-[15px] font-semibold text-ink-primary truncate">{exercise.name}</span>
          <span className="shrink-0 rounded-full border border-fitness-border/50 bg-fitness-light px-2.5 py-0.5 text-[11px] font-medium text-fitness-text">
            {exercise.muscleGroup}
          </span>
        </div>
        <button
          onClick={() => onAddSet(exercise)}
          className="btn-primary shrink-0 px-3 py-1.5 text-[13px]"
        >
          + Set
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {exercise.sets.length === 0 ? (
          <p className="text-[13px] italic text-ink-ghost">Tap + Set to log your first set</p>
        ) : (
          exercise.sets.map((set, i) => (
            <div
              key={i}
              className={cn(
                'rounded-xl border px-3 py-2 text-[13px] font-medium',
                set.isPersonalRecord
                  ? 'border-faith-border bg-faith-light text-faith-text'
                  : 'border-surface-border bg-surface-card text-ink-secondary',
              )}
            >
              {set.weight > 0 ? `${set.weight} lb` : 'BW'} × {set.reps}
              {set.isPersonalRecord && <span className="ml-1.5 text-brand-400">★</span>}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

/* ─── FOOD LOG ───────────────────────────────────────────────────────────────── */

function FoodLog() {
  const { foodLog, addFoodEntry } = useSalahStore()
  const { transcript, listening, supported, error, startListening, stopListening, reset } = useSpeechCapture()
  const today = toDateKey(new Date())
  const todayFood = foodLog.filter(f => f.date === today)
  const [open, setOpen] = useState(false)
  const [description, setDescription] = useState('')
  const [meal, setMeal] = useState<FoodEntry['meal']>(guessMeal())

  useEffect(() => {
    if (!open) { reset(); return }
    setDescription('')
    setMeal(guessMeal())
  }, [open, reset])

  useEffect(() => { if (transcript) setDescription(transcript) }, [transcript])

  function handleSave() {
    if (!description.trim()) return
    addFoodEntry({ description: description.trim(), meal, date: today, time: timeLabel() })
    reset()
    setOpen(false)
  }

  return (
    <div>
      {/* Entries */}
      <div className="mb-3 space-y-2">
        {todayFood.length === 0 ? (
          <div className="rounded-xl border border-dashed border-surface-border px-4 py-6 text-center text-[13px] text-ink-ghost">
            No meals logged yet
          </div>
        ) : (
          todayFood.map(entry => (
            <div key={entry.id} className="flex items-center gap-3 rounded-xl border border-surface-border bg-surface-raised px-4 py-3">
              <div className="h-2 w-2 shrink-0 rounded-full bg-fitness" />
              <span className="flex-1 text-[13px] text-ink-primary">{entry.description}</span>
              <span className="text-[12px] capitalize text-ink-ghost">{entry.meal}</span>
            </div>
          ))
        )}
      </div>

      {/* Log trigger */}
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2.5 rounded-xl border border-dashed border-surface-border px-4 py-3 text-[13px] text-ink-ghost transition-colors hover:border-fitness-border hover:text-fitness-text"
      >
        <span className="text-[16px] font-light leading-none">+</span>
        <span>Log a meal — type or speak it</span>
      </button>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log food</DialogTitle>
            <DialogDescription>
              Capture your meal by voice, then adjust the transcript before saving.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-xl border border-tasks-border bg-tasks-light p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[13px] font-medium text-tasks-text">
                    {listening ? 'Listening… describe what you ate.' : 'Use your microphone for a quick entry.'}
                  </p>
                  <p className="mt-1 text-[11px] text-tasks-text/70">
                    {supported ? 'You can still edit the transcript or type instead.' : 'Speech unavailable — type below.'}
                  </p>
                </div>
                {supported && (
                  <button
                    onClick={listening ? stopListening : startListening}
                    className={listening ? 'btn-secondary whitespace-nowrap' : 'btn-primary whitespace-nowrap'}
                  >
                    {listening ? 'Stop' : 'Start'}
                  </button>
                )}
              </div>
              {error && <p className="mt-2 text-[11px] text-fitness-text">{error}</p>}
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-ink-ghost">Meal</label>
              <select value={meal} onChange={e => setMeal(e.target.value as FoodEntry['meal'])} className="input-base">
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="snack">Snack</option>
                <option value="pre-workout">Pre-workout</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-ink-ghost">Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="input-base min-h-[108px] resize-none"
                placeholder="e.g. Chicken rice bowl, salad, and a protein shake"
              />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setOpen(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} className="btn-primary" disabled={!description.trim()}>Save</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ─── PAGE ───────────────────────────────────────────────────────────────────── */

export default function FitnessPage() {
  const { settings, personalRecords, getDailyLog, upsertWorkoutSession } = useSalahStore()
  const today = new Date()
  const todayKey = SPLIT_DAYS[today.getDay() === 0 ? 6 : today.getDay() - 1]
  const todayMuscle: SplitDay = settings.weeklySplit[todayKey] ?? 'Rest'
  const todayWorkout = getDailyLog().fitnessEntries[0]
  const todayExercises = todayWorkout?.exercises ?? []
  const [historyOpen, setHistoryOpen] = useState(false)
  const [exerciseOpen, setExerciseOpen] = useState(false)
  const [setExercise, setSetExercise] = useState<Exercise | null>(null)
  const [selectedType, setSelectedType] = useState<ExerciseType | null>(todayWorkout?.type ?? null)
  const [sessionNote, setSessionNote] = useState(todayWorkout?.note ?? '')

  useEffect(() => {
    setSelectedType(todayWorkout?.type ?? null)
    setSessionNote(todayWorkout?.note ?? '')
  }, [todayWorkout?.id, todayWorkout?.type, todayWorkout?.note])

  const weekDates = getWeekDateStrings()
  const weekSessions = weekDates.reduce((n, date) => n + (getDailyLog(date)?.fitnessEntries.length ?? 0), 0)

  const defaultPRs = [
    { exercise: 'Bench press', weight: 185, reps: 5, date: '' },
    { exercise: 'Squat',       weight: 225, reps: 5, date: '' },
    { exercise: 'Deadlift',    weight: 275, reps: 1, date: '' },
    { exercise: 'OHP',         weight: 115, reps: 5, date: '' },
  ]
  const prs = personalRecords.length ? personalRecords : defaultPRs

  function handleSessionSave() {
    if (!selectedType && !sessionNote.trim()) return
    upsertWorkoutSession({ type: selectedType ?? 'Gym', note: sessionNote.trim() })
  }

  function handleTypeSelect(ex: ExerciseType) {
    const next = selectedType === ex ? null : ex
    setSelectedType(next)
    if (next) upsertWorkoutSession({ type: next, note: sessionNote })
  }

  return (
    <div className="px-5 py-5 xl:px-6">

      {/* ── Session banner ── */}
      <div className="mb-5 flex items-center justify-between rounded-2xl border border-surface-border bg-surface-card px-5 py-4">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-[12px] text-ink-ghost">{"Today's focus"}</p>
            <p className="text-[24px] font-semibold leading-tight text-ink-primary">{todayMuscle}</p>
          </div>
          <div className="mx-1 hidden h-9 w-px bg-surface-border sm:block" />
          <div className="hidden sm:block">
            <p className="text-[14px] text-ink-secondary">
              {weekSessions} session{weekSessions !== 1 ? 's' : ''} this week
            </p>
            {todayExercises.length > 0 && (
              <p className="text-[12px] text-ink-ghost">
                {todayExercises.length} exercise{todayExercises.length !== 1 ? 's' : ''} logged today
              </p>
            )}
          </div>
          {todayWorkout && (
            <span className="rounded-full border border-faith-border bg-faith-light px-3 py-1 text-[12px] font-medium text-faith-text">
              Active · {todayWorkout.type}
            </span>
          )}
        </div>
        <button onClick={() => setHistoryOpen(true)} className="btn-secondary px-4 py-2 text-[13px]">
          History
        </button>
      </div>

      <DashboardShellGrid
        main={
          <div className="space-y-5">

            {/* ── Today's session (workout type + exercises merged) ── */}
            <DashboardPanel
              title={"Today's session"}
              action={
                <button onClick={() => setExerciseOpen(true)} className="btn-primary px-4 py-2 text-[13px]">
                  + Add exercise
                </button>
              }
            >
              {/* Workout type selector */}
              <div className="mb-4 flex flex-wrap gap-2">
                {EXERCISE_TYPES.map(ex => (
                  <button
                    key={ex}
                    onClick={() => handleTypeSelect(ex)}
                    className={cn(
                      'rounded-full border px-3.5 py-1.5 text-[13px] transition-all',
                      selectedType === ex
                        ? 'border-fitness-border bg-fitness-light font-medium text-fitness-text'
                        : 'border-surface-border bg-surface-muted text-ink-muted hover:border-fitness-border',
                    )}
                  >
                    {ex}
                  </button>
                ))}
              </div>

              {/* Session note */}
              <input
                value={sessionNote}
                onChange={e => setSessionNote(e.target.value)}
                onBlur={handleSessionSave}
                onKeyDown={e => e.key === 'Enter' && handleSessionSave()}
                placeholder="Session note — e.g. 45 min shoulders, rear delts focus"
                className="input-base"
              />

              {/* Exercises */}
              {todayExercises.length > 0 ? (
                <div className="mt-5 space-y-3 border-t border-surface-border pt-5">
                  {todayExercises.map(exercise => (
                    <ExerciseCard key={exercise.id} exercise={exercise} onAddSet={setSetExercise} />
                  ))}
                  <button
                    onClick={() => setExerciseOpen(true)}
                    className="flex w-full items-center gap-2 rounded-xl border border-dashed border-surface-border py-3 text-center text-[13px] text-ink-ghost transition-colors hover:border-fitness-border hover:text-fitness-text"
                  >
                    <span className="flex-1">+ Add another exercise</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setExerciseOpen(true)}
                  className="mt-5 w-full cursor-pointer rounded-2xl border-2 border-dashed border-surface-border px-5 py-8 text-center transition-colors hover:border-fitness-border"
                >
                  <p className="text-[15px] font-medium text-ink-primary">No exercises yet</p>
                  <p className="mt-1 text-[13px] text-ink-ghost">Tap to add your first exercise</p>
                </button>
              )}
            </DashboardPanel>

            {/* ── Nutrition ── */}
            <DashboardPanel title="Nutrition" description="Log meals alongside your workout.">
              <FoodLog />
            </DashboardPanel>

          </div>
        }
        side={
          <div className="space-y-5">

            {/* Weekly split */}
            <DashboardPanel title="Weekly split">
              <SplitPanel todayMuscle={todayMuscle} />
            </DashboardPanel>

            {/* Personal records */}
            <DashboardPanel title="Personal records">
              <div className="space-y-2">
                {prs.map(pr => (
                  <div key={pr.exercise} className="flex items-center justify-between rounded-xl border border-surface-border bg-surface-raised px-3 py-2.5">
                    <span className="text-[13px] text-ink-secondary">{pr.exercise}</span>
                    <div className="text-right">
                      <p className="text-[16px] font-semibold leading-none text-ink-primary">{pr.weight} lb</p>
                      <p className="mt-0.5 text-[11px] text-faith-text">+5 this month</p>
                    </div>
                  </div>
                ))}
              </div>
            </DashboardPanel>

            {/* Sessions this month */}
            <DashboardPanel title="Monthly sessions">
              <div>
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="text-[13px] text-ink-muted">Sessions</span>
                  <span className="text-[20px] font-semibold text-ink-primary">
                    {weekSessions}
                    <span className="ml-1 text-[14px] font-normal text-ink-ghost">/ 20</span>
                  </span>
                </div>
                <ProgressBar value={Math.round((weekSessions / 20) * 100)} color="bg-fitness" />
                <p className="mt-2 text-[12px] text-ink-ghost">{20 - weekSessions} sessions left to hit your monthly goal</p>
              </div>
            </DashboardPanel>

          </div>
        }
      />

      <WorkoutHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} />
      <ExerciseComposerDialog open={exerciseOpen} onOpenChange={setExerciseOpen} />
      <SetComposerDialog exercise={setExercise} onOpenChange={open => !open && setSetExercise(null)} />
    </div>
  )
}

/* ─── DIALOGS ────────────────────────────────────────────────────────────────── */

function WorkoutHistoryDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { getDailyLog } = useSalahStore()
  const entries = getWeekDateStrings()
    .flatMap(date => getDailyLog(date).fitnessEntries.map(entry => ({ date, entry })))
    .reverse()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Workout history</DialogTitle>
          <DialogDescription>
            Sessions logged this week, including notes and exercises.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {entries.length === 0 ? (
            <div className="rounded-xl border border-dashed border-surface-border px-4 py-6 text-center text-[13px] text-ink-ghost">
              No workouts logged this week yet.
            </div>
          ) : (
            entries.map(({ date, entry }) => (
              <div key={entry.id} className="rounded-xl border border-surface-border bg-surface-raised px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[14px] font-semibold text-ink-primary">{entry.type}</p>
                    <p className="mt-0.5 text-[12px] text-ink-muted">{entry.note || 'No notes added'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-medium text-ink-primary">{entry.exercises.length} exercises</p>
                    <p className="mt-0.5 text-[11px] text-ink-ghost">{date}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        <DialogFooter>
          <button onClick={() => onOpenChange(false)} className="btn-primary">Done</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ExerciseComposerDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { addExerciseToWorkout } = useSalahStore()
  const { transcript, listening, supported, error, startListening, stopListening, reset } = useSpeechCapture()
  const [name, setName] = useState('')
  const [muscleGroup, setMuscleGroup] = useState<string>('Arms')

  useEffect(() => {
    if (!open) { reset(); return }
    setName('')
    setMuscleGroup('Arms')
  }, [open, reset])

  useEffect(() => { if (transcript) setName(transcript) }, [transcript])

  function handleSave() {
    if (!name.trim()) return
    addExerciseToWorkout({ name: name.trim(), muscleGroup })
    reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add exercise</DialogTitle>
          <DialogDescription>
            Type or speak the exercise name, then pick the muscle group.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-xl border border-tasks-border bg-tasks-light p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[13px] font-medium text-tasks-text">
                  {listening ? 'Listening… say the exercise name.' : 'Use voice to capture the exercise name.'}
                </p>
                <p className="mt-1 text-[11px] text-tasks-text/70">
                  {supported ? 'You can edit the result before saving.' : 'Speech unavailable — type below.'}
                </p>
              </div>
              {supported && (
                <button onClick={listening ? stopListening : startListening} className={listening ? 'btn-secondary whitespace-nowrap' : 'btn-primary whitespace-nowrap'}>
                  {listening ? 'Stop' : 'Start'}
                </button>
              )}
            </div>
            {error && <p className="mt-2 text-[11px] text-fitness-text">{error}</p>}
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-ink-ghost">Exercise name</label>
            <input value={name} onChange={e => setName(e.target.value)} className="input-base" placeholder="e.g. Incline dumbbell press" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-ink-ghost">Muscle group</label>
            <select value={muscleGroup} onChange={e => setMuscleGroup(e.target.value)} className="input-base">
              {MUSCLE_GROUPS.map(group => <option key={group} value={group}>{group}</option>)}
            </select>
          </div>
        </div>
        <DialogFooter>
          <button onClick={() => onOpenChange(false)} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} className="btn-primary" disabled={!name.trim()}>Add exercise</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SetComposerDialog({
  exercise,
  onOpenChange,
}: {
  exercise: Exercise | null
  onOpenChange: (open: boolean) => void
}) {
  const { addSetToExercise } = useSalahStore()
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')

  useEffect(() => {
    if (exercise) { setWeight(''); setReps('') }
  }, [exercise])

  function handleSave() {
    if (!exercise || !Number(reps)) return
    addSetToExercise(exercise.id, { weight: Number(weight) || 0, reps: Number(reps) })
    onOpenChange(false)
  }

  return (
    <Dialog open={Boolean(exercise)} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(92vw,460px)]">
        <DialogHeader>
          <DialogTitle>Add set{exercise ? ` — ${exercise.name}` : ''}</DialogTitle>
          <DialogDescription>Log your weight and reps for this set.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-ink-ghost">Weight (lb)</label>
            <input type="number" min="0" value={weight} onChange={e => setWeight(e.target.value)} className="input-base" placeholder="0" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-ink-ghost">Reps</label>
            <input type="number" min="1" value={reps} onChange={e => setReps(e.target.value)} className="input-base" placeholder="8" />
          </div>
        </div>
        <DialogFooter>
          <button onClick={() => onOpenChange(false)} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} className="btn-primary" disabled={!exercise || !Number(reps)}>Save set</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
