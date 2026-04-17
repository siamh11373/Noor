'use client'

import { useEffect, useRef } from 'react'
import { toDateKey } from '@/lib/date'
import { CalendarDayColumn } from '@/components/tasks/CalendarDayColumn'
import { HOUR_HEIGHT, START_HOUR } from '@/lib/tasks-calendar'
import type { CalendarTask, PrayerTime } from '@/types'

export function DayCalendarView({
  date,
  tasks,
  prayerTimes,
  focusedTaskId,
  onFocusedTaskIdChange,
  addCalendarTask,
  updateCalendarTask,
  toggleCalendarTask,
}: {
  date: Date
  tasks: CalendarTask[]
  prayerTimes: PrayerTime[]
  focusedTaskId: string | null
  onFocusedTaskIdChange: (id: string | null) => void
  addCalendarTask: (task: Omit<CalendarTask, 'id'>) => string
  updateCalendarTask: (id: string, patch: Partial<Omit<CalendarTask, 'id'>>) => void
  toggleCalendarTask: (id: string) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const dateStr = toDateKey(date)
  const now = new Date()
  const isToday =
    date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  useEffect(() => {
    if (scrollRef.current && isToday) {
      const scrollTo = Math.max(0, (currentMinutes / 60 - START_HOUR - 2) * HOUR_HEIGHT)
      scrollRef.current.scrollTop = scrollTo
    }
  }, [isToday, currentMinutes])

  return (
    <div
      ref={scrollRef}
      data-task-day-grid
      className="overflow-y-auto"
      style={{ height: 'calc(100vh - 180px)' }}
    >
      <CalendarDayColumn
        variant="day"
        scrollParentRef={scrollRef}
        dateStr={dateStr}
        dayDate={date}
        tasks={tasks}
        prayerTimes={prayerTimes}
        focusedTaskId={focusedTaskId}
        onFocusedTaskIdChange={onFocusedTaskIdChange}
        addCalendarTask={addCalendarTask}
        updateCalendarTask={updateCalendarTask}
        toggleCalendarTask={toggleCalendarTask}
      />
    </div>
  )
}
