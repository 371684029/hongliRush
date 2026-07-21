// 综合分析编排 — 采集真实数据 → 量化 → 双打分 → 反驳 → 情景/尾部风险 → 可信度 → 存档。
// 输出 AnalysisResult（供 Markdown 报告、JSON、Web 前端消费）。

import { atrPct, latestRSI, periodReturn } from './indicators'
import { computeQuantScore, directionLabel } from './quant-score'
import { buildCompositeVerdict, buildScenarios, buildTailRisk, type Scenario, type TailRisk } from './verdict'
import { evaluateDataQuality, type DataQualityGate, type DataSourceStatus } from './data-quality'
import { buildReliabilityCard, type ReliabilityCard } from './reliability'
import { fetchDailyBars, fetchLiveQuote, type LiveQuote } from './yahoo'
import { DIVIDEND_FUNDS, DIVIDEND_INDICES, LOW_VOL_PROXY_YAHOO, primaryIndex } from './symbols'
import { todayDate } from './time'
import {
  buildPredictionTrack,
  getCalibrationContext,
  getDb,
  upsertFundNav,
  upsertIndexPrice,
  upsertReport,
  bulkUpsertMainHistory,
} from './db'

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

export interface PositionRec {
  targetPct: number
  label: string
  emoji: string
  headline: string
}

export interface AnalysisResult {
  date: string
  generatedAt: string
  headline: string
  indices: IndexSnapshot[]
  funds: FundSnapshot[]
  quant: ReturnType<typeof computeQuantScore>
  verdict: ReturnType<typeof buildCompositeVerdict>
  gate: DataQualityGate
  reliability: ReliabilityCard
  scenarios: Scenario[]
  tailRisk: TailRisk
  position: PositionRec
  calibration: { sampleSize: number; upRate: number | null; bias: string }
  track: ReturnType<typeof buildPredictionTrack>
  disclaimer: string
}

function positionFromVerdict(researchScore: number, gate: DataQualityGate, actionable: boolean): PositionRec {
  if (!gate.actionable || !actionable) {
    return { targetPct: 50, label: '维持中枢', emoji: '⏸️', headline: '数据/双分未达操作条件，维持既有红利定投纪律，不加减仓' }
  }
  if (researchScore >= 68) return { targetPct: 70, label: '积极配置', emoji: '📈', headline: '红利性价比与趋势俱佳，可在定投基础上适度加仓' }
  if (researchScore >= 56) return { targetPct: 60, label: '标准配置', emoji: '🙂', headline: '维持红利底仓，按定投节奏分批买入' }
  if (researchScore >= 45) return { targetPct: 50, label: '中性观望', emoji: '➡️', headline: '区间震荡，维持中枢仓位，靠股息与低波获取收益' }
  return { targetPct: 40, label: '偏防御', emoji: '🛡️', headline: '短期性价比转弱，降低加仓节奏，保留现金子弹' }
}

async function loadIndex(def: typeof DIVIDEND_INDICES[number]): Promise<{ snap: IndexSnapshot; closes: number[]; live: LiveQuote | null; status: DataSourceStatus }> {
  // 实时点位取指数本身；技术指标/历史取其跟踪 ETF（指数在 Yahoo 无长历史）
  const historySymbol = def.historyYahoo ?? def.yahoo
  const [live, bars] = await Promise.all([fetchLiveQuote(def.yahoo), fetchDailyBars(historySymbol, 400)])
  const closes = bars.map((b) => b.close)
  const lastBarDate = bars.length ? bars[bars.length - 1].date : null
  const today = todayDate()
  const staleDays = lastBarDate ? Math.round((new Date(today).getTime() - new Date(lastBarDate).getTime()) / 86400000) : null
  const snap: IndexSnapshot = {
    name: def.name,
    code: def.code,
    price: live?.price ?? null,
    changePct: live?.changePct ?? null,
    historyBars: bars.length,
    // MA20 按跟踪 ETF 计算（与指数点位单位不同，此处以 N/A 呈现，避免混淆单位）
    ma20: null,
    // RSI/近20日为比例量纲，用跟踪 ETF 近似代表该指数走势
    rsi14: closes.length >= 15 ? Math.round((latestRSI(closes, 14) ?? 0) * 10) / 10 : null,
    return20d: periodReturn(closes, 20),
    fiftyTwoWeekHigh: live?.fiftyTwoWeekHigh ?? null,
    fiftyTwoWeekLow: live?.fiftyTwoWeekLow ?? null,
    refYield: def.refYield ?? null,
  }
  const status: DataSourceStatus = { name: def.name, live: live != null, historyBars: bars.length, staleDays, expectHistory: def.historyYahoo != null }
  return { snap, closes, live, status }
}

