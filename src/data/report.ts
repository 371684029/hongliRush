// 数据说明：本文件为「大A红利金融投资日报」的演示数据，用于本地开发与界面展示。
// 数值并非实时行情，仅供产品演示与界面联调；实际接入时可替换为行情/基金接口返回的数据结构。
// 本页面所有内容不构成任何投资建议，市场有风险，投资需谨慎。

export interface DividendIndex {
  /** 指数名称 */
  name: string
  /** 指数代码 */
  code: string
  /** 最新点位 */
  point: number
  /** 当日涨跌幅（%） */
  changePct: number
  /** 股息率（%，近12个月） */
  dividendYield: number
  /** 市盈率 PE（TTM） */
  pe: number
  /** 近一段时间走势序列，用于绘制迷你走势图 */
  trend: number[]
}

export interface DividendFund {
  /** 基金名称 */
  name: string
  /** 基金代码 */
  code: string
  /** 基金类型 */
  type: string
  /** 跟踪/对标指数 */
  trackingIndex: string
  /** 最新净值 */
  nav: number
  /** 当日涨跌幅（%） */
  changePct: number
  /** 近一年收益率（%） */
  yearReturn: number
  /** 股息率（%） */
  dividendYield: number
  /** 规模（亿元） */
  scale: number
  /** 综合评级（1-5） */
  rating: number
  /** 推荐理由 */
  reason: string
}

export interface DailyReport {
  /** 日报日期 */
  date: string
  /** 交易日 / 休市 */
  marketStatus: string
  /** 一句话摘要 */
  headline: string
  /** 市场综述正文段落 */
  overview: string[]
  /** 投资观点 */
  viewpoints: string[]
  /** 风险提示 */
  riskTips: string[]
}

export const report: DailyReport = {
  date: '2026年6月24日 星期三',
  marketStatus: '交易日 · 已收盘',
  headline:
    '红利资产延续高股息防御逻辑，低波红利相对占优；险资与中长期资金持续增配，红利风格仍是震荡市的“压舱石”。',
  overview: [
    '今日 A 股红利板块整体震荡走强，中证红利指数收涨，银行、煤炭、交通运输等高股息权重贡献主要涨幅，电力与公用事业表现稳健。',
    '在无风险利率维持低位、市场风险偏好谨慎的背景下，高股息资产的“类债”属性继续吸引中长期资金流入，红利低波策略相对全收益指数更抗跌。',
    '资金面上，红利相关 ETF 近一周净申购延续，险资、年金等长线资金对稳定分红、低估值标的的配置需求不减。',
  ],
  viewpoints: [
    '核心配置：以中证红利、上证红利等宽基红利指数作为底仓，获取稳定股息与估值修复弹性。',
    '增强进攻：在波动放大的阶段，可用“红利低波”策略降低组合回撤，提升持有体验。',
    '关注分红：优先选择股息率高、分红连续且现金流稳定的标的，规避“高股息陷阱”（盈利下滑导致的被动高股息）。',
    '定投思路：红利资产适合长期定投与红利再投资，复利效应在 3 年以上维度更为显著。',
  ],
  riskTips: [
    '本日报为演示内容，不构成任何投资建议；历史业绩不代表未来表现。',
    '高股息板块对利率变化敏感，若无风险利率快速上行，红利资产估值可能承压。',
    '个别行业（如周期类）的高股息具有不可持续性，需关注盈利与分红的可持续性。',
    '基金投资有风险，申购前请阅读基金合同与招募说明书，市场有风险，投资需谨慎。',
  ],
}

export const dividendIndices: DividendIndex[] = [
  {
    name: '中证红利',
    code: '000922',
    point: 5876.42,
    changePct: 0.68,
    dividendYield: 5.42,
    pe: 7.6,
    trend: [5720, 5742, 5731, 5768, 5790, 5812, 5798, 5837, 5851, 5876],
  },
  {
    name: '上证红利',
    code: '000015',
    point: 3489.17,
    changePct: 0.54,
    dividendYield: 5.18,
    pe: 7.1,
    trend: [3402, 3418, 3411, 3437, 3450, 3462, 3455, 3471, 3480, 3489],
  },
  {
    name: '中证红利低波动',
    code: 'H30269',
    point: 9123.55,
    changePct: 0.31,
    dividendYield: 5.86,
    pe: 7.0,
    trend: [9012, 9035, 9048, 9061, 9057, 9080, 9092, 9101, 9115, 9124],
  },
  {
    name: '红利低波100',
    code: '930955',
    point: 4612.88,
    changePct: 0.22,
    dividendYield: 5.64,
    pe: 7.3,
    trend: [4560, 4571, 4565, 4583, 4590, 4597, 4588, 4601, 4608, 4613],
  },
]

export const recommendedFunds: DividendFund[] = [
  {
    name: '华泰柏瑞上证红利ETF',
    code: '510880',
    type: '股票型 ETF',
    trackingIndex: '上证红利 000015',
    nav: 3.215,
    changePct: 0.56,
    yearReturn: 12.4,
    dividendYield: 5.1,
    scale: 198.6,
    rating: 5,
    reason: '上证红利老牌龙头ETF，规模大、流动性好、分红稳定，红利底仓优选。',
  },
  {
    name: '招商中证红利ETF',
    code: '515080',
    type: '股票型 ETF',
    trackingIndex: '中证红利 000922',
    nav: 1.182,
    changePct: 0.62,
    yearReturn: 13.1,
    dividendYield: 5.4,
    scale: 86.3,
    rating: 5,
    reason: '跟踪中证红利，行业更分散，股息率较高，适合作为红利核心配置。',
  },
  {
    name: '华泰柏瑞中证红利低波ETF',
    code: '512890',
    type: '股票型 ETF',
    trackingIndex: '中证红利低波动 H30269',
    nav: 1.456,
    changePct: 0.34,
    yearReturn: 14.6,
    dividendYield: 5.8,
    scale: 152.7,
    rating: 5,
    reason: '红利+低波双因子，回撤更小、夏普更优，震荡市的进攻型防御选择。',
  },
  {
    name: '景顺长城中证红利低波100ETF',
    code: '515100',
    type: '股票型 ETF',
    trackingIndex: '红利低波100 930955',
    nav: 1.328,
    changePct: 0.25,
    yearReturn: 13.8,
    dividendYield: 5.6,
    scale: 64.9,
    rating: 4,
    reason: '成分覆盖更广、波动更低，适合追求平稳持有体验的稳健型投资者。',
  },
  {
    name: '富国中证红利指数增强A',
    code: '100032',
    type: '指数增强',
    trackingIndex: '中证红利 000922',
    nav: 1.087,
    changePct: 0.71,
    yearReturn: 15.2,
    dividendYield: 4.9,
    scale: 42.1,
    rating: 4,
    reason: '在红利指数基础上叠加增强策略，长期超额收益突出，适合进取型配置。',
  },
  {
    name: '大成中证红利指数A',
    code: '090010',
    type: '指数 LOF',
    trackingIndex: '中证红利 000922',
    nav: 1.642,
    changePct: 0.49,
    yearReturn: 12.9,
    dividendYield: 5.0,
    scale: 18.5,
    rating: 4,
    reason: '场内外皆可申赎，跟踪误差小，适合定投与红利再投资的长期持有者。',
  },
]
