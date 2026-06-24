import type { DividendIndex } from '../data/report'
import { Sparkline } from './Sparkline'

interface IndexCardProps {
  item: DividendIndex
}

export function IndexCard({ item }: IndexCardProps) {
  const positive = item.changePct >= 0
  const trendClass = positive ? 'up' : 'down'

  return (
    <article className="index-card">
      <header className="index-card__head">
        <div>
          <h3 className="index-card__name">{item.name}</h3>
          <span className="index-card__code">{item.code}</span>
        </div>
        <span className={`tag tag--${trendClass}`}>
          {positive ? '+' : ''}
          {item.changePct.toFixed(2)}%
        </span>
      </header>

      <div className="index-card__body">
        <div className={`index-card__point ${trendClass}`}>{item.point.toLocaleString()}</div>
        <Sparkline data={item.trend} positive={positive} />
      </div>

      <footer className="index-card__foot">
        <div className="metric">
          <span className="metric__label">股息率</span>
          <span className="metric__value">{item.dividendYield.toFixed(2)}%</span>
        </div>
        <div className="metric">
          <span className="metric__label">PE(TTM)</span>
          <span className="metric__value">{item.pe.toFixed(1)}</span>
        </div>
      </footer>
    </article>
  )
}
