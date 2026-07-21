// Yahoo Finance 数据层 — 真实行情，零 API Key、零 LLM
// 作为「数据可靠性」的 A 级锚定源：实时报价 + 日线历史。

import { addCalendarDays, todayDate, yahooTsToDate } from './time'

const USER_AGENT = 'hongliRush/0.2 (A-share dividend research CLI)'
const HOSTS = ['https://query1.finance.yahoo.com', 'https://query2.finance.yahoo.com']

export interface LiveQuote {
  symbol: string
  price: number
  previousClose: number
  changePct: number
  fiftyTwoWeekHigh: number | null
  fiftyTwoWeekLow: number | null
  currency: string | null
  longName: string | null
  timestamp: string
  date: string
}

export interface DailyBar {
  date: string
  close: number
  high: number | null
  low: number | null
  volume: number | null
}

interface ChartMeta {
  symbol?: string
  regularMarketPrice?: number
  chartPreviousClose?: number
  previousClose?: number
  regularMarketTime?: number
  fiftyTwoWeekHigh?: number
  fiftyTwoWeekLow?: number
  currency?: string
  longName?: string
  shortName?: string
}

interface ChartResult {
  meta?: ChartMeta
  timestamp?: number[]
  indicators?: { quote?: Array<{ close?: (number | null)[]; high?: (number | null)[]; low?: (number | null)[]; volume?: (number | null)[] }> }
}

interface ChartResponse {
  chart?: { result?: ChartResult[]; error?: { description?: string } | null }
}

async function fetchChart(symbol: string, range: string): Promise<ChartResult | null> {
  let lastErr: unknown = null
  for (const host of HOSTS) {
    try {
      const url = `${host}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=${range}`
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
        signal: AbortSignal.timeout(20_000),
      })
      if (!res.ok) {
        lastErr = new Error(`HTTP ${res.status}`)
        continue
      }
      const body = (await res.json()) as ChartResponse
      const err = body.chart?.error?.description
      if (err) {
        lastErr = new Error(err)
        continue
      }
      const result = body.chart?.result?.[0]
      if (result?.meta) return result
    } catch (e) {
      lastErr = e
    }
  }
  const msg = lastErr instanceof Error ? lastErr.message : String(lastErr)
  console.warn(`[yahoo] ${symbol} 拉取失败: ${msg}`)
  return null
}

function rangeForDays(days: number): string {
  if (days <= 35) return '1mo'
  if (days <= 95) return '3mo'
  if (days <= 185) return '6mo'
  if (days <= 370) return '1y'
  return '2y'
}

/** 实时报价（收盘后为当日收盘价） */
export async function fetchLiveQuote(symbol: string): Promise<LiveQuote | null> {
  const result = await fetchChart(symbol, '5d')
  const meta = result?.meta
  if (!meta) return null
  const price = meta.regularMarketPrice
  if (price == null || !Number.isFinite(price)) return null
  const prev = meta.chartPreviousClose ?? meta.previousClose ?? price
  const ts = meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000) : new Date()
  const changePct = prev ? ((price - prev) / prev) * 100 : 0
  return {
    symbol,
    price: Math.round(price * 1000) / 1000,
    previousClose: Math.round(prev * 1000) / 1000,
    changePct: Math.round(changePct * 100) / 100,
    fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? null,
    fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? null,
    currency: meta.currency ?? null,
    longName: meta.longName ?? meta.shortName ?? null,
    timestamp: ts.toISOString(),
    date: yahooTsToDate(meta.regularMarketTime ?? Math.floor(Date.now() / 1000)),
  }
}

/** 日线历史 */
export async function fetchDailyBars(symbol: string, calendarDays: number, asOf: string = todayDate()): Promise<DailyBar[]> {
  const result = await fetchChart(symbol, rangeForDays(calendarDays))
  if (!result) return []
  const from = addCalendarDays(asOf, -(calendarDays - 1))
  const timestamps = result.timestamp ?? []
  const quote = result.indicators?.quote?.[0]
  const closes = quote?.close ?? []
  const highs = quote?.high ?? []
  const lows = quote?.low ?? []
  const volumes = quote?.volume ?? []
  const rows: DailyBar[] = []
  for (let i = 0; i < timestamps.length; i++) {
    const close = closes[i]
    if (close == null || !Number.isFinite(close) || close <= 0) continue
    const date = yahooTsToDate(timestamps[i])
    if (date < from || date > asOf) continue
    rows.push({
      date,
      close: Math.round(close * 1000) / 1000,
      high: highs[i] ?? null,
      low: lows[i] ?? null,
      volume: volumes[i] ?? null,
    })
  }
  return rows.sort((a, b) => a.date.localeCompare(b.date))
}
