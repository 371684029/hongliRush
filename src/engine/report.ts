// 报告渲染 — 可读性优先：Markdown 日报 + JSON（供 Web 前端消费）+ 控制台摘要。

import fs from 'node:fs'
import path from 'node:path'
import type { AnalysisResult } from './analysis'
import { directionLabel } from './quant-score'
import { rebuttalStrengthLabel } from './rebuttal'
import { formatNow } from './time'

function pct(v: number | null, digits = 2): string {
  if (v == null) return 'N/A'
  return `${v > 0 ? '+' : ''}${v.toFixed(digits)}%`
}

function num(v: number | null, digits = 2): string {
  return v == null ? 'N/A' : v.toFixed(digits)
}

export function renderMarkdown(r: AnalysisResult): string {
  const L: string[] = []
  L.push(`# 大A红利金融投资日报 · ${r.date}`)
  L.push('')
  L.push(`> ${r.headline}`)
  L.push('')
  L.push(`_生成时间：${formatNow()}（北京时间）· hongliRush 本地量化引擎_`)
  L.push('')

  // 可信度一览（置顶，三行看懂）
  L.push('## 🛡️ 可信度一览（操作可信度，非涨跌承诺）')
  L.push('')
  L.push(`> ${r.reliability.emoji} **${r.reliability.label} ${r.reliability.score}/100** · 评分区间 **${r.reliability.scoreBand.low}–${r.reliability.scoreBand.high}**（中心 ${r.reliability.scoreBand.center}，半宽 ±${r.reliability.bandHalfWidth}）`)
  L.push('')
  L.push('**三行看懂：**')
  L.push(`1. ${r.reliability.tldr.line1}`)
  L.push(`2. ${r.reliability.tldr.line2}`)
  L.push(`3. ${r.reliability.tldr.line3}`)
  L.push('')
  L.push('| 因子 | 得分 | 说明 |')
  L.push('|------|------|------|')
  for (const f of r.reliability.factors) L.push(`| ${f.ok ? '✅' : '⚠️'} ${f.name} | ${f.points}/${f.weight} | ${f.detail} |`)
  L.push('')
  if (r.reliability.warnings.length) L.push(`- **注意**：${r.reliability.warnings.join('；')}`)
  L.push('')

  // 数据质量门禁
  L.push('## 📋 数据质量门禁')
  L.push('')
  const tierLabel = r.gate.tier === 'green' ? '高可信 ✅' : r.gate.tier === 'yellow' ? '降级可用 ⚠️' : '不可用 🔴'
  L.push(`- **分档**：${tierLabel} · **置信度** ${r.gate.confidence}% · **可否操作**：${r.gate.actionable ? '可以（仍须结合自身判断）' : '**否 — 请勿据此加减仓**'}`)
  if (r.gate.anchorDeviationPct != null) L.push(`- **实时价 vs 最近收盘锚定偏差**：${r.gate.anchorDeviationPct}%`)
  if (r.gate.missing.length) L.push(`- **暂缺**：${r.gate.missing.join('、')}`)
  for (const b of r.gate.banners) L.push(`> ${b}`)
  L.push('')

  // 红利指数行情（真实数据）
  L.push('## 📈 红利指数行情（Yahoo Finance 实时）')
  L.push('')
  L.push('| 指数 | 代码 | 最新点位 | 日涨跌 | MA20 | RSI14 | 近20日 | 参考股息率 |')
  L.push('|------|------|----------|--------|------|-------|--------|-----------|')
  for (const i of r.indices) {
    L.push(`| ${i.name} | ${i.code} | ${num(i.price)} | ${pct(i.changePct)} | ${num(i.ma20)} | ${num(i.rsi14, 1)} | ${pct(i.return20d, 1)} | ${i.refYield != null ? i.refYield + '%' : 'N/A'} |`)
  }
  L.push('')
  L.push('> 点位/涨跌为实时行情；参考股息率为静态基准，仅供量级参考，实际以基金/指数公司披露为准。')
  L.push('')

  // 双打分
  L.push('## ⚖️ 双打分机制（研判 × 量化）')
  L.push('')
  L.push('| 体系 | 分数 | 方向 |')
  L.push('|------|------|------|')
  L.push(`| 研判分（量化+估值−反驳） | **${r.verdict.researchScore}/100** | ${directionLabel(r.verdict.researchDirection)} |`)
  L.push(`| 量化分（纯本地因子） | **${r.verdict.quantScore}/100** | ${directionLabel(r.verdict.quantDirection)} |`)
  L.push(`| 偏差（研判−量化） | **${r.verdict.delta > 0 ? '+' : ''}${r.verdict.delta}** | ${r.verdict.alignment} |`)
  L.push('')
  L.push(`- **对齐状态**：\`${r.verdict.alignment}\`（${r.verdict.sameDirection ? '同向' : '方向不一'}）· 估值倾斜 ${r.verdict.valuationTilt > 0 ? '+' : ''}${r.verdict.valuationTilt}`)
  L.push('> 冲突或方向不一时操作弃权：维持定投、不据此加减仓。')
  L.push('')

  // 量化因子构成
  L.push('### 量化因子构成（纯本地 · 可复现）')
  L.push('')
  L.push('| 因子 | 信号分 | 权重 | 贡献 |')
  L.push('|------|--------|------|------|')
  for (const f of Object.values(r.quant.factors)) L.push(`| ${f.name} | ${f.signal} | ${(f.weight * 100).toFixed(0)}% | +${f.contribution.toFixed(1)} |`)
  L.push(`| **合计** | | 100% | **${r.quant.score}** |`)
  L.push('')

  // 强制反驳
  L.push('## 🧨 强制反驳（独立找看空论据）')
  L.push('')
  L.push(`- **反驳强度**：${rebuttalStrengthLabel(r.verdict.rebuttal.strength)} · 看空力度 ${r.verdict.rebuttal.bearScore}/100 · 研判下修 ${(r.verdict.rebuttal.penaltyPct * 100).toFixed(0)}%`)
  for (const f of r.verdict.rebuttal.factors) L.push(`  - ${f}`)
  L.push('')

  // 三情景 + 尾部风险
  L.push('## 🔮 三情景推演（未来约 20 交易日）')
  L.push('')
  L.push('| 情景 | 概率 | 预期区间收益 | 说明 |')
  L.push('|------|------|--------------|------|')
  for (const s of r.scenarios) L.push(`| ${s.name} | ${s.probability}% | ${pct(s.expectedReturn20d, 1)} | ${s.note} |`)
  L.push('')
  L.push(`- **尾部风险**：${r.tailRisk.level === 'high' ? '偏高 🔴' : r.tailRisk.level === 'medium' ? '中等 🟡' : '可控 🟢'} · 距52周高 ${r.tailRisk.drawdownFromHigh != null ? r.tailRisk.drawdownFromHigh + '%' : 'N/A'} · 波动ATR ${r.tailRisk.atrPct != null ? r.tailRisk.atrPct + '%' : 'N/A'}`)
  L.push(`  - ${r.tailRisk.note}`)
  L.push('')

  // 仓位建议
  L.push('## 🎯 仓位与操作建议')
  L.push('')
  L.push(`- ${r.position.emoji} **建议红利仓位 ${r.position.targetPct}%（${r.position.label}）**：${r.position.headline}`)
  L.push('')

  // 推荐红利基金（真实净值）
  L.push('## 💰 推荐大A红利基金（Yahoo 实时净值）')
  L.push('')
  L.push('| 基金 | 代码 | 类型 | 跟踪指数 | 最新净值 | 日涨跌 | 近一年 |')
  L.push('|------|------|------|----------|----------|--------|--------|')
  for (const f of r.funds) {
    L.push(`| ${f.name} | ${f.code} | ${f.type} | ${f.trackingIndex} | ${num(f.nav, 3)} | ${pct(f.changePct)} | ${f.yearReturn != null ? pct(f.yearReturn, 1) : 'N/A'} |`)
  }
  L.push('')
  for (const f of r.funds) L.push(`- **${f.name}（${f.code}）**：${f.reason}`)
  L.push('')

  // 历史预测对错
  L.push('## 📊 历史预测对错（近 ' + r.track.windowDays + ' 日 · 5日标签）')
  L.push('')
  if (r.track.total > 0) {
    L.push(`- 方向命中率 **${((r.track.hitRate ?? 0) * 100).toFixed(0)}%**（${r.track.hits}/${r.track.total}）· 样本报告 ${r.track.sample} 条`)
  } else {
    L.push(`- 暂无可判定样本（需每日运行 analysis 积累，5 个交易日后自动回填对错）· 已存档 ${r.track.sample} 条`)
  }
  if (r.track.recent.length) {
    L.push('')
    L.push('| 日期 | 研判 | 量化 | 预测 | 5日涨跌 | 对错 |')
    L.push('|------|------|------|------|---------|------|')
    for (const t of r.track.recent) {
      const mark = t.status === 'hit' ? '✅' : t.status === 'miss' ? '❌' : t.status === 'flat' ? '➖' : '⏳'
      L.push(`| ${t.date} | ${t.researchScore} | ${t.quantScore ?? '—'} | ${t.pred} | ${t.actual5dPct != null ? pct(t.actual5dPct, 2) : '—'} | ${mark} |`)
    }
  }
  L.push('')
  L.push('> 预测方向：研判分 >55 记「涨」、<45 记「跌」，中间不计入命中率；持平(|涨跌|≤0.1%)不计对错。非投资业绩承诺。')
  L.push('')

  L.push('---')
  L.push('')
  L.push(`> ${r.disclaimer}`)
  L.push('')
  return L.join('\n')
}

