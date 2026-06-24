import type { DividendFund } from '../data/report'

interface FundCardProps {
  item: DividendFund
  rank: number
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="stars" aria-label={`评级 ${rating} 星`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < rating ? 'star star--on' : 'star'}>
          ★
        </span>
      ))}
    </span>
  )
}

export function FundCard({ item, rank }: FundCardProps) {
  const positive = item.changePct >= 0

  return (
    <article className="fund-card">
      <div className="fund-card__rank">{rank}</div>
      <div className="fund-card__main">
        <header className="fund-card__head">
          <div>
            <h3 className="fund-card__name">{item.name}</h3>
            <div className="fund-card__meta">
              <span className="fund-card__code">{item.code}</span>
              <span className="dot" />
              <span>{item.type}</span>
              <span className="dot" />
              <span>跟踪 {item.trackingIndex}</span>
            </div>
          </div>
          <Stars rating={item.rating} />
        </header>

        <div className="fund-card__stats">
          <div className="stat">
            <span className="stat__label">最新净值</span>
            <span className="stat__value">{item.nav.toFixed(3)}</span>
          </div>
          <div className="stat">
            <span className="stat__label">日涨跌</span>
            <span className={`stat__value ${positive ? 'up' : 'down'}`}>
              {positive ? '+' : ''}
              {item.changePct.toFixed(2)}%
            </span>
          </div>
          <div className="stat">
            <span className="stat__label">近一年</span>
            <span className="stat__value up">+{item.yearReturn.toFixed(1)}%</span>
          </div>
          <div className="stat">
            <span className="stat__label">股息率</span>
            <span className="stat__value">{item.dividendYield.toFixed(1)}%</span>
          </div>
          <div className="stat">
            <span className="stat__label">规模</span>
            <span className="stat__value">{item.scale.toFixed(1)}亿</span>
          </div>
        </div>

        <p className="fund-card__reason">{item.reason}</p>
      </div>
    </article>
  )
}
