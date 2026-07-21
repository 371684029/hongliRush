// 大A红利主题标的定义 — 指数（研判锚）+ 推荐红利基金（ETF/LOF）
// 数据经由 Yahoo Finance 拉取真实行情，代码沿用交易所标准代码。

export interface DividendIndexDef {
  /** 展示名 */
  name: string
  /** 交易所标准指数代码 */
  code: string
  /** Yahoo Finance symbol（用于实时点位；指数仅提供 1d/5d 行情） */
  yahoo: string
  /**
   * 历史/量化数据源 Yahoo symbol（跟踪该指数的场内 ETF）。
   * 指数本身在 Yahoo 无长历史，故技术指标与回测以其跟踪 ETF 为准。
   */
  historyYahoo?: string
  /** 是否为主研判指数 */
  primary?: boolean
  /** 参考股息率（%，静态基准，仅展示；实时以行情为准） */
  refYield?: number
}

export interface DividendFundDef {
  name: string
  code: string
  yahoo: string
  type: string
  trackingIndex: string
  reason: string
}

/** 红利指数（研判基准）。主指数为中证红利 000922。 */
export const DIVIDEND_INDICES: DividendIndexDef[] = [
  { name: '中证红利', code: '000922', yahoo: '000922.SS', historyYahoo: '515080.SS', primary: true, refYield: 5.4 },
  { name: '上证红利', code: '000015', yahoo: '000015.SS', historyYahoo: '510880.SS', refYield: 5.1 },
  { name: '沪深300红利', code: '000821', yahoo: '000821.SS', refYield: 3.6 },
]

/** 推荐红利基金（以场内 ETF 为主，Yahoo 可取真实净值/价格）。 */
export const DIVIDEND_FUNDS: DividendFundDef[] = [
  {
    name: '华泰柏瑞上证红利ETF',
    code: '510880',
    yahoo: '510880.SS',
    type: '股票型 ETF',
    trackingIndex: '上证红利 000015',
    reason: '上证红利老牌龙头，规模大、流动性好、分红稳定，红利底仓优选。',
  },
  {
    name: '招商中证红利ETF',
    code: '515080',
    yahoo: '515080.SS',
    type: '股票型 ETF',
    trackingIndex: '中证红利 000922',
    reason: '跟踪中证红利，行业更分散、股息率较高，适合作为红利核心配置。',
  },
  {
    name: '华泰柏瑞中证红利低波ETF',
    code: '512890',
    yahoo: '512890.SS',
    type: '股票型 ETF',
    trackingIndex: '中证红利低波动 H30269',
    reason: '红利+低波双因子，回撤更小、夏普更优，震荡市的进攻型防御选择。',
  },
  {
    name: '景顺长城中证红利低波100ETF',
    code: '515100',
    yahoo: '515100.SS',
    type: '股票型 ETF',
    trackingIndex: '红利低波100 930955',
    reason: '成分覆盖更广、波动更低，适合追求平稳持有体验的稳健型投资者。',
  },
]

/** 主研判指数 */
export function primaryIndex(): DividendIndexDef {
  return DIVIDEND_INDICES.find((i) => i.primary) ?? DIVIDEND_INDICES[0]
}

/** 低波代理（用于相对强弱因子）：红利低波ETF */
export const LOW_VOL_PROXY_YAHOO = '512890.SS'