/** 写 Markdown 到 docs/hongli-analysis-YYYY-MM-DD.md */
export function writeMarkdown(r: AnalysisResult, projectRoot = process.cwd()): string {
  const dir = path.join(projectRoot, 'docs')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const out = path.join(dir, `hongli-analysis-${r.date}.md`)
  fs.writeFileSync(out, renderMarkdown(r), 'utf-8')
  // 同时写 latest 供固定链接
  fs.writeFileSync(path.join(dir, 'hongli-analysis-latest.md'), renderMarkdown(r), 'utf-8')
  return out
}

/** 写 JSON 到 public/hongli-latest.json 供 Web 前端消费 */
export function writeJson(r: AnalysisResult, projectRoot = process.cwd()): string {
  const dir = path.join(projectRoot, 'public')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const out = path.join(dir, 'hongli-latest.json')
  fs.writeFileSync(out, JSON.stringify(r, null, 2), 'utf-8')
  return out
}

export function renderConsoleSummary(r: AnalysisResult): string {
  const L: string[] = []
  L.push('')
  L.push(`  🔴 大A红利金融投资日报 · ${r.date}`)
  L.push(`  ${'─'.repeat(56)}`)
  L.push(`  ${r.headline}`)
  L.push('')
  L.push(`  🛡️ 可信度 ${r.reliability.emoji} ${r.reliability.label} ${r.reliability.score}/100 · 区间 ${r.reliability.scoreBand.low}–${r.reliability.scoreBand.high}`)
  L.push(`  ⚖️ 研判分 ${r.verdict.researchScore} · 量化分 ${r.verdict.quantScore} · 偏差 ${r.verdict.delta > 0 ? '+' : ''}${r.verdict.delta}（${r.verdict.alignment}）`)
  L.push(`  📋 数据门禁 ${r.gate.tier} · 置信 ${r.gate.confidence}% · 可操作=${r.gate.actionable ? '是' : '否'}`)
  L.push(`  🧨 反驳 ${rebuttalStrengthLabel(r.verdict.rebuttal.strength)}（看空 ${r.verdict.rebuttal.bearScore}） · 🎯 建议仓位 ${r.position.targetPct}%（${r.position.label}）`)
  L.push('')
  L.push('  📈 红利指数：')
  for (const i of r.indices) L.push(`    ${i.name.padEnd(8)} ${num(i.price).padStart(9)} ${pct(i.changePct).padStart(8)}  RSI ${num(i.rsi14, 1)}`)
  L.push('')
  return L.join('\n')
}
