'use client'

import { useEffect, useRef, useState } from 'react'
import { toDateKey } from '@/lib/date'
import { CalendarDayColumn, type WeekDragPreview } from '@/components/tasks/CalendarDayColumn'
import { HOUR_HEIGHT, START_HOUR, TOTAL_HOURS, formatHour } from '@/lib/tasks-calendar'
import { cn } from '@/lib/utils'
import type { CalendarTask, PrayerTime } from '@/types'

function getWeekDates(date: Date): Date[] {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(d)
    dd.setDate(d.getDate() + i)
    return dd
  })
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function WeekCalendarView({
  anchorDate,
  tasks,
  prayerTimesByDate,
  focusedTaskId,
  onFocusedTaskIdChange,
  addCalendarTask,
  updateCalendarTask,
  toggleCalendarTask,
  onOpenDay,
}: {
  anchorDate: Date
  tasks: CalendarTask[]
  prayerTimesByDate: Record<string, PrayerTime[]>
  focusedTaskId: string | null
  onFocusedTaskIdChange: (id: string | null) => void
  addCalendarTask: (task: Omit<CalendarTask, 'id'>) => string
  updateCalendarTask: (id: string, patch: Partial<Omit<CalendarTask, 'id'>>) => void
  toggleCalendarTask: (id: string) => void
  onOpenDay: (d: Date) => void
}) {
  const weekDates = getWeekDates(anchorDate)
  const today = new Date()
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const scrollRef = useRef<HTMLDivElement>(null)
  /** Shared across all day columns so a task can preview on another weekday while dragging. */
  const [weekDragPreview, setWeekDragPreview] = useState<WeekDragPreview | null>(null)
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  useEffect(() => {
    if (scrollRef.current) {
      const scrollTo = Math.max(0, (currentMinutes / 60 - START_HOUR - 2) * HOUR_HEIGHT)
      scrollRef.current.scrollTop = scrollTo
    }
  }, [currentMinutes])

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 180px)' }}>
      <div className="flex border-b border-surface-border">
        <div className="w-14 shrink-0" />
        {weekDates.map((d, i) => {
          const dayIsToday = isSameDay(d, today)
          return (
            <div
              key={i}
              className="min-w-0 flex-1 cursor-pointer py-2 text-center transition-colors hover:bg-surface-muted"
              onClick={() => onOpenDay(d)}
            >
              <p className={cn('text-[10px] uppercase', dayIsToday ? 'font-semibold text-brand-400' : 'text-ink-ghost')}>
                {dayNames[i]}
              </p>
              <p
                className={cn(
                  'mt-0.5 text-[18px] font-semibold',
                  dayIsToday ? 'text-brand-400' : 'text-ink-primary',
                )}
              >
                {d.getDate()}
              </p>
            </div>
          )
        })}
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div data-week-timeline-row className="relative flex" style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}>
          <div className="relative w-14 shrink-0">
            {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
              <div key={i} className="absolute inset-x-0 text-right" style={{ top: i * HOUR_HEIGHT }}>
                <span className="-translate-y-[6px] inline-block pr-2 text-[10px] text-ink-ghost">
                  {formatHour(START_HOUR + i)}
                </span>
              </div>
            ))}
          </div>

          {weekDates.map((d, colIdx) => {
            const dateStr = toDateKey(d)
            const colIsToday = isSameDay(d, today)
            return (
              <div
                key={colIdx}
                data-calendar-column-date={dateStr}
                className={cn(
                  'relative min-w-0 flex-1 border-l border-surface-border',
                  colIsToday && 'bg-brand-50/30',
                )}
              >
                <CalendarDayColumn
                  variant="week"
                  scrollParentRef={scrollRef}
                  dateStr={dateStr}
                  dayDate={d}
                  tasks={tasks}
                  prayerTimes={prayerTimesByDate[dateStr] ?? []}
                  focusedTaskId={focusedTaskId}
                  onFocusedTaskIdChange={onFocusedTaskIdChange}
                  addCalendarTask={addCalendarTask}
                  updateCalendarTask={updateCalendarTask}
                  toggleCalendarTask={toggleCalendarTask}
                  weekDragPreview={weekDragPreview}
                  setWeekDragPreview={setWeekDragPreview}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
