# hongliRush · 大A红利金融投资日报

> 一个面向 A 股「红利 / 高股息」主题的金融投资日报前端应用：聚合红利指数行情、市场综述、投资观点与风险提示，并附上精选的大A红利基金推荐。

<p align="center">
  <img src="docs/images/screenshot-overview.webp" alt="hongliRush 日报首页" width="860" />
</p>

---

## 目录

- [项目简介](#项目简介)
- [功能特性](#功能特性)
- [界面预览](#界面预览)
- [技术栈](#技术栈)
- [环境要求](#环境要求)
- [快速开始](#快速开始)
- [可用脚本](#可用脚本)
- [项目结构](#项目结构)
- [数据说明与接口对接](#数据说明与接口对接)
- [设计规范](#设计规范)
- [二次开发指南](#二次开发指南)
- [构建与部署](#构建与部署)
- [路线图（Roadmap）](#路线图roadmap)
- [常见问题（FAQ）](#常见问题faq)
- [免责声明](#免责声明)

---

## 项目简介

`hongliRush`（"红利 Rush"）是一个**纯前端单页应用（SPA）**，用来生成与展示"大A红利金融投资日报"。它把投资者每天关心的红利资产信息集中到一个页面：

- 当日**红利指数行情**（点位、涨跌幅、股息率、PE，以及迷你走势图）；
- 文字版**市场综述**；
- 提炼后的**投资观点**与**风险提示**；
- 一份**推荐的大A红利基金清单**（含净值、近一年收益、股息率、规模、评级与推荐理由）。

> 当前版本使用内置的**演示数据**（见 [`src/data/report.ts`](src/data/report.ts)），数据结构清晰，便于后续替换为真实行情 / 基金接口返回值。页面所有内容**仅用于产品演示，不构成任何投资建议**。

## 功能特性

- 📈 **红利指数行情卡片**：中证红利、上证红利、中证红利低波动、红利低波100，含 SVG 迷你走势图。
- 🧾 **市场综述**：每日图文日报正文。
- 💡 **投资观点 + 风险提示**：双栏面板呈现核心观点与风控要点。
- ⭐ **推荐红利基金**：ETF / 指数增强 / LOF，含评级（1–5 星）与一句话推荐理由。
- 🎨 **现代化 UI**：遵循 A 股「红涨绿跌」配色 + 红利金色主题，卡片悬浮动效，响应式布局（移动端自动单列）。
- ⚡ **零后端依赖**：纯前端，一条 `npm run dev` 即可本地运行。

## 界面预览

| 首页（表头 / 市场综述 / 红利指数行情） | 推荐大A红利基金 |
| :---: | :---: |
| <img src="docs/images/screenshot-overview.webp" alt="首页概览" width="420" /> | <img src="docs/images/screenshot-funds.webp" alt="推荐基金" width="420" /> |

## 技术栈

| 分类 | 选型 |
| --- | --- |
| 构建工具 | [Vite](https://vite.dev/) 5 |
| 框架 | [React](https://react.dev/) 18 |
| 语言 | [TypeScript](https://www.typescriptlang.org/) 5 |
| 代码规范 | ESLint 9（Flat Config）+ `typescript-eslint` |
| 样式 | 原生 CSS（CSS 变量主题，无 UI 框架依赖） |
| 图表 | 手写 SVG 迷你走势图（无第三方图表库） |

## 环境要求

- **Node.js ≥ 18**（推荐 20 / 22 LTS）
- **npm ≥ 9**（或自行改用 pnpm / yarn）

检查版本：

```bash
node -v
npm -v
```

## 快速开始

```bash
# 1. 克隆仓库
git clone https://github.com/371684029/hongliRush.git
cd hongliRush

# 2. 安装依赖
npm install

# 3. 启动开发服务器（默认 http://localhost:5173/）
npm run dev
```

启动后,在浏览器打开终端输出的本地地址即可看到日报页面。

## 可用脚本

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动 Vite 开发服务器（热更新），默认端口 `5173` |
| `npm run build` | 类型检查 + 生产构建（`tsc -b && vite build`），输出到 `dist/` |
| `npm run preview` | 本地预览 `dist/` 生产构建产物 |
| `npm run lint` | 运行 ESLint 代码检查 |

> 开发服务器已在 [`vite.config.ts`](vite.config.ts) 中配置 `server.host: true`，便于通过局域网 / 容器对外地址访问。

## 项目结构

```
hongliRush/
├─ public/
│  └─ favicon.svg              # 站点图标（红利「红」字）
├─ docs/
│  └─ images/                  # README 截图资源
├─ src/
│  ├─ components/
│  │  ├─ IndexCard.tsx         # 红利指数卡片
│  │  ├─ FundCard.tsx          # 推荐基金卡片（含星级评分）
│  │  └─ Sparkline.tsx         # SVG 迷你走势图
│  ├─ data/
│  │  └─ report.ts             # 日报正文 / 指数 / 基金「演示数据」+ 类型定义
│  ├─ App.tsx                  # 页面骨架与各板块组装
│  ├─ main.tsx                 # React 入口
│  └─ index.css                # 全局样式与主题变量
├─ index.html                  # HTML 模板
├─ vite.config.ts              # Vite 配置
├─ eslint.config.js            # ESLint Flat Config
├─ tsconfig*.json              # TypeScript 配置
├─ AGENTS.md                   # 开发约定 / Cursor Cloud 说明
└─ package.json
```

## 数据说明与接口对接

所有展示数据集中在 [`src/data/report.ts`](src/data/report.ts)，并配有 TypeScript 类型定义。**当前为静态演示数据，非实时行情。** 接入真实数据时，只需让接口返回值满足以下结构（或在该文件里做一层适配），界面无需改动。

### `DailyReport`（日报正文）

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `date` | `string` | 日报日期 |
| `marketStatus` | `string` | 交易日 / 休市状态 |
| `headline` | `string` | 一句话摘要 |
| `overview` | `string[]` | 市场综述段落 |
| `viewpoints` | `string[]` | 投资观点列表 |
| `riskTips` | `string[]` | 风险提示列表 |

### `DividendIndex`（红利指数）

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `name` | `string` | 指数名称 |
| `code` | `string` | 指数代码（如 `000922`） |
| `point` | `number` | 最新点位 |
| `changePct` | `number` | 当日涨跌幅（%） |
| `dividendYield` | `number` | 股息率（%，近 12 个月） |
| `pe` | `number` | 市盈率 PE（TTM） |
| `trend` | `number[]` | 走势序列，用于绘制迷你走势图 |

### `DividendFund`（推荐基金）

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `name` | `string` | 基金名称 |
| `code` | `string` | 基金代码（如 `510880`） |
| `type` | `string` | 基金类型（ETF / 指数增强 / LOF 等） |
| `trackingIndex` | `string` | 跟踪 / 对标指数 |
| `nav` | `number` | 最新净值 |
| `changePct` | `number` | 当日涨跌幅（%） |
| `yearReturn` | `number` | 近一年收益率（%） |
| `dividendYield` | `number` | 股息率（%） |
| `scale` | `number` | 规模（亿元） |
| `rating` | `number` | 综合评级（1–5） |
| `reason` | `string` | 推荐理由 |

> **接入真实数据的建议**：行情可对接交易所 / 第三方行情源，基金数据可对接基金公司或数据服务商接口；为避免在前端暴露密钥，建议由后端代理转发后再返回给前端。

## 设计规范

- **涨跌配色（重要）**：遵循 A 股习惯——**红涨绿跌**。`--up` 为红色、`--down` 为绿色（见 [`src/index.css`](src/index.css) 顶部 CSS 变量）。请勿按欧美「绿涨红跌」习惯反过来。
- **主题色**：品牌红 `--brand`、红利金 `--gold`，整体偏暖色"红利"质感。
- **圆角 / 阴影 / 间距**：统一使用 `--radius`、`--shadow` 等 CSS 变量，新增组件请复用，保持视觉一致。
- **数字排版**：金额 / 点位使用 `font-variant-numeric: tabular-nums`，保证等宽对齐。

## 二次开发指南

- **改数据**：编辑 [`src/data/report.ts`](src/data/report.ts) 中的 `report`、`dividendIndices`、`recommendedFunds`。
- **加一个指数卡片**：往 `dividendIndices` 数组里加一项即可，`App.tsx` 会自动渲染。
- **加一只推荐基金**：往 `recommendedFunds` 数组里加一项，序号与星级会自动呈现。
- **调样式**：优先修改 [`src/index.css`](src/index.css) 顶部的 CSS 变量做全局换肤；局部样式按 BEM 风格类名维护。

## 构建与部署

```bash
npm run build      # 产物输出到 dist/
npm run preview    # 本地预览产物
```

`dist/` 是纯静态资源，可托管到任意静态服务器或平台（Nginx、Vercel、Netlify、GitHub Pages、对象存储 + CDN 等）。

## 路线图（Roadmap）

> 以下为规划中的能力，**当前版本尚未实现**：

- [ ] **接入真实行情 / 基金数据**（替换演示数据）。
- [ ] **每日红利日报邮件推送**：后端 + `nodemailer`（SMTP）或邮件 API（Resend / SendGrid），配合定时任务每日自动发送。
  - 计划通过环境变量配置发件信息，例如 `SMTP_USER`、`SMTP_PASS`（邮箱授权码，非登录密码）、`MAIL_TO`；敏感凭证不入库、不硬编码。
- [ ] **历史日报归档与检索**。
- [ ] **指数 / 基金详情页与更丰富的图表**。
- [ ] **暗色模式**。

## 常见问题（FAQ）

**Q：页面里的行情和基金数据是真实的吗？**
A：不是。当前是 `src/data/report.ts` 里的演示数据，仅用于界面展示与联调。

**Q：为什么涨是红色、跌是绿色?**
A：这是 A 股市场约定俗成的配色（红涨绿跌），与欧美相反，属于刻意设计。

**Q：可以直接用它发邮件吗？**
A：当前版本不能。纯前端无法直接发信，需要新增后端或邮件 API（见 [路线图](#路线图roadmap)）。

**Q：端口被占用怎么办?**
A：用 `npm run dev -- --port 5174` 指定其他端口，或修改 `vite.config.ts` 中的 `server.port`。

## 免责声明

本项目（含页面所有文字、行情、基金信息）**仅用于技术演示与学习交流，不构成任何投资建议或要约**。基金 / 股票投资有风险，历史业绩不代表未来表现，**市场有风险，投资需谨慎**。据此操作，风险自担。
