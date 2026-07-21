import { useEffect, useState } from 'react'
import { type AnalysisData, directionLabel, loadAnalysis } from './data/analysis'

function pct(v: number | null | undefined, digits = 2): string {
  if (v == null) return 'N/A'
  return `${v > 0 ? '+' : ''}${v.toFixed(digits)}%`
}
function num(v: number | null | undefined, digits = 2): string {
  return v == null ? 'N/A' : v.toFixed(digits)
}
function trendClass(v: number | null | undefined): string {
  if (v == null) return ''
  return v > 0 ? 'up' : v < 0 ? 'down' : ''
}

function GateBadge({ tier }: { tier: 'green' | 'yellow' | 'red' }) {
  const map = { green: ['🟢', '高可信', 'badge--green'], yellow: ['🟡', '降级可用', 'badge--yellow'], red: ['🔴', '不可用', 'badge--red'] } as const
  const [emoji, label, cls] = map[tier]
  return (
    <span className={`badge ${cls}`}>
      {emoji} {label}
    </span>
  )
}

function ScoreMeter({ label, score, band }: { label: string; score: number; band?: { low: number; high: number } }) {
  return (
    <div className="meter">
      <div className="meter__head">
        <span className="meter__label">{label}</span>
        <span className="meter__score">{score}</span>
      </div>
      <div className="meter__track">
        {band && <div className="meter__band" style={{ left: `${band.low}%`, width: `${Math.max(2, band.high - band.low)}%` }} />}
        <div className="meter__fill" style={{ width: `${score}%` }} />
        <div className="meter__mid" />
      </div>
    </div>
  )
}

