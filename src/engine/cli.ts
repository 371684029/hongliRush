// hongliRush CLI — 大A红利金融投资日报引擎
// 命令：price / analysis / calibrate / history / snapshot

import { Command } from 'commander'
import chalk from 'chalk'
import Table from 'cli-table3'
import { backfillHistory, runAnalysis } from './analysis'
import { renderConsoleSummary, writeJson, writeMarkdown } from './report'
import { fetchLiveQuote } from './yahoo'
import { DIVIDEND_FUNDS, DIVIDEND_INDICES } from './symbols'
import { computeCalibration, getDb, getRecentReports } from './db'

const program = new Command()
program.name('hongli').description('大A红利金融投资日报引擎（真实行情 + 量化 + 双打分 + 反驳 + 回测校准）').version('0.2.0')

program
  .command('price')
  .description('实时红利指数/基金行情速查')
  .action(async () => {
    console.log(chalk.red.bold('\n  大A红利实时行情\n'))
    const idxTable = new Table({ head: ['指数', '代码', '最新', '涨跌%'].map((h) => chalk.gray(h)) })
    for (const i of DIVIDEND_INDICES) {
      const q = await fetchLiveQuote(i.yahoo)
      const chg = q?.changePct ?? null
      idxTable.push([i.name, i.code, q?.price ?? 'N/A', colorPct(chg)])
    }
    console.log(idxTable.toString())
    const fundTable = new Table({ head: ['基金', '代码', '净值', '涨跌%'].map((h) => chalk.gray(h)) })
    for (const f of DIVIDEND_FUNDS) {
      const q = await fetchLiveQuote(f.yahoo)
      fundTable.push([f.name, f.code, q?.price ?? 'N/A', colorPct(q?.changePct ?? null)])
    }
    console.log(fundTable.toString())
    console.log()
  })

program
  .command('analysis')
  .description('综合分析日报（量化+双打分+反驳+情景+可信度）')
  .option('--md', '保存 Markdown 到 docs/')
  .option('--json', '仅输出 JSON')
  .action(async (opts: { md?: boolean; json?: boolean }) => {
    const result = await runAnalysis()
    if (opts.json) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      console.log(renderConsoleSummary(result))
    }
    // 始终写 JSON 供 Web 消费
    const jsonPath = writeJson(result)
    if (opts.md) {
      const mdPath = writeMarkdown(result)
      console.log(chalk.green(`  ✅ Markdown 日报已保存：${mdPath}`))
    }
    console.log(chalk.gray(`  📦 数据 JSON 已写入：${jsonPath}\n`))
  })

program
  .command('backfill')
  .description('回填历史研判样本（用真实ETF历史逐日重算，无前视偏差），供校准/命中率')
  .action(async () => {
    console.log(chalk.gray('  正在用主 ETF 真实历史回填研判样本（逐日仅用当日及之前数据）...'))
    const res = await backfillHistory()
    console.log(chalk.green(`  ✅ 回填完成：${res.inserted} 条（${res.from} ~ ${res.to}）\n`))
  })

program
  .command('calibrate')
  .description('回测校准：历史研判 vs 实际走势')
  .option('--days <n>', '回顾天数', '120')
  .action((opts: { days: string }) => {
    const db = getDb()
    const report = computeCalibration(db, parseInt(opts.days, 10) || 120, 5)
    console.log(chalk.red.bold(`\n  回测校准（近 ${report.days} 日 · 5日标签）`))
    console.log(chalk.gray(`  报告总数 ${report.totalReports} · 有效样本 ${report.validReports}\n`))
    if (report.buckets.length) {
      const t = new Table({ head: ['评分区间', '样本', '实际涨概率', '平均涨幅', '校准'].map((h) => chalk.gray(h)) })
      for (const b of report.buckets) {
        t.push([b.range, b.sample, `${b.actualUpProbability}%`, colorPct(b.avgReturn), biasLabel(b.bias)])
      }
      console.log(t.toString())
    } else {
      console.log(chalk.yellow('  暂无足够样本（需每日 analysis 积累，5 个交易日后可回填）'))
    }
    console.log()
    for (const rec of report.recommendations) console.log(chalk.cyan(`  · ${rec}`))
    console.log()
  })

program
  .command('history')
  .description('查看历史分析报告')
  .option('--days <n>', '回顾天数', '30')
  .action((opts: { days: string }) => {
    const db = getDb()
    const rows = getRecentReports(db, parseInt(opts.days, 10) || 30)
    console.log(chalk.red.bold(`\n  历史报告（近 ${opts.days} 日，共 ${rows.length} 条）\n`))
    const t = new Table({ head: ['日期', '研判分', '量化分', '方向'].map((h) => chalk.gray(h)) })
    for (const r of rows) t.push([r.date, r.research_score, r.quant_score ?? '—', r.direction])
    console.log(t.toString())
    console.log()
  })

program
  .command('snapshot')
  .description('保存当日数据快照（等同 analysis，但不打印完整摘要）')
  .action(async () => {
    const result = await runAnalysis()
    writeJson(result)
    console.log(chalk.green(`  ✅ 快照已保存：${result.date} · 研判 ${result.verdict.researchScore} / 量化 ${result.verdict.quantScore}\n`))
  })

function colorPct(v: number | null): string {
  if (v == null) return 'N/A'
  const s = `${v > 0 ? '+' : ''}${v.toFixed(2)}%`
  return v > 0 ? chalk.red(s) : v < 0 ? chalk.green(s) : s
}

function biasLabel(b: string): string {
  if (b === 'optimistic') return chalk.yellow('偏乐观')
  if (b === 'pessimistic') return chalk.cyan('偏保守')
  return chalk.green('校准良好')
}

program.parseAsync(process.argv).catch((err) => {
  console.error(chalk.red('执行失败：'), err instanceof Error ? err.message : err)
  process.exitCode = 1
})
