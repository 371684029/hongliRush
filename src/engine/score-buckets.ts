// 评分分桶（校准用）—— 纯函数，无外部依赖

export interface ScoreBucket {
  range: string
  min: number
  max: number
}

export const SCORE_BUCKETS: ScoreBucket[] = [
  { range: '0-30', min: 0, max: 30 },
  { range: '30-45', min: 30, max: 45 },
  { range: '45-55', min: 45, max: 55 },
  { range: '55-65', min: 55, max: 65 },
  { range: '65-75', min: 65, max: 75 },
  { range: '75-85', min: 75, max: 85 },
  { range: '85-100', min: 85, max: 100 },
]

/** 左闭右开 [min, max)，最后一桶右端闭区间，使满分 100 归入 85-100 */
export function scoreBucketRange(score: number): ScoreBucket | null {
  for (const b of SCORE_BUCKETS) {
    const isLast = b.max === 100
    if (score >= b.min && (isLast ? score <= b.max : score < b.max)) return b
  }
  return null
}
