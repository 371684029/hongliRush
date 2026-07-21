// Web 前端消费的分析数据类型 — 与引擎 src/engine/analysis.ts 的 AnalysisResult 对齐。
// 数据来源：`npm run analysis` 生成的 public/hongli-latest.json（真实行情量化）。

export interface IndexSnapshot {
  name: string
  code: string
  price: number | null
  changePct: number | null
  historyBars: number
  ma20: number | null
  rsi14: number | null
  return20d: number | null
  fiftyTwoWeekHigh: number | null
  fiftyTwoWeekLow: number | null
  refYield: number | null
}

export interface FundSnapshot {
  name: string
  code: string
  type: string
  trackingIndex: string
  nav: number | null
  changePct: number | null
  yearReturn: number | null
  reason: string
}

export interface QuantFactor {
  name: string
  rawValue: number
  signal: number
  weight: number
  contribution: number
}

export interface ReliabilityFactor {
  name: string
  ok: boolean
  detail: string
  weight: number
  points: number
}

export interface Scenario {
  name: string
  probability: number
  expectedReturn20d: number
  note: string
}

export interface PredictionRow {
  date: string
  researchScore: number
  quantScore: number | null
  pred: 'up' | 'down' | 'flat'
  actual5dPct: number | null
  status: 'hit' | 'miss' | 'flat' | 'pending'
}

export interface AnalysisData {
  date: string
  generatedAt: string
  headline: string
  indices: IndexSnapshot[]
  funds: FundSnapshot[]
  quant: {
    score: number
    direction: 'bullish' | 'bearish' | 'neutral'
    factors: Record<string, QuantFactor>
  }
  verdict: {
    quantScore: number
    quantDirection: 'bullish' | 'bearish' | 'neutral'
    researchScore: number
    researchDirection: 'bullish' | 'bearish' | 'neutral'
    delta: number
    alignment: 'aligned' | 'mild_gap' | 'conflict'
    sameDirection: boolean
    actionable: boolean
    valuationTilt: number
    rebuttal: {
      strength: 'none' | 'weak' | 'moderate' | 'strong'
      bearScore: number
      penaltyPct: number
      factors: string[]
    }
  }
  gate: {
    tier: 'green' | 'yellow' | 'red'
    actionable: boolean
    confidence: number
    anchorDeviationPct: number | null
    reasons: string[]
    banners: string[]
    missing: string[]
  }
  reliability: {
    score: number
    tier: 'high' | 'medium' | 'low' | 'blocked'
    emoji: string
    label: string
    scoreBand: { low: number; high: number; center: number }
    bandHalfWidth: number
    factors: ReliabilityFactor[]
    warnings: string[]
    tldr: { line1: string; line2: string; line3: string }
  }
  scenarios: Scenario[]
  tailRisk: {
    level: 'low' | 'medium' | 'high'
    drawdownFromHigh: number | null
    atrPct: number | null
    note: string
  }
  position: { targetPct: number; label: string; emoji: string; headline: string }
  calibration: { sampleSize: number; upRate: number | null; bias: string }
  track: {
    windowDays: number
    sample: number
    hitRate: number | null
    hits: number
    total: number
    recent: PredictionRow[]
  }
  disclaimer: string
}

export function directionLabel(d: 'bullish' | 'bearish' | 'neutral'): string {
  return d === 'bullish' ? '偏多' : d === 'bearish' ? '偏空' : '中性'
}

/** 载入引擎生成的最新分析 JSON */
export async function loadAnalysis(): Promise<AnalysisData> {
  const res = await fetch(`${import.meta.env.BASE_URL}hongli-latest.json`, { cache: 'no-cache' })
  if (!res.ok) throw new Error(`加载分析数据失败：HTTP ${res.status}`)
  return (await res.json()) as AnalysisData
}
