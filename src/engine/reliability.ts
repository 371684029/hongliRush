// 可信度一览卡 — 把「数据门禁 / 双打分 / 反驳 / 校准」压成一页「能不能信」。
// 衡量「今日结论是否适合做纪律操作」，不是红利涨跌准确率承诺。

import type { DataQualityGate } from './data-quality'
import type { CompositeVerdict } from './verdict'
import { directionLabel } from './quant-score'

export type ReliabilityTier = 'high' | 'medium' | 'low' | 'blocked'

export interface ReliabilityFactor {
  name: string
  ok: boolean
  detail: string
  weight: number
  points: number
}

export interface ReliabilityCard {
  score: number
  tier: ReliabilityTier
  emoji: string
  label: string
  scoreBand: { low: number; high: number; center: number }
  bandHalfWidth: number
  factors: ReliabilityFactor[]
  warnings: string[]
  tldr: { line1: string; line2: string; line3: string }
}

export interface ReliabilityInput {
  gate: DataQualityGate
  verdict: CompositeVerdict
  calibrationSampleSize: number
  calibrationBias: string | null
  trackHitRate: number | null // 0-1
  trackSampleSize: number
  positionLine: string
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

export function buildReliabilityCard(input: ReliabilityInput): ReliabilityCard {
  const factors: ReliabilityFactor[] = []
  const warnings: string[] = []
  let points = 0
  let weightSum = 0

  // 1) 数据门禁 35%
  {
    const w = 35
    weightSum += w
    const g = input.gate
    let p = 18
    let ok = true
    let detail = ''
    if (!g.actionable || g.tier === 'red') {
      p = 5
      ok = false
      detail = `红档 · 置信 ${g.confidence}% · 勿据以加减仓`
      warnings.push('数据门禁红档：操作结论已关闭')
    } else if (g.tier === 'yellow') {
      p = 20
      ok = false
      detail = `黄档 · 置信 ${g.confidence}% · 降级可用`
      warnings.push('数据黄档：结论降级阅读')
    } else {
      p = g.confidence >= 80 ? 35 : 30
      ok = true
      detail = `绿档 · 置信 ${g.confidence}%`
    }
    factors.push({ name: '数据质量', ok, detail, weight: w, points: p })
    points += p
  }

  // 2) 双打分一致 30%
  {
    const w = 30
    weightSum += w
    const v = input.verdict
    let p = 15
    let ok = true
    let detail = `研判 ${v.researchScore} · 量化 ${v.quantScore} · Δ${v.delta > 0 ? '+' : ''}${v.delta}`
    if (v.alignment === 'conflict' || !v.sameDirection) {
      p = 8
      ok = false
      detail += '（冲突/方向不一 → 操作弃权）'
      warnings.push('研判与量化冲突，维持定投不加减仓')
    } else if (v.alignment === 'mild_gap') {
      p = 22
      ok = true
      detail += '（温和偏差，同向）'
    } else {
      p = 30
      ok = true
      detail += '（对齐良好）'
    }
    factors.push({ name: '双打分', ok, detail, weight: w, points: p })
    points += p
  }

  // 3) 反驳强度 15%（反驳越弱越可信）
  {
    const w = 15
    weightSum += w
    const r = input.verdict.rebuttal
    let p = 10
    let ok = true
    let detail = `看空力度 ${r.bearScore}/100`
    if (r.strength === 'strong') {
      p = 5
      ok = false
      detail += ' · 强反驳'
      warnings.push('强制反驳偏强，谨慎追高')
    } else if (r.strength === 'moderate') {
      p = 10
      ok = true
      detail += ' · 中反驳'
    } else {
      p = 15
      ok = true
      detail += r.strength === 'weak' ? ' · 弱反驳' : ' · 无显著看空'
    }
    factors.push({ name: '反驳强度', ok, detail, weight: w, points: p })
    points += p
  }

  // 4) 历史校准样本 15%
  {
    const w = 15
    weightSum += w
    const n = input.calibrationSampleSize
    let p = 4
    let ok = false
    let detail = `同分段样本 ${n}`
    if (n >= 20) {
      p = 15
      ok = true
      detail = `样本充足 ${n}`
    } else if (n >= 5) {
      p = 10
      ok = true
      detail = `样本可用 ${n}（仍偏少）`
      warnings.push(`校准样本 ${n} < 20，命中率波动大`)
    } else {
      p = n > 0 ? 5 : 3
      ok = false
      detail = n > 0 ? `样本不足 ${n}` : '无校准样本（需积累历史）'
      warnings.push('校准样本不足，分数仅供参考')
    }
    if (input.calibrationBias && /乐观|保守/.test(input.calibrationBias)) detail += ` · ${input.calibrationBias}`
    factors.push({ name: '历史校准', ok, detail, weight: w, points: p })
    points += p
  }

  // 5) 滚动命中 5%
  {
    const w = 5
    weightSum += w
    const hr = input.trackHitRate
    const tn = input.trackSampleSize
    let p = 2
    let ok = true
    let detail = '暂无滚动命中'
    if (hr != null && tn >= 5) {
      if (hr >= 0.6) {
        p = 5
        detail = `近窗命中 ${(hr * 100).toFixed(0)}%（n=${tn}）`
      } else if (hr >= 0.45) {
        p = 3
        detail = `近窗命中 ${(hr * 100).toFixed(0)}%（n=${tn}）· 接近随机`
      } else {
        p = 1
        ok = false
        detail = `近窗命中仅 ${(hr * 100).toFixed(0)}%（n=${tn}）`
        warnings.push('近窗方向命中偏低')
      }
    }
    factors.push({ name: '滚动命中', ok, detail, weight: w, points: p })
    points += p
  }

  const score = Math.round(clamp((points / Math.max(weightSum, 1)) * 100, 0, 100))

  let half = 4
  if (score < 40) half = 12
  else if (score < 55) half = 9
  else if (score < 70) half = 6
  if (!input.gate.actionable) half = Math.max(half, 12)
  if (input.verdict.alignment === 'conflict') half = Math.max(half, 8)

  const center = input.verdict.researchScore
  const scoreBand = { low: clamp(center - half, 0, 100), high: clamp(center + half, 0, 100), center }

  let tier: ReliabilityTier = 'medium'
  if (!input.gate.actionable) tier = 'blocked'
  else if (score >= 72) tier = 'high'
  else if (score >= 50) tier = 'medium'
  else tier = 'low'

  const emoji = tier === 'high' ? '🟢' : tier === 'medium' ? '🟡' : tier === 'blocked' ? '🔴' : '🟠'
  const label = tier === 'high' ? '可信度较高' : tier === 'medium' ? '可信度中等' : tier === 'blocked' ? '数据不可操作' : '可信度偏低'

  const tldr = {
    line1: `研判 **${scoreBand.low}–${scoreBand.high}**/100（中心 ${center}）· ${directionLabel(input.verdict.researchDirection)}`,
    line2: input.positionLine,
    line3: `${emoji} ${label} ${score}/100${warnings[0] ? ` · 注意：${warnings[0]}` : ''}`,
  }

  return { score, tier, emoji, label, scoreBand, bandHalfWidth: half, factors, warnings, tldr }
}
