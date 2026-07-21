// 数据质量门禁 — 分档（green/yellow/red），决定报告是否可作为操作依据。
// 「数据可靠性」的第一道防线：新鲜度、完整度、锚定一致性。

export type DataQualityTier = 'green' | 'yellow' | 'red'

export interface DataSourceStatus {
  /** 标的名 */
  name: string
  /** 是否成功取到实时价 */
  live: boolean
  /** 历史 bar 数量 */
  historyBars: number
  /** 数据日期与今天相差的日历天（越小越新鲜） */
  staleDays: number | null
  /** 是否要求具备历史数据（展示型辅助指数为 false，不因缺历史而降级） */
  expectHistory?: boolean
}

export interface DataQualityInput {
  sources: DataSourceStatus[]
  /** 主指数实时价 */
  primaryLive: number | null
  /** 主指数最近一根历史收盘（锚定核对） */
  primaryHistClose: number | null
  /** 主指数历史 bar 数 */
  primaryHistoryBars: number
}

export interface DataQualityGate {
  tier: DataQualityTier
  actionable: boolean
  confidence: number // 0-100
  anchorDeviationPct: number | null
  reasons: string[]
  banners: string[]
  missing: string[]
}

const HARD_FLOOR = 40
const GREEN = 75
const ANCHOR_HARD_PCT = 3
const ANCHOR_GREEN_PCT = 1.2

export function evaluateDataQuality(input: DataQualityInput): DataQualityGate {
  const reasons: string[] = []
  const banners: string[] = []
  const missing: string[] = []

  const primaryOk = input.primaryLive != null && Number.isFinite(input.primaryLive) && input.primaryLive > 0
  const enoughHistory = input.primaryHistoryBars >= 20

  // 锚定：实时价 vs 最近历史收盘的偏差
  let anchorDeviationPct: number | null = null
  if (primaryOk && input.primaryHistClose != null && input.primaryHistClose > 0) {
    anchorDeviationPct = Math.round(Math.abs((input.primaryLive! - input.primaryHistClose) / input.primaryHistClose) * 10000) / 100
  }

  // 置信度：由数据源成功率、历史充足度、新鲜度合成
  const total = input.sources.length || 1
  const liveOk = input.sources.filter((s) => s.live).length
  const freshOk = input.sources.filter((s) => s.staleDays != null && s.staleDays <= 5).length
  let confidence = Math.round((liveOk / total) * 55 + (freshOk / total) * 25 + (enoughHistory ? 20 : Math.min(20, input.primaryHistoryBars)))
  confidence = Math.max(0, Math.min(100, confidence))

  for (const s of input.sources) {
    if (!s.live) missing.push(`${s.name}实时价`)
    else if (s.expectHistory && s.historyBars < 20) missing.push(`${s.name}历史(<20)`)
  }

  // —— 硬拦（red）——
  if (!primaryOk) reasons.push('主指数（中证红利）实时价缺失或无效')
  if (!enoughHistory) reasons.push(`主指数历史不足（${input.primaryHistoryBars} < 20 根），量化指标不可靠`)
  if (anchorDeviationPct != null && anchorDeviationPct > ANCHOR_HARD_PCT) {
    reasons.push(`实时价与最近收盘锚定偏差 ${anchorDeviationPct}% > ${ANCHOR_HARD_PCT}%`)
  }
  if (confidence < HARD_FLOOR) reasons.push(`综合置信度 ${confidence}% < ${HARD_FLOOR}%`)

  if (reasons.length > 0) {
    banners.push('🔴 数据不合格：本报告仅供框架参考，请勿据此加减仓')
    banners.push(...reasons.map((r) => `· ${r}`))
    return { tier: 'red', actionable: false, confidence, anchorDeviationPct, reasons, banners, missing }
  }

  const anchorGreen = anchorDeviationPct == null || anchorDeviationPct < ANCHOR_GREEN_PCT
  if (confidence >= GREEN && anchorGreen && missing.length === 0) {
    banners.push(`✅ 数据高可信（置信度 ${confidence}%）`)
    return { tier: 'green', actionable: true, confidence, anchorDeviationPct, reasons: [], banners, missing }
  }

  const yellow: string[] = []
  if (confidence < GREEN) yellow.push(`置信度 ${confidence}%（未达绿灯 ${GREEN}%）`)
  if (missing.length) yellow.push(`部分数据缺失：${missing.join('、')}`)
  if (anchorDeviationPct != null && anchorDeviationPct >= ANCHOR_GREEN_PCT) yellow.push(`锚定偏差 ${anchorDeviationPct}%（可接受但非最优）`)
  banners.push('🟡 数据降级可用：已出报告，请优先看置信度与缺失字段')
  banners.push(...yellow.map((r) => `· ${r}`))
  return { tier: 'yellow', actionable: true, confidence, anchorDeviationPct, reasons: yellow, banners, missing }
}
