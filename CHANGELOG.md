# Changelog

## 0.1.1 — 2026-09-13

- 新增跨平台构建脚本 `scripts/build.mjs`（纯 node，零 bash 依赖）：host 走 tsc、client 走 tsdown
- 新增 `prepare` 生命周期脚本：作为 git 依赖（插件市场 / `pnpm add github:...`）安装时自动构建，仓库无需提交 `lib/` 产物
- `scripts/build.sh` 改为 build.mjs 的薄包装（开发/注入器链路与安装链路共用同一实现）
- CI 改用 `npm run build`

## 0.1.0 — 2026-09-01

首个版本。

- 4 个 DSH 原生工具：`anysearch_search`（通用/垂直域搜索）、`anysearch_batch_search`（1-5 条并行）、`anysearch_sub_domains`（垂直域目录发现）、`anysearch_extract`（网页转 Markdown）
- API key 设置面板（`settings.section` slot，DSW 设计令牌，浅色/深色主题自适应）：保存 / 清除 / 测试连接，即时生效
- 系统提示注入：声明 anysearch 优先于内置 `web_search` / `web_fetch`
- key 优先级：设置面板 > 插件目录 `.env` > 环境变量 `ANYSEARCH_API_KEY` > 匿名
- 配额耗尽且 API 返回 `auto_registered` 新 key 时在工具结果中提示（经用户确认后保存）
- 兼容原 skill 的 `X-Anysearch-Client` 识别头与 `ANYSEARCH_API_BASE_URL` 覆盖
