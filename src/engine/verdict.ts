// 研判合成 — 双打分（研判分 × 量化分）、情景概率、尾部风险。
// 研判分 = 量化分叠加估值倾斜，再由强制反驳下修；与纯量化分独立对照。

import { percentile } from './indicators'
import { computeRebuttal, type RebuttalResult } from './rebuttal'
import { directionLabel, type QuantScoreResult } from './quant-score'

export type Direction = 'bullish' | 'bearish' | 'neutral'

export const DUAL_CONFLICT_THRESHOLD = 15
export const DUAL_MILD_GAP = 8

export type DualAlignment = 'aligned' | 'mild_gap' | 'conflict'

export interface CompositeVerdict {
  quantScore: number
  quantDirection: Direction
  researchScore: number
  researchDirection: Direction
  delta: number
  alignment: DualAlignment
  sameDirection: boolean
  actionable: boolean
  rebuttal: RebuttalResult
  valuationTilt: number
}

function dirFromScore(s: number): Direction {
  if (s >= 58) return 'bullish'
  if (s <= 42) return 'bearish'
  return 'neutral'
}

/** 合成研判分：量化分 + 估值倾斜 − 反驳下修 */
export function buildCompositeVerdict(quant: QuantScoreResult, closes: number[]): CompositeVerdict {
  const rebuttal = computeRebuttal(closes)

  // 估值倾斜：便宜(低分位)对长期红利利好，贵则减分
  const cur = closes[closes.length - 1]
  const pct = closes.length >= 20 ? percentile(closes.slice(-250), cur) : 50
  const valuationTilt = Math.round(((50 - pct) / 50) * 6 * 10) / 10 // ±6 分

  const base = quant.score + valuationTilt
  const research = Math.round(Math.max(0, Math.min(100, 50 + (base - 50) * (1 - rebuttal.penaltyPct))))

  const delta = Math.round(research - quant.score)
  const abs = Math.abs(delta)
  let alignment: DualAlignment = 'aligned'
  if (abs > DUAL_CONFLICT_THRESHOLD) alignment = 'conflict'
  else if (abs > DUAL_MILD_GAP) alignment = 'mild_gap'

  const quantDirection = dirFromScore(quant.score)
  const researchDirection = dirFromScore(research)
  const sameDirection = quantDirection === researchDirection

  return {
    quantScore: quant.score,
    quantDirection,
    researchScore: research,
    researchDirection,
    delta,
    alignment,
    sameDirection,
    actionable: alignment !== 'conflict' && sameDirection,
    rebuttal,
    valuationTilt,
  }
}

export interface Scenario {
  name: string
  probability: number // 0-100
  expectedReturn20d: number // %
  note: string
}

/** 三情景概率：由研判分与波动率推导（乐观/中性/谨慎） */
export function buildScenarios(researchScore: number, atr: number | null): Scenario[] {
  const vol = atr ?? 1
  // 研判分越高，乐观概率越大；波动越大，尾部越厚
  const bull = Math.max(15, Math.min(60, Math.round(researchScore * 0.55)))
  const bear = Math.max(12, Math.min(55, Math.round((100 - researchScore) * 0.5 + vol * 6)))
  const neutral = Math.max(10, 100 - bull - bear)
  const norm = bull + bear + neutral
  const scale = 100 / norm
  const mag = Math.max(1.5, vol * 3)

  return [
    { name: '乐观情景', probability: Math.round(bull * scale), expectedReturn20d: Math.round(mag * 1.2 * 10) / 10, note: '红利风格延续、估值修复，高股息资产获增量资金' },
    { name: '中性震荡', probability: Math.round(neutral * scale), expectedReturn20d: 0, note: '区间波动，靠股息与低波获取相对收益' },
    { name: '谨慎情景', probability: Math.round(bear * scale), expectedReturn20d: -Math.round(mag * 1.3 * 10) / 10, note: '利率上行或风险偏好回升，红利阶段跑输成长' },
  ]
}

export interface TailRisk {
  level: 'low' | 'medium' | 'high'
  drawdownFromHigh: number | null
  atrPct: number | null
  note: string
}

/** 尾部风险：距 52 周高回撤 + 波动率 */
export function buildTailRisk(cur: number, high52w: number | null, atr: number | null): TailRisk {
  const dd = high52w && high52w > 0 ? Math.round(((cur - high52w) / high52w) * 1000) / 10 : null
  const vol = atr ?? 0
  let level: TailRisk['level'] = 'low'
  if (vol > 1.8 || (dd != null && dd < -12)) level = 'high'
  else if (vol > 1.2 || (dd != null && dd < -6)) level = 'medium'
  const note =
    level === 'high'
      ? '波动/回撤偏大，控制单次加仓比例，保留现金子弹'
      : level === 'medium'
        ? '波动中等，按纪律分批、不追高'
        : '波动可控，维持定投节奏'
  return { level, drawdownFromHigh: dd, atrPct: atr != null ? Math.round(atr * 100) / 100 : null, note }
}

export { directionLabel }
