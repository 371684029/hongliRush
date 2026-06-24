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

## Cursor Cloud specific instructions

- 这是纯前端应用，无后端 / 数据库 / 外部服务依赖，单个 `npm run dev` 即可端到端运行与验证。
- 配色遵循 A 股「红涨绿跌」习惯：`--up` 为红色、`--down` 为绿色（见 `src/index.css`），改动涨跌色时不要按欧美习惯反过来。
- Vite 已配置 `server.host: true`，因此可通过 VM 的对外地址访问；开发端口为 `5173`。
- 所有行情/基金数值均来自 `src/data/report.ts` 的静态演示数据，不会自动更新；页面内容仅为演示，不构成投资建议。
