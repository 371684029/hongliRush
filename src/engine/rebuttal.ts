// 强制反驳机制（deterministic）— 正常研判天然偏乐观，独立找看空论据并修正评分。
// 对应 goldRush「强制反驳 Agent」：本地客观指标判定反驳强度，评分下修。

import { atrPct, latestBollinger, latestMA, latestRSI, macdCross, percentile, periodReturn } from './indicators'

export type RebuttalStrength = 'none' | 'weak' | 'moderate' | 'strong'

export interface RebuttalResult {
  strength: RebuttalStrength
  bearScore: number // 0-100，越高看空力度越大
  penaltyPct: number // 对研判分的下修比例
  factors: string[]
}

const PENALTY: Record<RebuttalStrength, number> = { none: 0, weak: 0.1, moderate: 0.2, strong: 0.35 }

export function computeRebuttal(closes: number[]): RebuttalResult {
  const factors: string[] = []
  let bear = 0

  if (closes.length < 20) {
    return { strength: 'none', bearScore: 0, penaltyPct: 0, factors: ['历史不足，跳过反驳'] }
  }

  const cur = closes[closes.length - 1]

  // 1) RSI 超买
  const rsi = latestRSI(closes, 14)
  if (rsi != null && rsi >= 70) {
    bear += 25
    factors.push(`RSI ${rsi.toFixed(0)} 超买，短线回调风险`)
  } else if (rsi != null && rsi >= 63) {
    bear += 12
    factors.push(`RSI ${rsi.toFixed(0)} 偏高`)
  }

  // 2) 估值高百分位
  const pct = percentile(closes.slice(-250), cur)
  if (pct >= 85) {
    bear += 22
    factors.push(`点位处于近一年 ${pct.toFixed(0)}% 分位，估值偏贵`)
  } else if (pct >= 70) {
    bear += 10
    factors.push(`点位处于近一年 ${pct.toFixed(0)}% 分位，性价比一般`)
  }

  // 3) 偏离 MA20 过高
  const ma = latestMA(closes, 20)
  const dev = ma && ma > 0 ? ((cur - ma) / ma) * 100 : 0
  if (dev > 6) {
    bear += 18
    factors.push(`较 MA20 上偏 ${dev.toFixed(1)}%，有均值回归压力`)
  }

  // 4) MACD 死叉
  if (macdCross(closes) === 'dead') {
    bear += 18
    factors.push('MACD 出现死叉，动能转弱')
  }

  // 5) 布林上轨
  const bb = latestBollinger(closes, 20, 2)
  if (bb && bb.percentB > 0.95) {
    bear += 12
    factors.push('触及布林上轨，短期超涨')
  }

  // 6) 波动放大
  const atr = atrPct(closes, 14)
  if (atr != null && atr > 1.6) {
    bear += 12
    factors.push(`近期振幅 ${atr.toFixed(2)}% 放大，波动风险上升`)
  }

  // 7) 近 20 日大涨后的过热
  const ret20 = periodReturn(closes, 20)
  if (ret20 != null && ret20 > 10) {
    bear += 14
    factors.push(`近 20 日已涨 ${ret20.toFixed(1)}%，短期兑现压力`)
  }

  bear = Math.min(100, bear)
  let strength: RebuttalStrength = 'none'
  if (bear >= 55) strength = 'strong'
  else if (bear >= 30) strength = 'moderate'
  else if (bear >= 12) strength = 'weak'

  if (factors.length === 0) factors.push('未发现显著看空信号')

  return { strength, bearScore: bear, penaltyPct: PENALTY[strength], factors }
}

export function rebuttalStrengthLabel(s: RebuttalStrength): string {
  return s === 'strong' ? '强' : s === 'moderate' ? '中' : s === 'weak' ? '弱' : '无'
}
