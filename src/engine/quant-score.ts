// 纯量化评分引擎 — deterministic、零 LLM（大A红利指数）
// 全部因子基于 Yahoo 真实日线历史计算，保证可复现、可审计。

import { atrPct, latestBollinger, latestMA, latestMACD, latestRSI, percentile, periodReturn } from './indicators'

export interface QuantFactor {
  name: string
  rawValue: number
  signal: number // 归一化 0-100（越高越偏多）
  weight: number
  contribution: number
}

export interface QuantScoreResult {
  score: number
  direction: 'bullish' | 'bearish' | 'neutral'
  factors: Record<string, QuantFactor>
}

export interface QuantScoreInput {
  /** 主指数日线收盘 */
  closes: number[]
  /** 低波代理日线收盘（用于相对强弱），可缺省 */
  lowVolCloses?: number[]
}

// 权重合计 = 1.00，全部来源于真实价格历史
const WEIGHTS: Record<string, number> = {
  trend: 0.22,
  rsi: 0.14,
  macd: 0.14,
  bollinger: 0.1,
  valuation: 0.18,
  volatility: 0.1,
  relativeStrength: 0.12,
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}
function w(k: string): number {
  return WEIGHTS[k] ?? 0
}

function trendFactor(closes: number[]): QuantFactor {
  const ma = latestMA(closes, 20)
  const cur = closes[closes.length - 1]
  const dev = ma != null && ma > 0 ? ((cur - ma) / ma) * 100 : 0
  return { name: '趋势(MA20乖离)', rawValue: Math.round(dev * 100) / 100, signal: clamp(50 + dev * 6, 10, 90), weight: w('trend'), contribution: 0 }
}

function rsiFactor(closes: number[]): QuantFactor {
  const raw = latestRSI(closes, 14) ?? 50
  return { name: 'RSI(14)', rawValue: Math.round(raw * 100) / 100, signal: Math.round(clamp(raw, 5, 95)), weight: w('rsi'), contribution: 0 }
}

function macdFactor(closes: number[]): QuantFactor {
  const m = latestMACD(closes)
  const raw = m?.histogram ?? 0
  const cur = closes[closes.length - 1]
  const scaled = cur > 0 ? (raw / cur) * 1000 : 0
  return { name: 'MACD动能', rawValue: Math.round(scaled * 100) / 100, signal: clamp(50 + scaled * 6, 10, 90), weight: w('macd'), contribution: 0 }
}

function bollingerFactor(closes: number[]): QuantFactor {
  const bb = latestBollinger(closes, 20, 2)
  const pB = bb?.percentB ?? 0.5
  // 红利偏防御：越靠下轨（低 %B）越具吸引力（高分）
  return { name: '布林带(%B)', rawValue: Math.round(pB * 1000) / 1000, signal: clamp((1 - pB) * 100, 10, 90), weight: w('bollinger'), contribution: 0 }
}

function valuationFactor(closes: number[]): QuantFactor {
  const lookback = closes.slice(-250)
  const cur = closes[closes.length - 1]
  const pct = lookback.length >= 20 ? percentile(lookback, cur) : 50
  // 高百分位=贵=低分；低百分位=便宜=红利更具配置价值=高分
  return { name: '估值(点位百分位)', rawValue: Math.round(pct * 10) / 10, signal: clamp(100 - pct, 10, 90), weight: w('valuation'), contribution: 0 }
}

function volatilityFactor(closes: number[]): QuantFactor {
  const atr = atrPct(closes, 14) ?? 1
  // 红利策略偏好低波：波动越低越高分
  const signal = clamp(50 + (1.0 - atr) * 25, 25, 78)
  return { name: '波动率(ATR%)', rawValue: Math.round(atr * 100) / 100, signal: Math.round(signal), weight: w('volatility'), contribution: 0 }
}

function relativeStrengthFactor(main: number[], lowVol: number[]): QuantFactor {
  const mainRet = periodReturn(main, 20)
  const lvRet = periodReturn(lowVol, 20)
  const rel = mainRet != null && lvRet != null ? lvRet - mainRet : 0
  // 低波相对红利占优 → 防御风格得到确认，红利稳定性提升，温和加分
  return { name: '相对强弱(低波/红利)', rawValue: Math.round(rel * 100) / 100, signal: clamp(50 + rel * 4, 20, 80), weight: w('relativeStrength'), contribution: 0 }
}

export function computeQuantScore(input: QuantScoreInput): QuantScoreResult {
  const { closes, lowVolCloses } = input
  if (closes.length < 20) {
    const factors: QuantScoreResult['factors'] = {}
    for (const [k, weight] of Object.entries(WEIGHTS)) {
      factors[k] = { name: k, rawValue: 0, signal: 50, weight, contribution: 50 * weight }
    }
    return { score: 50, direction: 'neutral', factors }
  }

  const factors: QuantScoreResult['factors'] = {}
  factors.trend = trendFactor(closes)
  factors.rsi = rsiFactor(closes)
  factors.macd = macdFactor(closes)
  factors.bollinger = bollingerFactor(closes)
  factors.valuation = valuationFactor(closes)
  factors.volatility = volatilityFactor(closes)
  if (lowVolCloses && lowVolCloses.length >= 21) {
    factors.relativeStrength = relativeStrengthFactor(closes, lowVolCloses)
  } else {
    factors.relativeStrength = { name: '相对强弱(低波/红利)', rawValue: 0, signal: 50, weight: w('relativeStrength'), contribution: 0 }
  }

  let total = 0
  let weightSum = 0
  for (const f of Object.values(factors)) {
    f.contribution = Math.round(f.signal * f.weight * 100) / 100
    total += f.contribution
    weightSum += f.weight
  }
  if (weightSum > 0 && Math.abs(weightSum - 1) > 0.01) total = total / weightSum

  const score = Math.round(clamp(total, 0, 100))
  return { score, direction: score >= 58 ? 'bullish' : score <= 42 ? 'bearish' : 'neutral', factors }
}

export function directionLabel(d: 'bullish' | 'bearish' | 'neutral'): string {
  return d === 'bullish' ? '偏多' : d === 'bearish' ? '偏空' : '中性'
}
