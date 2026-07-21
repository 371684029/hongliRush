# hongliRush · 大A红利金融投资日报

前端单页应用（Vite + React 18 + TypeScript），展示大A红利主题的每日金融投资日报及推荐红利基金。

## 常用命令

- 开发：`npm run dev`（Vite 开发服务器，默认 `http://localhost:5173/`）
- 构建：`npm run build`（`tsc -b && vite build`）
- 校验：`npm run lint`（ESLint flat config）
- 预览构建产物：`npm run preview`

## 目录结构

- `src/data/report.ts`：日报正文、红利指数、推荐基金的数据源（**当前为演示数据，非实时行情**）。接入真实数据时替换此文件的导出即可，界面无需改动。
- `src/components/`：`IndexCard`（指数卡片）、`FundCard`（基金卡片）、`Sparkline`（SVG 迷你走势图）。
- `src/App.tsx`：页面骨架与各板块组装。
- `src/index.css`：全局样式与主题变量。

## 维护者与署名约定（永久）

- 本项目所有提交署名、作者信息统一使用：**`wll <371684029@qq.com>`**。
- Git 提交必须以该身份进行：`user.name = wll`、`user.email = 371684029@qq.com`（已配置；若在新环境请重新设置 local 与 global）。
- `package.json` 的 `author` 字段同样为 `wll <371684029@qq.com>`，新增需要署名的文档/配置时请沿用该署名，不要使用其它作者名。

## 架构（两部分）

- **量化研判引擎** `src/engine/`（Node + TypeScript，用 `tsx` 直接运行）：采集 Yahoo 真实行情 → 量化打分/双打分/反驳/情景/门禁/可信度 → SQLite 回测校准 → 输出 `docs/*.md` 与 `public/hongli-latest.json`。命令见 README「命令一览」。
- **Web 仪表盘** `src/`（React + Vite）：消费 `public/hongli-latest.json` 渲染日报。

## Cursor Cloud specific instructions

- **Web 依赖引擎产物**：前端读取 `public/hongli-latest.json`。若该文件缺失，页面会显示「数据未就绪」并提示先运行 `npm run analysis`。仓库已提交一份种子 JSON，克隆后 `npm run dev` 即可直接看到；要刷新为最新真实数据则先 `npm run analysis`。
- **真实行情依赖外网**：引擎从 `query1/query2.finance.yahoo.com` 拉取行情，需要出网。Yahoo 对红利**指数**（如 `000922.SS`）只给 1d/5d 行情，长历史/技术指标/回测一律用其**跟踪 ETF**（如 `515080.SS`）；改数据源时注意保持这一映射（见 `src/engine/symbols.ts`）。
- **回测/命中率样本**：`analysis` 只写当日一条报告；要让 `calibrate` 和「历史预测对错」立刻有样本，先跑 `npm run engine backfill`（用真实 ETF 历史逐日重算，无前视偏差），再 `npm run analysis`。
- **SQLite 本地库** `data/hongli.db` 由引擎自动创建，已在 `.gitignore` 忽略；删除后下次运行会重建（历史报告会丢失，需重新 backfill）。`better-sqlite3` 为原生模块，靠 `npm install` 编译，无需额外系统依赖。
- **引擎类型检查**独立于前端：用 `npm run typecheck:engine`（`tsconfig.engine.json`）；前端 `npm run build` 已排除 `src/engine`，ESLint 对引擎用 node 全局。
- 配色遵循 A 股「红涨绿跌」：`--up` 红、`--down` 绿（见 `src/index.css`），勿按欧美习惯反置。
- Vite 已配置 `server.host: true`，可经 VM 对外地址访问，开发端口 `5173`。
- 页面/报告仅为投资研究演示，不构成投资建议。
