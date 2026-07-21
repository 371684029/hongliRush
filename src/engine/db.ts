// 本地 SQLite 存储 — 每日指数/基金快照、分析报告存档、回测校准、预测追踪。
// 「预测准确性」的闭环基础：把每天的研判存起来，事后用真实走势回填对错。

import Database from 'better-sqlite3'
import path from 'node:path'
import fs from 'node:fs'
import { addCalendarDays } from './time'
import { SCORE_BUCKETS, scoreBucketRange } from './score-buckets'

let dbInstance: Database.Database | null = null

export function getDb(dbPath?: string): Database.Database {
  if (dbInstance) return dbInstance
  const resolved = dbPath ?? path.resolve(process.cwd(), 'data', 'hongli.db')
  const dir = path.dirname(resolved)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const db = new Database(resolved)
  db.pragma('journal_mode = WAL')
  initTables(db)
  dbInstance = db
  return db
}

export function closeDb(): void {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
  }
}

function initTables(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS index_prices (
      date        TEXT PRIMARY KEY,
      main_close  REAL,
      main_high   REAL,
      main_low    REAL,
      sse_close   REAL,
      hs300_close REAL,
      lowvol_close REAL,
      created_at  TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS fund_nav (
      date       TEXT NOT NULL,
      code       TEXT NOT NULL,
      nav        REAL,
      change_pct REAL,
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (date, code)
    );
    CREATE TABLE IF NOT EXISTS analysis_reports (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      date          TEXT UNIQUE,
      research_score INTEGER,
      quant_score   INTEGER,
      direction     TEXT,
      report_json   TEXT,
      created_at    TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_reports_date ON analysis_reports(date);
    CREATE INDEX IF NOT EXISTS idx_reports_score ON analysis_reports(research_score);
  `)
}

// ---------- index_prices ----------

export interface IndexPriceRow {
  date: string
  main_close: number | null
  main_high: number | null
  main_low: number | null
  sse_close: number | null
  hs300_close: number | null
  lowvol_close: number | null
}

export function upsertIndexPrice(db: Database.Database, row: IndexPriceRow): void {
  db.prepare(
    `INSERT INTO index_prices (date, main_close, main_high, main_low, sse_close, hs300_close, lowvol_close)
     VALUES (@date, @main_close, @main_high, @main_low, @sse_close, @hs300_close, @lowvol_close)
     ON CONFLICT(date) DO UPDATE SET
       main_close=excluded.main_close, main_high=excluded.main_high, main_low=excluded.main_low,
       sse_close=excluded.sse_close, hs300_close=excluded.hs300_close, lowvol_close=excluded.lowvol_close`,
  ).run(row)
}

/** 批量写入历史（用于首跑补齐；不覆盖已有当天的实时值优先场景由调用方决定） */
export function bulkUpsertMainHistory(db: Database.Database, bars: Array<{ date: string; close: number; high: number | null; low: number | null }>): number {
  const stmt = db.prepare(
    `INSERT INTO index_prices (date, main_close, main_high, main_low)
     VALUES (@date, @close, @high, @low)
     ON CONFLICT(date) DO UPDATE SET
       main_close=COALESCE(index_prices.main_close, excluded.main_close),
       main_high=COALESCE(index_prices.main_high, excluded.main_high),
       main_low=COALESCE(index_prices.main_low, excluded.main_low)`,
  )
  const tx = db.transaction((rows: typeof bars) => {
    for (const b of rows) stmt.run(b)
  })
  tx(bars)
  return bars.length
}

export function getIndexPrice(db: Database.Database, date: string): IndexPriceRow | undefined {
  return db.prepare('SELECT * FROM index_prices WHERE date = ?').get(date) as IndexPriceRow | undefined
}

/** date 之后的第 1..n 个交易日记录（按日期升序） */
export function getPricesAfter(db: Database.Database, date: string, n: number): IndexPriceRow[] {
  return db.prepare('SELECT * FROM index_prices WHERE date > ? ORDER BY date ASC LIMIT ?').all(date, n) as IndexPriceRow[]
}

// ---------- fund_nav ----------

export function upsertFundNav(db: Database.Database, date: string, code: string, nav: number | null, changePct: number | null): void {
  db.prepare(
    `INSERT INTO fund_nav (date, code, nav, change_pct) VALUES (?, ?, ?, ?)
     ON CONFLICT(date, code) DO UPDATE SET nav=excluded.nav, change_pct=excluded.change_pct`,
  ).run(date, code, nav, changePct)
}

// ---------- analysis_reports ----------

export interface ReportRow {
  id: number
  date: string
  research_score: number
  quant_score: number | null
  direction: string
  report_json: string
}

export function upsertReport(db: Database.Database, date: string, researchScore: number, quantScore: number, direction: string, json: string): void {
  db.prepare(
    `INSERT INTO analysis_reports (date, research_score, quant_score, direction, report_json)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET
       research_score=excluded.research_score, quant_score=excluded.quant_score,
       direction=excluded.direction, report_json=excluded.report_json`,
  ).run(date, researchScore, quantScore, direction, json)
}

export function getRecentReports(db: Database.Database, days: number): ReportRow[] {
  const from = addCalendarDays(new Date().toISOString().slice(0, 10), -days)
  return db.prepare('SELECT * FROM analysis_reports WHERE date >= ? ORDER BY date DESC').all(from) as ReportRow[]
}

export function getReportByDate(db: Database.Database, date: string): ReportRow | undefined {
  return db.prepare('SELECT * FROM analysis_reports WHERE date = ?').get(date) as ReportRow | undefined
}

// ---------- 校准 & 预测追踪 ----------

function validClose(v: number | null | undefined): v is number {
  return v != null && Number.isFinite(v) && v > 0
}

/** date 起 T 个交易日后的主指数收益率（%） */
function futureReturn(db: Database.Database, date: string, T: number): number | null {
  const cur = getIndexPrice(db, date)
  if (!validClose(cur?.main_close)) return null
  const after = getPricesAfter(db, date, T).filter((p) => validClose(p.main_close))
  if (after.length < Math.min(T, 3)) return null
  const fut = after.length >= T ? after[T - 1] : after[after.length - 1]
  if (!validClose(fut.main_close)) return null
  return ((fut.main_close - cur!.main_close!) / cur!.main_close!) * 100
}

export interface CalibrationBucket {
  range: string
  sample: number
  actualUpProbability: number
  avgReturn: number
  bias: 'calibrated' | 'optimistic' | 'pessimistic'
}

export interface CalibrationReport {
  days: number
  T: number
  totalReports: number
  validReports: number
  buckets: CalibrationBucket[]
  recommendations: string[]
}

export function computeCalibration(db: Database.Database, days: number, T = 5): CalibrationReport {
  const reports = getRecentReports(db, days)
  const buckets: CalibrationBucket[] = []
  let validTotal = 0

  for (const { range, min, max } of SCORE_BUCKETS) {
    const isLast = max === 100
    const matching = reports.filter((r) => r.research_score >= min && (isLast ? r.research_score <= max : r.research_score < max))
    if (matching.length === 0) continue
    let up = 0
    let sum = 0
    let valid = 0
    for (const r of matching) {
      const ret = futureReturn(db, r.date, T)
      if (ret == null) continue
      if (ret > 0) up++
      sum += ret
      valid++
    }
    if (valid === 0) continue
    validTotal += valid
    const actualUpProbability = up / valid
    const mid = (min + max) / 2
    const err = Math.abs(mid - actualUpProbability * 100)
    buckets.push({
      range,
      sample: valid,
      actualUpProbability: Math.round(actualUpProbability * 1000) / 10,
      avgReturn: Math.round((sum / valid) * 100) / 100,
      bias: err < 8 ? 'calibrated' : mid > actualUpProbability * 100 ? 'optimistic' : 'pessimistic',
    })
  }

  const recommendations: string[] = []
  const optimistic = buckets.filter((b) => b.bias === 'optimistic')
  if (optimistic.length) recommendations.push(`评分区间 ${optimistic.map((b) => b.range).join('/')} 偏乐观，研判宜更谨慎`)
  if (recommendations.length === 0) recommendations.push(buckets.length ? '校准状态良好，继续积累样本' : '样本不足，请持续每日 analysis 以积累校准数据')

  return { days, T, totalReports: reports.length, validReports: validTotal, buckets, recommendations }
}

/** 给定研判分的历史同分段命中上下文（供 reliability card） */
export function getCalibrationContext(db: Database.Database, score: number): { sampleSize: number; upRate: number | null; bias: string } {
  const range = scoreBucketRange(score)
  if (!range) return { sampleSize: 0, upRate: null, bias: '未知' }
  const reports = getRecentReports(db, 120).filter((r) => {
    const isLast = range.max === 100
    return r.research_score >= range.min && (isLast ? r.research_score <= range.max : r.research_score < range.max)
  })
  let up = 0
  let valid = 0
  for (const r of reports) {
    const ret = futureReturn(db, r.date, 5)
    if (ret == null) continue
    if (ret > 0) up++
    valid++
  }
  if (valid < 5) return { sampleSize: valid, upRate: null, bias: '样本不足' }
  const upRate = up / valid
  const mid = (range.min + range.max) / 2
  const bias = mid > upRate * 100 ? '偏乐观' : mid < upRate * 100 ? '偏保守' : '校准良好'
  return { sampleSize: valid, upRate: Math.round(upRate * 1000) / 10, bias }
}

export interface PredictionRow {
  date: string
  researchScore: number
  quantScore: number | null
  pred: 'up' | 'down' | 'flat'
  actual5dPct: number | null
  status: 'hit' | 'miss' | 'flat' | 'pending'
}

export interface PredictionTrack {
  windowDays: number
  sample: number
  hitRate: number | null
  hits: number
  total: number
  recent: PredictionRow[]
}

function predDir(score: number): 'up' | 'down' | null {
  if (score > 55) return 'up'
  if (score < 45) return 'down'
  return null
}

export function buildPredictionTrack(db: Database.Database, windowDays = 120, T = 5): PredictionTrack {
  const reports = getRecentReports(db, windowDays)
  let hits = 0
  let total = 0
  const recent: PredictionRow[] = []
  for (const r of reports) {
    const ret = futureReturn(db, r.date, T)
    const dir = predDir(r.research_score)
    let status: PredictionRow['status'] = 'pending'
    let pred: PredictionRow['pred'] = 'flat'
    if (dir === 'up') pred = 'up'
    else if (dir === 'down') pred = 'down'

    if (ret == null) status = 'pending'
    else if (Math.abs(ret) <= 0.1 || pred === 'flat') status = 'flat'
    else {
      const hit = (pred === 'up' && ret > 0.1) || (pred === 'down' && ret < -0.1)
      status = hit ? 'hit' : 'miss'
      total++
      if (hit) hits++
    }
    if (recent.length < 14) {
      recent.push({ date: r.date, researchScore: r.research_score, quantScore: r.quant_score, pred, actual5dPct: ret != null ? Math.round(ret * 100) / 100 : null, status })
    }
  }
  return { windowDays, sample: reports.length, hitRate: total > 0 ? hits / total : null, hits, total, recent }
}
