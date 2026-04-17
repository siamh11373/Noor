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
  onTimeBlockDragSessionChange,
}: {
  date: Date
  tasks: CalendarTask[]
  prayerTimes: PrayerTime[]
  focusedTaskId: string | null
  onFocusedTaskIdChange: (id: string | null) => void
  addCalendarTask: (task: Omit<CalendarTask, 'id'>) => string
  updateCalendarTask: (id: string, patch: Partial<Omit<CalendarTask, 'id'>>) => void
  toggleCalendarTask: (id: string) => void
  onTimeBlockDragSessionChange?: (active: boolean) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const dateStr = toDateKey(date)
  const now = new Date()
  const isToday =
    date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  useEffect(() => {
    if (!scrollRef.current) return
    if (isToday) {
      // scroll to 2 hours before current time so current time is near top of viewport
      const scrollTo = Math.max(0, (currentMinutes / 60 - START_HOUR - 2) * HOUR_HEIGHT)
      scrollRef.current.scrollTop = scrollTo
    } else {
      // default past/future dates to 7 AM so the view opens at morning, not midnight
      scrollRef.current.scrollTop = 7 * HOUR_HEIGHT
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
        onTimeBlockDragSessionChange={onTimeBlockDragSessionChange}
      />
    </div>
  )
}
