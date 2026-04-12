'use client'

import { useEffect, useState } from 'react'
import { toDateKey } from '@/lib/date'
import { useSpeechCapture } from '@/hooks/useSpeechCapture'
import { useSalahStore } from '@/lib/store'
import {
  DashboardPanel,
  DashboardShellGrid,
  MetricCard,
  MetricGrid,
  PageHero,
  ProgressBar,
  SectionLabel,
  VoiceButton,
} from '@/components/ui'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { SplitDay, ExerciseType, FoodEntry, Exercise } from '@/types'
import { getWeekDateStrings } from '@/lib/score'

const SPLIT_DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as const
type DayKey = typeof SPLIT_DAYS[number]
const DAY_LABELS: Record<DayKey, string> = {
  monday:'Mon', tuesday:'Tue', wednesday:'Wed', thursday:'Thu',
  friday:'Fri', saturday:'Sat', sunday:'Sun'
}

const EXERCISE_TYPES: ExerciseType[] = ['Gym','Run','Walk','Basketball','Swim','Cycling','Other']
const MUSCLE_GROUPS = ['Chest', 'Back', 'Arms', 'Legs', 'Shoulders', 'Core', 'Full Body', 'Cardio'] as const

const SPLIT_COLORS: Record<string, string> = {
  Chest:     'text-fitness-text bg-fitness-light border-fitness-border',
  Back:      'text-tasks-text bg-tasks-light border-tasks-border',
  Arms:      'text-family-text bg-family-light border-family-border',
  Legs:      'text-faith-text bg-faith-light border-faith-border',
  Shoulders: 'text-amber-700 bg-amber-50 border-amber-200',
  'Full Body':'text-brand-600 bg-brand-50 border-brand-200',
  Cardio:    'text-pink-700 bg-pink-50 border-pink-200',
  Rest:      'text-ink-ghost bg-surface-muted border-surface-border',
}

function guessMeal(date = new Date()): FoodEntry['meal'] {
  const hour = date.getHours()

  if (hour < 11) return 'breakfast'
  if (hour < 15) return 'lunch'
  if (hour < 18) return 'pre-workout'
  if (hour < 21) return 'dinner'
  return 'snack'
}

function timeLabel(date = new Date()) {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

// ─── SPLIT GRID ───────────────────────────────────────────────────────────────

function SplitGrid() {
  const { settings } = useSalahStore()
  const split = settings.weeklySplit
  const todayKey = SPLIT_DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]

  return (
    <div className="grid grid-cols-4 gap-2">
      {SPLIT_DAYS.map(day => {
        const muscle: SplitDay = split[day] ?? 'Rest'
        const isToday = day === todayKey
        const colorClass = SPLIT_COLORS[muscle] ?? SPLIT_COLORS.Rest

        return (
          <div
            key={day}
            title={`${DAY_LABELS[day]} · ${muscle}`}
            className={cn(
              'rounded-2xl border px-2 py-2 text-center transition-all',
              'min-h-[82px] flex flex-col items-center justify-between',
              isToday
                ? cn(colorClass, 'border-[1.5px] shadow-sm')
                : 'bg-surface-raised border-surface-border'
            )}
          >
            <p className={cn('text-[8px] uppercase tracking-[0.18em]', isToday ? '' : 'text-ink-ghost')}>
              {DAY_LABELS[day]}
            </p>

            <div className="flex min-h-[28px] items-center justify-center">
              <p className={cn('text-[10px] font-semibold leading-[1.15]', isToday ? '' : 'text-ink-secondary')}>
                {muscle}
              </p>
            </div>

            <div className={cn(
              'h-1.5 w-1.5 rounded-full',
              muscle === 'Rest' ? 'bg-surface-border' : isToday ? 'bg-current opacity-60' : 'bg-surface-border'
            )} />
          </div>
        )
      })}
    </div>
  )
}

// ─── LOG WORKOUT ──────────────────────────────────────────────────────────────