export async function runAnalysis(): Promise<AnalysisResult> {
  const date = todayDate()
  const db = getDb()

  const primary = primaryIndex()
  const mainSymbol = primary.historyYahoo ?? primary.yahoo

  // 采集：指数展示 + 主研判 ETF 历史 + 低波代理（并行）
  const [indexLoads, mainLive, mainBars, lowVolBars] = await Promise.all([
    Promise.all(DIVIDEND_INDICES.map(loadIndex)),
    fetchLiveQuote(mainSymbol),
    fetchDailyBars(mainSymbol, 400),
    fetchDailyBars(LOW_VOL_PROXY_YAHOO, 120),
  ])
  const lowVolCloses = lowVolBars.map((b) => b.close)

  // 主研判以中证红利跟踪 ETF（515080）历史为准：单位一致、可锚定、可回测
  const closes = mainBars.map((b) => b.close)
  const mainLivePrice = mainLive?.price ?? (closes.length ? closes[closes.length - 1] : null)

  // 量化 + 研判
  const quant = computeQuantScore({ closes, lowVolCloses })
  const verdict = buildCompositeVerdict(quant, closes)
  const atr = atrPct(closes, 14)

  // 数据质量门禁（锚定：主 ETF 实时价 vs 最近历史收盘，单位一致）
  const sources: DataSourceStatus[] = indexLoads.map((l) => l.status)
  const gate = evaluateDataQuality({
    sources,
    primaryLive: mainLivePrice,
    primaryHistClose: closes.length ? closes[closes.length - 1] : null,
    primaryHistoryBars: closes.length,
  })

  // 采集推荐基金（并行）
  const fundData = await Promise.all(
    DIVIDEND_FUNDS.map(async (f) => {
      const [live, bars] = await Promise.all([fetchLiveQuote(f.yahoo), fetchDailyBars(f.yahoo, 400)])
      const fcloses = bars.map((b) => b.close)
      const yearReturn = fcloses.length >= 240 ? periodReturn(fcloses, 240) : periodReturn(fcloses, fcloses.length - 1)
      const snap: FundSnapshot = {
        name: f.name,
        code: f.code,
        type: f.type,
        trackingIndex: f.trackingIndex,
        nav: live?.price ?? (fcloses.length ? fcloses[fcloses.length - 1] : null),
        changePct: live?.changePct ?? null,
        yearReturn: yearReturn != null ? Math.round(yearReturn * 10) / 10 : null,
        reason: f.reason,
      }
      return snap
    }),
  )

  // 情景 / 尾部风险 / 仓位
  const scenarios = buildScenarios(verdict.researchScore, atr)
  const cur = closes.length ? closes[closes.length - 1] : mainLivePrice ?? 0
  const tailRisk = buildTailRisk(cur, mainLive?.fiftyTwoWeekHigh ?? null, atr)
  const position = positionFromVerdict(verdict.researchScore, gate, verdict.actionable)

  // 存档（先存价格/基金，便于校准回填）。main_close 统一使用主 ETF（515080），与历史序列同源。
  const byCode = new Map(indexLoads.map((l) => [l.snap.code, l]))
  upsertIndexPrice(db, {
    date,
    main_close: mainLivePrice,
    main_high: null,
    main_low: null,
    sse_close: byCode.get('000015')?.snap.price ?? null,
    hs300_close: byCode.get('000821')?.snap.price ?? null,
    lowvol_close: lowVolCloses.length ? lowVolCloses[lowVolCloses.length - 1] : null,
  })
  // 用主 ETF 带日期的历史 bar 补齐 index_prices（COALESCE 不覆盖当日实时值），供回测校准使用
  bulkUpsertMainHistory(db, mainBars.map((b) => ({ date: b.date, close: b.close, high: b.high, low: b.low })))

  for (const f of fundData) upsertFundNav(db, date, f.code, f.nav, f.changePct)

  // 校准上下文 + 预测追踪（含今日之前的历史）
  const calibration = getCalibrationContext(db, verdict.researchScore)
  const track = buildPredictionTrack(db, 120, 5)

  // 可信度卡
  const reliability = buildReliabilityCard({
    gate,
    verdict,
    calibrationSampleSize: calibration.sampleSize,
    calibrationBias: calibration.bias,
    trackHitRate: track.hitRate,
    trackSampleSize: track.total,
    positionLine: `${position.emoji} 建议仓位 ${position.targetPct}%（${position.label}）· ${position.headline}`,
  })

  const headline = buildHeadline(verdict, gate, position)

  const result: AnalysisResult = {
    date,
    generatedAt: new Date().toISOString(),
    headline,
    indices: indexLoads.map((l) => l.snap),
    funds: fundData,
    quant,
    verdict,
    gate,
    reliability,
    scenarios,
    tailRisk,
    position,
    calibration,
    track,
    disclaimer: '本报告由本地量化引擎基于公开行情自动生成，仅供投资研究参考，不构成任何投资建议。市场有风险，投资需谨慎。',
  }

  // 存档报告（写在追踪之后，用当日研判分）
  upsertReport(db, date, verdict.researchScore, verdict.quantScore, verdict.researchDirection, JSON.stringify(result))

  return result
}

