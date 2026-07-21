// 本地技术指标 — 100% 客观、零 LLM、可复现（MA / RSI / MACD / 布林 / 百分位）

export function sma(data: number[], period: number): number | null {
  if (data.length < period) return null
  const slice = data.slice(data.length - period)
  return slice.reduce((a, b) => a + b, 0) / period
}

export function latestMA(data: number[], period: number): number | null {
  return sma(data, period)
}

function computeEMA(data: number[], period: number): number[] {
  if (data.length < period) return []
  const k = 2 / (period + 1)
  const out: number[] = []
  out.push(data.slice(0, period).reduce((a, b) => a + b, 0) / period)
  for (let i = period; i < data.length; i++) {
    out.push((data[i] - out[out.length - 1]) * k + out[out.length - 1])
  }
  return out
}

export function rsi(data: number[], period = 14): number[] {
  if (data.length < period + 1) return []
  const out: number[] = []
  for (let i = period; i < data.length; i++) {
    const slice = data.slice(i - period, i + 1)
    let gains = 0
    let losses = 0
    for (let j = 1; j < slice.length; j++) {
      const diff = slice[j] - slice[j - 1]
      if (diff > 0) gains += diff
      else losses -= diff
    }
    if (losses === 0) out.push(100)
    else {
      const rs = gains / losses
      out.push(100 - 100 / (1 + rs))
    }
  }
  return out
}

export function latestRSI(data: number[], period = 14): number | null {
  const v = rsi(data, period)
  return v.length > 0 ? v[v.length - 1] : null
}

export function rsiSignal(value: number): string {
  if (value >= 70) return '超买'
  if (value <= 30) return '超卖'
  if (value >= 60) return '偏强'
  if (value <= 40) return '偏弱'
  return '中性'
}

export interface MACDResult {
  macd: number
  signal: number
  histogram: number
}

export function macd(data: number[], fast = 12, slow = 26, sig = 9): MACDResult[] {
  if (data.length < slow + sig) return []
  const fastEMA = computeEMA(data, fast)
  const slowEMA = computeEMA(data, slow)
  if (fastEMA.length < slow || slowEMA.length < slow) return []

  const macdLine: number[] = []
  for (let i = 0; i < fastEMA.length; i++) {
    const slowIdx = i + (fastEMA.length - slowEMA.length)
    if (slowIdx >= 0 && slowIdx < slowEMA.length) macdLine.push(fastEMA[i] - slowEMA[slowIdx])
  }
  const signalLine = computeEMA(macdLine, sig)
  const out: MACDResult[] = []
  const offset = macdLine.length - signalLine.length
  for (let i = 0; i < signalLine.length; i++) {
    const m = macdLine[i + offset]
    const s = signalLine[i]
    out.push({ macd: m, signal: s, histogram: m - s })
  }
  return out
}

export function latestMACD(data: number[], fast = 12, slow = 26, sig = 9): MACDResult | null {
  const v = macd(data, fast, slow, sig)
  return v.length > 0 ? v[v.length - 1] : null
}

export function macdCross(data: number[]): 'golden' | 'dead' | null {
  const v = macd(data)
  if (v.length < 2) return null
  const prev = v[v.length - 2]
  const cur = v[v.length - 1]
  if (prev.histogram <= 0 && cur.histogram > 0) return 'golden'
  if (prev.histogram >= 0 && cur.histogram < 0) return 'dead'
  return null
}

export interface BollingerBands {
  upper: number
  middle: number
  lower: number
  percentB: number
}

export function latestBollinger(data: number[], period = 20, stdDev = 2): BollingerBands | null {
  if (data.length < period) return null
  const slice = data.slice(data.length - period)
  const mean = slice.reduce((a, b) => a + b, 0) / period
  const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period
  const std = Math.sqrt(variance)
  const upper = mean + stdDev * std
  const lower = mean - stdDev * std
  const cur = data[data.length - 1]
  const percentB = upper === lower ? 0.5 : (cur - lower) / (upper - lower)
  return { upper, middle: mean, lower, percentB }
}

/** 当前值在给定序列中的历史百分位（0-100） */
export function percentile(data: number[], value: number): number {
  if (data.length === 0) return 50
  let count = 0
  for (const d of data) if (d <= value) count++
  return (count / data.length) * 100
}

export function valuationLevel(pct: number): 'low' | 'fair' | 'high' {
  if (pct <= 25) return 'low'
  if (pct >= 75) return 'high'
  return 'fair'
}

/** 近 period 日均振幅（ATR%，用日收盘近似） */
export function atrPct(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null
  let sum = 0
  for (let i = closes.length - period; i < closes.length; i++) {
    sum += (Math.abs(closes[i] - closes[i - 1]) / closes[i - 1]) * 100
  }
  return sum / period
}

/** N 日收益率（%） */
export function periodReturn(closes: number[], period: number): number | null {
  if (closes.length <= period) return null
  const a = closes[closes.length - 1 - period]
  const b = closes[closes.length - 1]
  if (!a || a <= 0 || !b || !Number.isFinite(b)) return null
  return ((b - a) / a) * 100
}