function LogWorkout() {
  const { getDailyLog, upsertWorkoutSession } = useSalahStore()
  const workout = getDailyLog().fitnessEntries[0]
  const [selected, setSelected] = useState<ExerciseType | null>(workout?.type ?? null)
  const [note, setNote] = useState('')

  useEffect(() => {
    setSelected(workout?.type ?? null)
    setNote(workout?.note ?? '')
  }, [workout?.id, workout?.note, workout?.type])

  function handleLog() {
    if (!selected && !note.trim()) return
    upsertWorkoutSession({ type: selected ?? 'Gym', note: note.trim() })
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {EXERCISE_TYPES.map(ex => (
          <button
            key={ex}
            onClick={() => setSelected(current => current === ex ? null : ex)}
            className={cn(
              'px-3 py-1.5 rounded-full text-[11px] border transition-all',
              selected === ex
                ? 'bg-fitness-light border-fitness-border text-fitness-text font-medium'
                : 'bg-surface-muted border-surface-border text-ink-muted hover:border-fitness-border'
            )}
          >
            {ex}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={note}
          onChange={e => setNote(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLog()}
          placeholder="Notes — e.g. 45 min chest day"
          className="input-base"
        />
        <button onClick={handleLog} disabled={!selected && !note.trim()} className={cn('btn-primary px-4', !selected && !note.trim() && 'opacity-40 cursor-not-allowed')}>
          Log
        </button>
      </div>
    </div>
  )
}

// ─── EXERCISE CARD ────────────────────────────────────────────────────────────

function ExerciseCard({
  exercise,
  onAddSet,
}: {
  exercise: Exercise
  onAddSet: (exercise: Exercise) => void
}) {
  return (
    <div className="bg-surface-card border border-surface-border rounded-xl p-3.5">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[13px] font-semibold text-ink-primary">{exercise.name}</span>
        <span className="text-[9px] font-medium bg-fitness-light text-fitness-text px-2 py-0.5 rounded-full">{exercise.muscleGroup}</span>
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {exercise.sets.map((set, i) => (
          <div key={i} className={cn('text-[10px] px-2.5 py-1.5 rounded-lg border', set.isPersonalRecord ? 'bg-faith-light border-faith-border text-faith-text font-semibold' : 'bg-surface-muted border-surface-border text-ink-muted')}>
            {set.weight} × {set.reps}{set.isPersonalRecord && ' — PR'}
          </div>
        ))}
        <button onClick={() => onAddSet(exercise)} className="text-[10px] px-2.5 py-1.5 rounded-lg border border-dashed border-surface-border text-ink-ghost hover:border-fitness-border transition-colors">
          + set
        </button>
      </div>
    </div>
  )
}

// ─── FOOD LOG ─────────────────────────────────────────────────────────────────

function FoodLog() {
  const { foodLog, addFoodEntry } = useSalahStore()
  const {
    transcript,
    listening,
    supported,
    error,
    startListening,
    stopListening,
    reset,
  } = useSpeechCapture()
  const today = toDateKey(new Date())
  const todayFood = foodLog.filter(f => f.date === today)
  const [open, setOpen] = useState(false)
  const [description, setDescription] = useState('')
  const [meal, setMeal] = useState<FoodEntry['meal']>(guessMeal())

  useEffect(() => {
    if (!open) {
      reset()
      return
    }

    setDescription('')
    setMeal(guessMeal())
  }, [open, reset])

  useEffect(() => {
    if (transcript) {
      setDescription(transcript)
    }
  }, [transcript])

  function handleSave() {
    if (!description.trim()) {
      return
    }

    addFoodEntry({
      description: description.trim(),
      meal,
      date: today,
      time: timeLabel(),
    })
    reset()
    setOpen(false)
  }

  return (
    <div>
      <VoiceButton
        label="Say what you ate"
        hint='"Two eggs and toast for breakfast"'
        onClick={() => setOpen(true)}
        className="mb-3"
      />

      <div className="grid grid-cols-4 gap-2 mb-4">
        {([
          { label: 'Calories', val: '1,840', goal: '2,400', pct: 77, color: 'bg-fitness' },
          { label: 'Protein',  val: '142g',  goal: '180g',  pct: 79, color: 'bg-tasks' },
          { label: 'Carbs',    val: '195g',  goal: '240g',  pct: 81, color: 'bg-family' },
          { label: 'Fats',     val: '58g',   goal: '80g',   pct: 73, color: 'bg-faith' },
        ] as const).map(({ label, val, goal, pct, color }) => (
          <div key={label} className="bg-surface-raised border border-surface-border rounded-xl p-3 text-center">
            <p className="text-[9px] text-ink-ghost mb-1">{label}</p>
            <p className="text-[15px] font-bold text-ink-primary">{val}</p>
            <ProgressBar value={pct} color={color} className="mt-1.5" />
            <p className="text-[9px] text-ink-ghost mt-1">of {goal}</p>
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        {todayFood.length === 0 ? (
          <div className="text-center py-5 text-[12px] text-ink-ghost border border-dashed border-surface-border rounded-xl">
            No food logged yet — say what you ate
          </div>
        ) : (
          todayFood.map(entry => (
            <div key={entry.id} className="flex items-center gap-2 px-3 py-2.5 bg-surface-raised border border-surface-border rounded-xl">
              <div className="w-1.5 h-1.5 rounded-full bg-fitness flex-shrink-0" />
              <span className="flex-1 text-[12px] text-ink-secondary">{entry.description}</span>
              <span className="text-[10px] text-ink-ghost capitalize">{entry.meal}</span>
            </div>
          ))
        )}

        {/* Demo entries */}
        {todayFood.length === 0 && (
          <>
            {[
              { text: '2 eggs + toast + protein shake', meal: 'Breakfast', cal: '480 cal', pro: '42g pro', dot: 'bg-fitness' },
              { text: 'Chicken rice bowl + salad', meal: 'Lunch', cal: '620 cal', pro: '65g pro', dot: 'bg-tasks' },
              { text: 'Banana + oats', meal: 'Pre-workout', cal: '320 cal', pro: '8g pro', dot: 'bg-faith' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 bg-surface-raised border border-surface-border rounded-xl">
                <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', item.dot)} />
                <span className="flex-1 text-[12px] text-ink-secondary">{item.text}</span>
                <div className="flex gap-2.5 text-[10px] text-ink-ghost">
                  <span>{item.pro}</span>
                  <span>{item.cal}</span>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log food</DialogTitle>
            <DialogDescription>
              Capture your meal by voice, then adjust the transcript before saving it to today’s nutrition log.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-xl border border-tasks-border bg-tasks-light p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[13px] font-medium text-tasks-text">
                    {listening ? 'Listening… describe what you ate.' : 'Use your microphone for a quick food entry.'}
                  </p>
                  <p className="mt-1 text-[11px] text-tasks-text/70">
                    {supported ? 'You can still edit the transcript or type instead.' : 'Speech recognition is unavailable here. Type the meal below instead.'}
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
                placeholder="For example: Chicken rice bowl, salad, and a protein shake"
              />
            </div>
          </div>

          <DialogFooter>
            <button onClick={() => setOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button onClick={handleSave} className="btn-primary" disabled={!description.trim()}>
              Save food log
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function FitnessPage() {
  const { settings, personalRecords, getDailyLog } = useSalahStore()
  const today = new Date()
  const todayKey = SPLIT_DAYS[today.getDay() === 0 ? 6 : today.getDay() - 1]
  const todayMuscle: SplitDay = settings.weeklySplit[todayKey] ?? 'Rest'
  const todayWorkout = getDailyLog().fitnessEntries[0]
  const todayExercises = todayWorkout?.exercises ?? []
  const [historyOpen, setHistoryOpen] = useState(false)
  const [exerciseOpen, setExerciseOpen] = useState(false)
  const [setExercise, setSetExercise] = useState<Exercise | null>(null)

  // Week session count
  const weekDates = getWeekDateStrings()
  const weekSessions = weekDates.reduce((n, date) => n + (getDailyLog(date)?.fitnessEntries.length ?? 0), 0)

  const defaultPRs = [
    { exercise: 'Bench press', weight: 185, reps: 5, date: '' },
    { exercise: 'Squat',       weight: 225, reps: 5, date: '' },
    { exercise: 'Deadlift',    weight: 275, reps: 1, date: '' },
    { exercise: 'OHP',         weight: 115, reps: 5, date: '' },
  ]
  const prs = personalRecords.length ? personalRecords : defaultPRs

  return (
    <div className="space-y-5 px-6 py-6">
      <PageHero
        eyebrow="Your Week, Illuminated"
        title={`Today's workout · ${todayMuscle}`}
        description="Log your session, capture exercises, and keep nutrition close to the same operating surface."
        actions={
          <>
            <button onClick={() => setHistoryOpen(true)} className="btn-secondary text-[12px] px-3 py-1.5">View history</button>
            <button onClick={() => setExerciseOpen(true)} className="btn-primary text-[12px] px-3 py-1.5">+ Add exercise</button>
          </>
        }
      />

      <MetricGrid>
        <MetricCard label="Sessions" value={weekSessions} hint="Logged this week" tone="fitness" />
        <MetricCard label="Today's split" value={todayMuscle} hint={today.toLocaleDateString('en-US', { weekday: 'long' })} tone="tasks" />
        <MetricCard label="Exercise count" value={todayExercises.length} hint="Exercises logged in today's session" tone="brand" />
        <MetricCard label="Top PR" value={`${prs[0]?.weight ?? 0} lb`} hint={prs[0]?.exercise ?? 'Bench press'} tone="faith" />
      </MetricGrid>

      <DashboardShellGrid
        main={
          <>
            <DashboardPanel title="Log workout" description="Set the workout type and session notes before you start tracking exercises.">
              <LogWorkout />
            </DashboardPanel>

            <DashboardPanel
              title="Exercises today"
              description="Add exercises first, then build out your sets as you move through the workout."
              action={<span className="text-[12px] text-ink-ghost">{todayExercises.length} logged</span>}
            >
              <div className="space-y-2.5">
                {todayExercises.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-surface-border px-4 py-5 text-[12px] text-ink-ghost">
                    No exercises logged yet. Add one below and then build out your sets.
                  </div>
                ) : (
                  todayExercises.map(exercise => (
                    <ExerciseCard key={exercise.id} exercise={exercise} onAddSet={setSetExercise} />
                  ))
                )}
                <button onClick={() => setExerciseOpen(true)} className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-surface-border py-3 text-[12px] text-ink-ghost hover:border-fitness-border hover:text-fitness-text transition-colors">
                  <span>+ Add exercise or speak it by voice</span>
                </button>
              </div>
            </DashboardPanel>

            <DashboardPanel title="Nutrition" description="Keep food capture and macro progress right next to the workout flow.">
              <FoodLog />
            </DashboardPanel>
          </>
        }
        side={
          <>
            <DashboardPanel title="Weekly split" description="Use your split to make today's training decision fast.">
              <SplitGrid />
            </DashboardPanel>

            <DashboardPanel title="Personal records" description="Your strongest lifts stay visible on the side rail.">
              <div className="space-y-1.5">
                {prs.map(pr => (
                  <div key={pr.exercise} className="flex items-center justify-between rounded-xl border border-surface-border bg-surface-raised px-3 py-2.5">
                    <span className="text-[12px] text-ink-secondary">{pr.exercise}</span>
                    <div className="text-right">
                      <p className="text-[15px] font-semibold leading-none text-ink-primary">{pr.weight} lb</p>
                      <p className="mt-0.5 text-[9px] text-faith-text">+5 this month</p>
                    </div>
                  </div>
                ))}
              </div>
            </DashboardPanel>

            <DashboardPanel title="Monthly progress" description="Progress stays visible without leaving the workout page.">
              <div className="space-y-3">
                {[
                  { label: 'Sessions', val: '16/20', pct: 80, color: 'bg-fitness' },
                  { label: 'Protein goal', val: '19/26 days', pct: 73, color: 'bg-tasks' },
                  { label: 'Cals on target', val: '20/26 days', pct: 77, color: 'bg-faith' },
                ].map(({ label, val, pct, color }) => (
                  <div key={label}>
                    <div className="mb-1 flex justify-between text-[11px]">
                      <span className="text-ink-muted">{label}</span>
                      <span className="font-medium text-ink-primary">{val}</span>
                    </div>
                    <ProgressBar value={pct} color={color} />
                  </div>
                ))}
              </div>
            </DashboardPanel>

            <DashboardPanel title="This week" description="A quick visual for how training volume is stacking across the week.">
              <div className="rounded-xl border border-surface-border bg-surface-raised p-3">
                <div className="mb-1.5 flex h-10 items-end gap-1">
                  {[80, 90, 20, 65, 8, 6, 4].map((height, index) => (
                    <div
                      key={index}
                      className="flex-1 rounded-t-sm transition-all"
                      style={{
                        height: `${height}%`,
                        background: index === 3 ? 'rgb(var(--fitness))' : height > 20 ? 'var(--fitness-bar-soft)' : 'var(--chart-track)',
                      }}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-[9px] text-ink-ghost">
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
                    <span key={index} className={index === 3 ? 'font-semibold text-fitness-text' : ''}>{day}</span>
                  ))}
                </div>
              </div>
            </DashboardPanel>
          </>
        }
      />

      <WorkoutHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} />
      <ExerciseComposerDialog open={exerciseOpen} onOpenChange={setExerciseOpen} />
      <SetComposerDialog exercise={setExercise} onOpenChange={open => !open && setSetExercise(null)} />
    </div>
  )
}

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
            Review the sessions already logged this week, including notes and exercise count.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {entries.length === 0 ? (
            <div className="rounded-xl border border-dashed border-surface-border px-4 py-6 text-center text-[12px] text-ink-ghost">
              No workouts logged this week yet.
            </div>
          ) : (
            entries.map(({ date, entry }) => (
              <div key={entry.id} className="rounded-xl border border-surface-border bg-surface-raised px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-semibold text-ink-primary">{entry.type}</p>
                    <p className="mt-1 text-[11px] text-ink-muted">{entry.note || 'No notes added'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[12px] font-medium text-ink-primary">{entry.exercises.length} exercises</p>
                    <p className="mt-1 text-[10px] text-ink-ghost">{date}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <button onClick={() => onOpenChange(false)} className="btn-primary">
            Done
          </button>
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
  const {
    transcript,
    listening,
    supported,
    error,
    startListening,
    stopListening,
    reset,
  } = useSpeechCapture()
  const [name, setName] = useState('')
  const [muscleGroup, setMuscleGroup] = useState<string>('Arms')

  useEffect(() => {
    if (!open) {
      reset()
      return
    }

    setName('')
    setMuscleGroup('Arms')
  }, [open, reset])

  useEffect(() => {
    if (transcript) {
      setName(transcript)
    }
  }, [transcript])

  function handleSave() {
    if (!name.trim()) {
      return
    }

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
            Add an exercise to today’s workout. You can type it directly or capture the name by voice first.
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
                  {supported ? 'You can edit the result before saving.' : 'Speech recognition is unavailable here. Type the exercise below instead.'}
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
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-ink-ghost">Exercise name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="input-base"
              placeholder="For example: Incline dumbbell press"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-ink-ghost">Muscle group</label>
            <select value={muscleGroup} onChange={e => setMuscleGroup(e.target.value)} className="input-base">
              {MUSCLE_GROUPS.map(group => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>
          </div>
        </div>

        <DialogFooter>
          <button onClick={() => onOpenChange(false)} className="btn-secondary">
            Cancel
          </button>
          <button onClick={handleSave} className="btn-primary" disabled={!name.trim()}>
            Add exercise
          </button>
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
    if (exercise) {
      setWeight('')
      setReps('')
    }
  }, [exercise])

  function handleSave() {
    if (!exercise) {
      return
    }

    const nextReps = Number(reps)
    if (!nextReps) {
      return
    }

    addSetToExercise(exercise.id, {
      weight: Number(weight) || 0,
      reps: nextReps,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={Boolean(exercise)} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(92vw,460px)]">
        <DialogHeader>
          <DialogTitle>Add set</DialogTitle>
          <DialogDescription>
            {exercise ? `Log the next set for ${exercise.name}.` : 'Log the next set.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-ink-ghost">Weight</label>
            <input
              type="number"
              min="0"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              className="input-base"
              placeholder="0"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-ink-ghost">Reps</label>
            <input
              type="number"
              min="1"
              value={reps}
              onChange={e => setReps(e.target.value)}
              className="input-base"
              placeholder="8"
            />
          </div>
        </div>

        <DialogFooter>
          <button onClick={() => onOpenChange(false)} className="btn-secondary">
            Cancel
          </button>
          <button onClick={handleSave} className="btn-primary" disabled={!exercise || !Number(reps)}>
            Save set
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
