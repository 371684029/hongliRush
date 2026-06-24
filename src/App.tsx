import { dividendIndices, recommendedFunds, report } from './data/report'
import { IndexCard } from './components/IndexCard'
import { FundCard } from './components/FundCard'

function App() {
  const upCount = dividendIndices.filter((i) => i.changePct >= 0).length
  const avgYield = (
    dividendIndices.reduce((sum, i) => sum + i.dividendYield, 0) / dividendIndices.length
  ).toFixed(2)

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
                {report.date} · {report.marketStatus}
              </p>
            </div>
          </div>
          <div className="hero__pills">
            <div className="pill">
              <span className="pill__label">红利指数上涨</span>
              <span className="pill__value">
                {upCount}/{dividendIndices.length}
              </span>
            </div>
            <div className="pill">
              <span className="pill__label">平均股息率</span>
              <span className="pill__value">{avgYield}%</span>
            </div>
          </div>
        </div>
        <p className="hero__headline">{report.headline}</p>
      </header>

      <main className="container">
        <section className="section">
          <div className="section__head">
            <h2 className="section__title">市场综述</h2>
            <span className="section__hint">Market Overview</span>
          </div>
          <div className="overview">
            {report.overview.map((para, i) => (
              <p key={i} className="overview__para">
                {para}
              </p>
            ))}
          </div>
        </section>

        <section className="section">
          <div className="section__head">
            <h2 className="section__title">红利指数行情</h2>
            <span className="section__hint">Dividend Indices</span>
          </div>
          <div className="index-grid">
            {dividendIndices.map((item) => (
              <IndexCard key={item.code} item={item} />
            ))}
          </div>
        </section>

        <section className="section">
          <div className="section__head">
            <h2 className="section__title">推荐大A红利基金</h2>
            <span className="section__hint">Recommended Funds</span>
          </div>
          <div className="fund-list">
            {recommendedFunds.map((item, i) => (
              <FundCard key={item.code} item={item} rank={i + 1} />
            ))}
          </div>
        </section>

        <div className="two-col">
          <section className="section panel panel--view">
            <div className="section__head">
              <h2 className="section__title">投资观点</h2>
              <span className="section__hint">Viewpoints</span>
            </div>
            <ul className="bullet-list">
              {report.viewpoints.map((v, i) => (
                <li key={i} className="bullet-list__item">
                  {v}
                </li>
              ))}
            </ul>
          </section>

          <section className="section panel panel--risk">
            <div className="section__head">
              <h2 className="section__title">风险提示</h2>
              <span className="section__hint">Risk Warning</span>
            </div>
            <ul className="bullet-list bullet-list--risk">
              {report.riskTips.map((v, i) => (
                <li key={i} className="bullet-list__item">
                  {v}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>

      <footer className="footer">
        <p>
          hongliRush · 大A红利金融投资日报 · 数据为演示用途，不构成投资建议 · 市场有风险，投资需谨慎
        </p>
      </footer>
    </div>
  )
}

export default App
