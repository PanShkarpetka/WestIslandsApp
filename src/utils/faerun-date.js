export const FAERUN_MONTHS = [
  { key: 'Hammer', name: 'Hammer' },
  { key: 'Alturiak', name: 'Alturiak' },
  { key: 'Ches', name: 'Ches' },
  { key: 'Tarsakh', name: 'Tarsakh' },
  { key: 'Mirtul', name: 'Mirtul' },
  { key: 'Kythorn', name: 'Kythorn' },
  { key: 'Flamerule', name: 'Flamerule' },
  { key: 'Eleasis', name: 'Eleasis' },
  { key: 'Eleint', name: 'Eleint' },
  { key: 'Marpenoth', name: 'Marpenoth' },
  { key: 'Uktar', name: 'Uktar' },
  { key: 'Nightal', name: 'Nightal' },
]

export const DAYS_IN_MONTH = 30
export const DEFAULT_YEAR = 815

function getMonthIndex(month) {
  if (typeof month === 'number') return month
  const normalized = String(month || '').toLowerCase()
  return FAERUN_MONTHS.findIndex(({ name, key }) =>
    name.toLowerCase() === normalized || key.toLowerCase() === normalized,
  )
}

function toOrdinalDay({ day, month, year = DEFAULT_YEAR }) {
  const monthIndex = getMonthIndex(month)
  if (monthIndex < 0) return null
  const safeDay = clampDay(day)
  return year * FAERUN_MONTHS.length * DAYS_IN_MONTH + monthIndex * DAYS_IN_MONTH + (safeDay - 1)
}

export function clampDay(day) {
  const numeric = Number(day) || 1
  return Math.min(Math.max(numeric, 1), DAYS_IN_MONTH)
}

export function formatFaerunDate({ day, month, year = DEFAULT_YEAR }) {
  const monthIndex = getMonthIndex(month)
  const monthName = FAERUN_MONTHS[monthIndex]?.name
  const safeDay = clampDay(day)

  if (!monthName) return ''
  return `${safeDay} ${monthName} ${year} рік після Потопу`
}

export function parseFaerunDate(value) {
  if (!value) return null

  const match = String(value).match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{3,4})/)
  if (!match) return null

  const [, day, monthName, year] = match
  const monthIndex = getMonthIndex(monthName)
  if (monthIndex < 0) return null

  return {
    day: clampDay(Number(day)),
    month: monthIndex,
    year: Number(year) || DEFAULT_YEAR,
  }
}

export function diffInDays(start, end) {
  const startOrdinal = toOrdinalDay(start)
  const endOrdinal = toOrdinalDay(end)
  if (startOrdinal === null || endOrdinal === null) return null
  return endOrdinal - startOrdinal
}

export function normalizeFaerunDate(date) {
  if (!date) return null
  const monthIndex = getMonthIndex(date.month)
  if (monthIndex < 0) return null

  return {
    day: clampDay(date.day),
    month: monthIndex,
    year: date.year ?? DEFAULT_YEAR,
  }
}
