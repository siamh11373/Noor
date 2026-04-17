export function toDateKey(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Calendar month key for month-scoped notes (YYYY-MM). */
export function monthKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export function parseDateKey(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day, 12)
}

export function startOfWeekKey(date = new Date()): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return toDateKey(d)
}

/** Move calendar anchor by ±months, keeping day-of-month when possible (clamps to last day of target month). */
export function shiftMonthKeepingDay(date: Date, deltaMonths: number): Date {
  const d = new Date(date)
  const y = d.getFullYear()
  const m = d.getMonth() + deltaMonths
  const day = d.getDate()
  const lastDay = new Date(y, m + 1, 0).getDate()
  return new Date(y, m, Math.min(day, lastDay), 12, 0, 0, 0)
}
