import { addFaerunDays, formatFaerunDate, getFaerunSeason, parseFaerunDate } from './faerun-date.js'

const FORECAST_DAYS = 7
const REAL_WEATHER_TIME_ZONE = 'Europe/Kiev'

const DEFAULT_EFFECTS = {
  dcModifier: 0,
  sumModifier: { type: 'fixed', value: 0, label: '' },
  fishValueMultiplier: 1,
  treasureChanceMultiplier: 1,
}

const WEATHER_POOLS = {
  winter: [
    weather('cool-trade-wind', 'Прохолодний пасат', 'Свіжий морський вітер тримає воду прозорою, але не лякає рибу.', 'mdi-weather-windy', 34, { fishValueMultiplier: 1.05 }),
    weather('cold-rain', 'Холодний дощ', 'Низькі хмари й колючий дощ роблять риболовлю повільнішою.', 'mdi-weather-pouring', 22, { dcModifier: 1, sumModifier: fixed(-1) }),
    weather('winter-squall', 'Зимовий шквал', 'Різкий вітер жене хвилю, а після ударів прибою з дна підіймає старі речі.', 'mdi-weather-lightning-rainy', 12, { dcModifier: 2, sumModifier: dice('-1d4'), treasureChanceMultiplier: 1.5 }),
    weather('clear-cool-water', 'Ясна прохолода', 'Прохолодний ясний день із тихою водою біля берега.', 'mdi-weather-partly-cloudy', 24, { dcModifier: -1 }),
    weather('anomalous-chill', 'Аномальна холоднеча', 'Незвично холодний фронт стискає острів, і риба стає рідкіснішою, але ціннішою.', 'mdi-snowflake-alert', 3, { dcModifier: 2, fishValueMultiplier: 1.25 }),
  ],
  spring: [
    weather('clear-trade-wind', 'Ясний пасат', 'Рівний вітер і тепла вода роблять день зручним для риболовлі.', 'mdi-weather-sunny', 30, { dcModifier: -1 }),
    weather('warm-rain', 'Теплий дощ', 'Коротка тепла злива оживляє воду й жене рибу ближче до поверхні.', 'mdi-weather-rainy', 26, { sumModifier: dice('+1d4') }),
    weather('spring-thunderstorm', 'Весняна гроза', 'Гроза швидко проходить, лишаючи неспокійну воду й шанс на несподівані знахідки.', 'mdi-weather-lightning-rainy', 12, { dcModifier: 1, treasureChanceMultiplier: 1.25 }),
    weather('changeable-clouds', 'Мінлива хмарність', 'Сонце й хмари міняються місцями, море лишається передбачуваним.', 'mdi-weather-partly-cloudy', 25),
    weather('blooming-shallows', 'Живі мілини', 'Теплі мілини наповнюються дрібною здобиччю, за якою підходить більша риба.', 'mdi-waves', 7, { sumModifier: fixed(1) }),
  ],
  summer: [
    weather('scorching-heat', 'Палюча спека', 'Сонце пече воду біля поверхні, і риба йде глибше.', 'mdi-white-balance-sunny', 21, { dcModifier: 1, fishValueMultiplier: 0.9 }),
    weather('stifling-calm', 'Задушливий штиль', 'Повітря стоїть нерухомо, вода важка й сонна.', 'mdi-weather-hazy', 15, { sumModifier: fixed(-2), treasureChanceMultiplier: 0.75 }),
    weather('tropical-downpour', 'Тропічна злива', 'Стіна теплого дощу збиває поверхню, але приносить поживу в прибережні води.', 'mdi-weather-pouring', 24, { dcModifier: 1, sumModifier: dice('+1d4') }),
    weather('tropical-storm', 'Тропічний шторм', 'Важкі хвилі й вітер ускладнюють лов, зате море може винести щось дороге.', 'mdi-weather-hurricane', 7, { dcModifier: 2, sumModifier: dice('-1d6'), fishValueMultiplier: 1.25, treasureChanceMultiplier: 2 }),
    weather('bright-trade-wind', 'Світлий пасат', 'Спекотно, але вітер тримає море живим і зручним.', 'mdi-weather-sunny', 33, { dcModifier: -1 }),
  ],
  autumn: [
    weather('humid-wind', 'Вологий вітер', 'Важкий морський вітер ворушить воду й приносить активну рибу до берега.', 'mdi-weather-windy', 28, { sumModifier: fixed(1) }),
    weather('post-storm-water', 'Післяштормова вода', 'Каламутна вода після бурі ховає рибу, але приносить цінний улов і уламки.', 'mdi-waves-arrow-up', 16, { dcModifier: 1, fishValueMultiplier: 1.15, treasureChanceMultiplier: 1.5 }),
    weather('autumn-storm', 'Осінній шторм', 'Сезонний шторм здіймає хвилі й робить море небезпечнішим.', 'mdi-weather-hurricane', 10, { dcModifier: 2, sumModifier: dice('-1d4'), treasureChanceMultiplier: 1.75 }),
    weather('soft-rain', 'Тихий дощ', 'Рівний теплий дощ приглушує берег і робить рибу сміливішою.', 'mdi-weather-rainy', 22, { sumModifier: dice('+1d4') }),
    weather('broken-clouds', 'Рвана хмарність', 'Хмари й сонце проходять швидко, лишаючи море майже звичайним.', 'mdi-weather-partly-cloudy', 24),
  ],
}

function weather(id, title, summary, icon, weight, effects = {}) {
  return {
    id,
    title,
    summary,
    icon,
    weight,
    effects: {
      ...DEFAULT_EFFECTS,
      ...effects,
      sumModifier: effects.sumModifier || DEFAULT_EFFECTS.sumModifier,
    },
  }
}