function App() {
  const [data, setData] = useState<AnalysisData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadAnalysis()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [])

  if (error) {
    return (
      <div className="state">
        <div className="state__card">
          <h1>数据未就绪</h1>
          <p>{error}</p>
          <p className="state__hint">
            请先在项目根目录运行 <code>npm run analysis</code> 生成最新日报数据（<code>public/hongli-latest.json</code>），再刷新本页。
          </p>
        </div>
      </div>
    )
  }
  if (!data) {
    return (
      <div className="state">
        <div className="state__card">
          <div className="spinner" />
          <p>正在加载大A红利日报数据…</p>
        </div>
      </div>
    )
  }

  const r = data
  const upCount = r.indices.filter((i) => (i.changePct ?? 0) >= 0).length

  return (
    <div className="page">
      <header className="hero">
        <div className="hero__inner">
          <div className="hero__brand">
            <span className="hero__logo">红</span>
            <div>
              <h1 className="hero__title">
                hongli<span className="accent">Rush</span> · 大A红利金融投资日报
              </h1>
              <p className="hero__sub">
                {r.date} · 生成于 {new Date(r.generatedAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })} · 本地量化引擎
              </p>
            </div>
          </div>
          <div className="hero__pills">
            <div className="pill">
              <span className="pill__label">可信度</span>
              <span className="pill__value">
                {r.reliability.emoji} {r.reliability.score}
              </span>
            </div>
            <div className="pill">
              <span className="pill__label">研判 / 量化</span>
              <span className="pill__value">
                {r.verdict.researchScore}/{r.verdict.quantScore}
              </span>
            </div>
            <div className="pill">
              <span className="pill__label">指数上涨</span>
              <span className="pill__value">
                {upCount}/{r.indices.length}
              </span>
            </div>
          </div>
        </div>
        <p className="hero__headline">{r.headline}</p>
      </header>

      <main className="container">
        {/* 可信度一览 */}
        <section className="section">
          <div className="section__head">
            <h2 className="section__title">可信度一览</h2>
            <span className="section__hint">Reliability · 操作可信度，非涨跌承诺</span>
          </div>
          <div className="panel reliability">
            <div className="reliability__top">
              <div className={`rel-score rel-score--${r.reliability.tier}`}>
                <span className="rel-score__num">{r.reliability.score}</span>
                <span className="rel-score__of">/100</span>
                <span className="rel-score__label">
                  {r.reliability.emoji} {r.reliability.label}
                </span>
              </div>
              <div className="reliability__tldr">
                <p>1 · {r.reliability.tldr.line1.replace(/\*\*/g, '')}</p>
                <p>2 · {r.reliability.tldr.line2.replace(/\*\*/g, '')}</p>
                <p>3 · {r.reliability.tldr.line3.replace(/\*\*/g, '')}</p>
                <p className="reliability__band">
                  评分展示区间 {r.reliability.scoreBand.low}–{r.reliability.scoreBand.high}（中心 {r.reliability.scoreBand.center}，半宽 ±{r.reliability.bandHalfWidth}）
                </p>
              </div>
            </div>
            <div className="factor-grid">
              {r.reliability.factors.map((f) => (
                <div key={f.name} className={`factor ${f.ok ? 'factor--ok' : 'factor--warn'}`}>
                  <div className="factor__head">
                    <span>{f.ok ? '✅' : '⚠️'} {f.name}</span>
                    <span className="factor__pts">{f.points}/{f.weight}</span>
                  </div>
                  <div className="factor__detail">{f.detail}</div>
                </div>
              ))}
            </div>
            {r.reliability.warnings.length > 0 && <p className="reliability__warn">注意：{r.reliability.warnings.join('；')}</p>}
          </div>
        </section>

        {/* 数据质量门禁 + 双打分 */}
        <div className="two-col">
          <section className="section">
            <div className="section__head">
              <h2 className="section__title">数据质量门禁</h2>
              <span className="section__hint">Data Quality</span>
            </div>
            <div className="panel">
              <div className="gate__row">
                <GateBadge tier={r.gate.tier} />
                <span className="gate__conf">置信度 {r.gate.confidence}%</span>
                <span className={`gate__act ${r.gate.actionable ? 'up' : 'down'}`}>{r.gate.actionable ? '可操作' : '不可操作'}</span>
              </div>
              {r.gate.anchorDeviationPct != null && <p className="gate__line">实时价 vs 最近收盘锚定偏差：{r.gate.anchorDeviationPct}%</p>}
              {r.gate.missing.length > 0 && <p className="gate__line">暂缺：{r.gate.missing.join('、')}</p>}
              {r.gate.banners.map((b, i) => (
                <p key={i} className="gate__banner">{b}</p>
              ))}
            </div>
          </section>

          <section className="section">
            <div className="section__head">
              <h2 className="section__title">双打分机制</h2>
              <span className="section__hint">Research × Quant</span>
            </div>
            <div className="panel">
              <ScoreMeter label={`研判分 · ${directionLabel(r.verdict.researchDirection)}`} score={r.verdict.researchScore} band={r.reliability.scoreBand} />
              <ScoreMeter label={`量化分 · ${directionLabel(r.verdict.quantDirection)}`} score={r.verdict.quantScore} />
              <div className="dual__meta">
                <span>偏差 {r.verdict.delta > 0 ? '+' : ''}{r.verdict.delta}</span>
                <span className={`tag ${r.verdict.alignment === 'conflict' ? 'tag--down' : 'tag--up'}`}>{r.verdict.alignment}</span>
                <span>估值倾斜 {r.verdict.valuationTilt > 0 ? '+' : ''}{r.verdict.valuationTilt}</span>
              </div>
              <div className="rebuttal">
                <strong>🧨 强制反驳：</strong>
                看空力度 {r.verdict.rebuttal.bearScore}/100 · 下修 {(r.verdict.rebuttal.penaltyPct * 100).toFixed(0)}%
                <ul>
                  {r.verdict.rebuttal.factors.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        </div>

        {/* 红利指数行情 */}
        <section className="section">
          <div className="section__head">
            <h2 className="section__title">红利指数行情</h2>
            <span className="section__hint">Dividend Indices · Yahoo 实时</span>
          </div>
          <div className="index-grid">
            {r.indices.map((i) => (
              <article key={i.code} className="index-card">
                <header className="index-card__head">
                  <div>
                    <h3 className="index-card__name">{i.name}</h3>
                    <span className="index-card__code">{i.code}</span>
                  </div>
                  <span className={`tag ${trendClass(i.changePct) === 'up' ? 'tag--up' : 'tag--down'}`}>{pct(i.changePct)}</span>
                </header>
                <div className={`index-card__point ${trendClass(i.changePct)}`}>{num(i.price)}</div>
                <div className="index-card__foot">
                  <div className="metric">
                    <span className="metric__label">RSI14</span>
                    <span className="metric__value">{num(i.rsi14, 1)}</span>
                  </div>
                  <div className="metric">
                    <span className="metric__label">近20日</span>
                    <span className={`metric__value ${trendClass(i.return20d)}`}>{pct(i.return20d, 1)}</span>
                  </div>
                  <div className="metric">
                    <span className="metric__label">参考股息率</span>
                    <span className="metric__value">{i.refYield != null ? i.refYield + '%' : 'N/A'}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <p className="fineprint">点位/涨跌为实时行情；RSI 与近 20 日基于跟踪 ETF 走势近似代表；参考股息率为静态基准。</p>
        </section>

        {/* 量化因子 */}
        <section className="section">
          <div className="section__head">
            <h2 className="section__title">量化因子构成</h2>
            <span className="section__hint">纯本地 · 可复现 · 合计 {r.quant.score}</span>
          </div>
          <div className="panel">
            {Object.values(r.quant.factors).map((f) => (
              <div key={f.name} className="qf">
                <span className="qf__name">{f.name}</span>
                <div className="qf__bar">
                  <div className="qf__fill" style={{ width: `${f.signal}%` }} />
                  <div className="meter__mid" />
                </div>
                <span className="qf__val">
                  信号 {f.signal} · {(f.weight * 100).toFixed(0)}% · +{f.contribution.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* 情景 + 尾部风险 + 仓位 */}
        <div className="two-col">
          <section className="section">
            <div className="section__head">
              <h2 className="section__title">三情景推演</h2>
              <span className="section__hint">未来约 20 交易日</span>
            </div>
            <div className="panel">
              {r.scenarios.map((s) => (
                <div key={s.name} className="scenario">
                  <div className="scenario__head">
                    <span className="scenario__name">{s.name}</span>
                    <span className="scenario__prob">{s.probability}%</span>
                    <span className={`scenario__ret ${trendClass(s.expectedReturn20d)}`}>{pct(s.expectedReturn20d, 1)}</span>
                  </div>
                  <div className="scenario__bar">
                    <div className="scenario__fill" style={{ width: `${s.probability}%` }} />
                  </div>
                  <p className="scenario__note">{s.note}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="section">
            <div className="section__head">
              <h2 className="section__title">仓位与风险</h2>
              <span className="section__hint">Position &amp; Tail Risk</span>
            </div>
            <div className="panel position">
              <div className="position__big">
                {r.position.emoji} {r.position.targetPct}%
              </div>
              <div className="position__label">{r.position.label}</div>
              <p className="position__headline">{r.position.headline}</p>
              <div className={`tail tail--${r.tailRisk.level}`}>
                尾部风险：{r.tailRisk.level === 'high' ? '偏高' : r.tailRisk.level === 'medium' ? '中等' : '可控'}
                {r.tailRisk.drawdownFromHigh != null && <> · 距52周高 {r.tailRisk.drawdownFromHigh}%</>}
                {r.tailRisk.atrPct != null && <> · ATR {r.tailRisk.atrPct}%</>}
              </div>
              <p className="position__note">{r.tailRisk.note}</p>
            </div>
          </section>
        </div>

        {/* 推荐红利基金 */}
        <section className="section">
          <div className="section__head">
            <h2 className="section__title">推荐大A红利基金</h2>
            <span className="section__hint">Recommended Funds · 实时净值</span>
          </div>
          <div className="fund-list">
            {r.funds.map((f, i) => (
              <article key={f.code} className="fund-card">
                <div className="fund-card__rank">{i + 1}</div>
                <div className="fund-card__main">
                  <header className="fund-card__head">
                    <div>
                      <h3 className="fund-card__name">{f.name}</h3>
                      <div className="fund-card__meta">
                        <span className="fund-card__code">{f.code}</span>
                        <span className="dot" /> {f.type} <span className="dot" /> 跟踪 {f.trackingIndex}
                      </div>
                    </div>
                  </header>
                  <div className="fund-card__stats">
                    <div className="stat">
                      <span className="stat__label">最新净值</span>
                      <span className="stat__value">{num(f.nav, 3)}</span>
                    </div>
                    <div className="stat">
                      <span className="stat__label">日涨跌</span>
                      <span className={`stat__value ${trendClass(f.changePct)}`}>{pct(f.changePct)}</span>
                    </div>
                    <div className="stat">
                      <span className="stat__label">近一年</span>
                      <span className={`stat__value ${trendClass(f.yearReturn)}`}>{pct(f.yearReturn, 1)}</span>
                    </div>
                  </div>
                  <p className="fund-card__reason">{f.reason}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* 历史预测对错 */}
        <section className="section">
          <div className="section__head">
            <h2 className="section__title">历史预测对错</h2>
            <span className="section__hint">近 {r.track.windowDays} 日 · 5日标签 · 回测校准</span>
          </div>
          <div className="panel">
            <div className="track__summary">
              {r.track.total > 0 ? (
                <>
                  <span className="track__big">{((r.track.hitRate ?? 0) * 100).toFixed(0)}%</span>
                  <span className="track__sub">方向命中率（{r.track.hits}/{r.track.total}）· 样本 {r.track.sample} 条</span>
                </>
              ) : (
                <span className="track__sub">暂无可判定样本，需每日运行 analysis 积累（5 个交易日后自动回填对错）</span>
              )}
              {r.calibration.upRate != null && (
                <span className="track__cal">
                  同分段历史 5 日上涨 {r.calibration.upRate}%（{r.calibration.bias}，n={r.calibration.sampleSize}）
                </span>
              )}
            </div>
            {r.track.recent.length > 0 && (
              <div className="track__table">
                <table>
                  <thead>
                    <tr>
                      <th>日期</th>
                      <th>研判</th>
                      <th>量化</th>
                      <th>预测</th>
                      <th>5日涨跌</th>
                      <th>对错</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.track.recent.map((t) => (
                      <tr key={t.date}>
                        <td>{t.date}</td>
                        <td>{t.researchScore}</td>
                        <td>{t.quantScore ?? '—'}</td>
                        <td>{t.pred === 'up' ? '涨' : t.pred === 'down' ? '跌' : '平'}</td>
                        <td className={trendClass(t.actual5dPct)}>{t.actual5dPct != null ? pct(t.actual5dPct, 2) : '—'}</td>
                        <td>{t.status === 'hit' ? '✅' : t.status === 'miss' ? '❌' : t.status === 'flat' ? '➖' : '⏳'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="fineprint">预测方向：研判分 &gt;55 记「涨」、&lt;45 记「跌」，中间不计入命中率；持平不计对错。非投资业绩承诺。</p>
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>{r.disclaimer}</p>
        <p className="footer__brand">hongliRush · 数据经 Yahoo Finance 实时采集 + 本地量化引擎 · 维护者 wll</p>
      </footer>
    </div>
  )
}

export default App
