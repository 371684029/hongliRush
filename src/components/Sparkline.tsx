interface SparklineProps {
  data: number[]
  positive: boolean
  width?: number
  height?: number
}

export function Sparkline({ data, positive, width = 140, height = 44 }: SparklineProps) {
  if (data.length === 0) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const span = max - min || 1
  const stepX = width / (data.length - 1 || 1)

  const points = data.map((value, index) => {
    const x = index * stepX
    const y = height - ((value - min) / span) * (height - 6) - 3
    return [x, y] as const
  })

  const linePath = points
    .map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ')

  const areaPath = `${linePath} L${width},${height} L0,${height} Z`
  const color = positive ? 'var(--up)' : 'var(--down)'
  const gradId = `spark-${positive ? 'up' : 'down'}`

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}