function fixed(value) {
  const n = Number(value || 0)
  return { type: 'fixed', value: n, label: n > 0 ? `+${n}` : String(n) }
}

function dice(notation) {
  const value = String(notation || '').trim()
  return { type: 'dice', notation: value, label: value }
}

function hashString(value) {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function createSeededRng(seed) {
  let state = hashString(seed || 'west-islands-weather') || 1
  return () => {
    state = Math.imul(1664525, state) + 1013904223
    return ((state >>> 0) / 4294967296)
  }
}

function pickWeighted(pool, rng) {
  const total = pool.reduce((sum, item) => sum + Math.max(0, Number(item.weight || 0)), 0)
  let roll = rng() * total
  for (const item of pool) {
    roll -= Math.max(0, Number(item.weight || 0))
    if (roll <= 0) return item
  }
  return pool[pool.length - 1]
}

function toJsDate(value) {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value.toDate === 'function') {
    const date = value.toDate()
    return Number.isNaN(date?.getTime?.()) ? null : date
  }
  if (typeof value.seconds === 'number') {
    const date = new Date(value.seconds * 1000 + Math.floor(Number(value.nanoseconds || 0) / 1000000))
    return Number.isNaN(date.getTime()) ? null : date
  }
  if (typeof value === 'number' || typeof value === 'string') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }
  return null
}

function dateOrdinalInTimeZone(value, timeZone = REAL_WEATHER_TIME_ZONE) {
  const date = toJsDate(value)
  if (!date) return null

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date)

  const year = Number(parts.find((part) => part.type === 'year')?.value)
  const month = Number(parts.find((part) => part.type === 'month')?.value)
  const day = Number(parts.find((part) => part.type === 'day')?.value)
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null

  return Math.floor(Date.UTC(year, month - 1, day) / 86400000)
}

export function getWeatherPoolForSeason(seasonId) {
  return WEATHER_POOLS[seasonId] ? WEATHER_POOLS[seasonId].map((item) => ({ ...item, effects: { ...item.effects, sumModifier: { ...item.effects.sumModifier } } })) : []
}

function cloneWeatherDay(day) {
  return day ? {
    ...day,
    effects: {
      ...day.effects,
      ...(day.effects?.sumModifier ? { sumModifier: { ...day.effects.sumModifier } } : {}),
    },
  } : null
}

function weatherSeed({ cycleId = '', startedAt = '' } = {}) {
  const startDate = typeof startedAt === 'string' ? parseFaerunDate(startedAt) : startedAt
  return `${cycleId || 'cycle'}:${typeof startedAt === 'string' ? startedAt : formatFaerunDate(startDate)}`
}

function generateWeatherDay({ cycleId = '', startedAt = '', dayOffset = 0 } = {}) {
  const startDate = typeof startedAt === 'string' ? parseFaerunDate(startedAt) : startedAt
  if (!startDate) return null

  const normalizedOffset = Math.max(0, Number(dayOffset || 0))
  const rng = createSeededRng(weatherSeed({ cycleId, startedAt: startDate }))
  let selected = null

  for (let offset = 0; offset <= normalizedOffset; offset += 1) {
    const date = addFaerunDays(startDate, offset)
    const season = getFaerunSeason(date)
    const pool = getWeatherPoolForSeason(season?.id)
    if (!date || !season || !pool.length) return null
    selected = pickWeighted(pool, rng)
  }

  const date = addFaerunDays(startDate, normalizedOffset)
  const season = getFaerunSeason(date)
  if (!date || !season || !selected) return null

  return {
    date: formatFaerunDate(date),
    dayOffset: normalizedOffset,
    seasonId: season.id,
    weatherId: selected.id,
    title: selected.title,
    summary: selected.summary,
    icon: selected.icon,
    effects: {
      ...selected.effects,
      sumModifier: { ...selected.effects.sumModifier },
    },
  }
}

export function generateCycleWeatherForecast({ cycleId = '', startedAt = '', days = FORECAST_DAYS, startDayOffset = 0 } = {}) {
  const forecast = []
  const count = Math.max(0, Number(days || 0))
  const offset = Math.max(0, Number(startDayOffset || 0))

  for (let idx = 0; idx < count; idx += 1) {
    const day = generateWeatherDay({ cycleId, startedAt, dayOffset: offset + idx })
    if (day) forecast.push(day)
  }

  return forecast
}

export function getRealWeatherDayOffset(cycle = {}, { now = new Date(), timeZone = REAL_WEATHER_TIME_ZONE } = {}) {
  const startOrdinal = dateOrdinalInTimeZone(cycle.createdAt, timeZone)
  const nowOrdinal = dateOrdinalInTimeZone(now, timeZone)
  if (startOrdinal === null || nowOrdinal === null) return 0
  return Math.max(0, nowOrdinal - startOrdinal)
}

export function resolveCycleWeather(cycle = {}, options = {}) {
  const forecast = Array.isArray(cycle.weatherForecast) && cycle.weatherForecast.length
    ? cycle.weatherForecast
    : []

  const dayOffset = getRealWeatherDayOffset(cycle, options)
  return cloneWeatherDay(forecast.find((day) => Number(day.dayOffset) === dayOffset))
    || cloneWeatherDay(dayOffset < forecast.length ? forecast[dayOffset] : null)
    || generateWeatherDay({ cycleId: cycle.id, startedAt: cycle.startedAt, dayOffset })
}

export function generateRollingCycleWeatherForecast(cycle = {}, options = {}) {
  const dayOffset = getRealWeatherDayOffset(cycle, options)
  return generateCycleWeatherForecast({
    cycleId: cycle.id,
    startedAt: cycle.startedAt,
    startDayOffset: dayOffset,
    days: FORECAST_DAYS,
  })
}
