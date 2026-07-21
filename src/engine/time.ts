// 时间与交易日判断 — A 股市场（北京时间 Asia/Shanghai）

interface ZonedParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  weekday: number // 0=周日 ... 6=周六
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
}

function getZonedParts(timeZone: string, now: Date = new Date()): ZonedParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short',
  }).formatToParts(now)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  let hour = parseInt(get('hour'), 10)
  if (hour === 24) hour = 0
  return {
    year: parseInt(get('year'), 10),
    month: parseInt(get('month'), 10),
    day: parseInt(get('day'), 10),
    hour,
    minute: parseInt(get('minute'), 10),
    weekday: WEEKDAY_INDEX[get('weekday')] ?? 0,
  }
}

export interface TradingTimeInfo {
  session: 'day_am' | 'day_pm' | 'lunch' | 'pre_market' | 'closed'
  description: string
  isTradingDay: boolean
}

/** A 股交易时段：09:30-11:30 / 13:00-15:00（北京时间） */
export function getTradingTime(now: Date = new Date()): TradingTimeInfo {
  const { weekday, hour, minute } = getZonedParts('Asia/Shanghai', now)
  const isTradingDay = weekday >= 1 && weekday <= 5
  const mins = hour * 60 + minute
  if (!isTradingDay) {
    return { session: 'closed', description: weekday === 6 ? '周六休市' : '周日休市', isTradingDay }
  }
  if (mins >= 9 * 60 + 15 && mins < 9 * 60 + 30) return { session: 'pre_market', description: '集合竞价', isTradingDay }
  if (mins >= 9 * 60 + 30 && mins <= 11 * 60 + 30) return { session: 'day_am', description: '上午盘中', isTradingDay }
  if (mins > 11 * 60 + 30 && mins < 13 * 60) return { session: 'lunch', description: '午间休市', isTradingDay }
  if (mins >= 13 * 60 && mins <= 15 * 60) return { session: 'day_pm', description: '下午盘中', isTradingDay }
  return { session: 'closed', description: mins < 9 * 60 + 15 ? '开盘前' : '已收盘', isTradingDay }
}

export function todayDate(now: Date = new Date()): string {
  const { year, month, day } = getZonedParts('Asia/Shanghai', now)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function addCalendarDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00+08:00')
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 北京时间字符串（YYYY-MM-DD HH:mm:ss） */
export function formatNow(now: Date = new Date()): string {
  return now
    .toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
    .replace(/\//g, '-')
}

/** Yahoo unix 秒 → 北京时间交易日 YYYY-MM-DD */
export function yahooTsToDate(ts: number): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(ts * 1000))
}