/**
 * 历史回填：用主 ETF 真实日线，逐日「仅用当日及之前数据」重算研判/量化分并存档，
 * 使回测校准与预测命中率拥有真实、可核验的样本（不使用未来数据，避免前视偏差）。
 * 仅处理「其后至少有 5 个交易日」的日期，因此不会覆盖当日完整报告。
 */
export async function backfillHistory(): Promise<{ inserted: number; from: string; to: string }> {
  const db = getDb()
  const primary = primaryIndex()
  const mainSymbol = primary.historyYahoo ?? primary.yahoo

  const [mainBars, lowVolBars] = await Promise.all([
    fetchDailyBars(mainSymbol, 400),
    fetchDailyBars(LOW_VOL_PROXY_YAHOO, 400),
  ])
  if (mainBars.length < 60) return { inserted: 0, from: 'N/A', to: 'N/A' }

  bulkUpsertMainHistory(db, mainBars.map((b) => ({ date: b.date, close: b.close, high: b.high, low: b.low })))

  const closesAll = mainBars.map((b) => b.close)
  // 结束于「有 5 日未来」的最后一天
  const endIdx = mainBars.length - 6
  const startIdx = Math.max(29, endIdx - 200)
  let inserted = 0
  let firstDate = ''
  let lastDate = ''

  for (let i = startIdx; i <= endIdx; i++) {
    const asOfDate = mainBars[i].date
    const closesUpto = closesAll.slice(0, i + 1)
    const lowVolUpto = lowVolBars.filter((b) => b.date <= asOfDate).map((b) => b.close)
    const quant = computeQuantScore({ closes: closesUpto, lowVolCloses: lowVolUpto })
    const verdict = buildCompositeVerdict(quant, closesUpto)
    upsertReport(db, asOfDate, verdict.researchScore, verdict.quantScore, verdict.researchDirection, JSON.stringify({ quantScore: verdict.quantScore, backfill: true }))
    if (!firstDate) firstDate = asOfDate
    lastDate = asOfDate
    inserted++
  }
  return { inserted, from: firstDate, to: lastDate }
}

function buildHeadline(verdict: ReturnType<typeof buildCompositeVerdict>, gate: DataQualityGate, position: PositionRec): string {
  const dir = directionLabel(verdict.researchDirection)
  if (!gate.actionable) return `数据质量不足（${gate.tier}），本期红利日报仅供框架参考，维持既有定投纪律。`
  return `大A红利研判 ${dir}（研判分 ${verdict.researchScore}/量化 ${verdict.quantScore}）· ${position.label}：${position.headline}`
}
