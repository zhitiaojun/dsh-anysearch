# Changelog

## 0.1.0 — 2026-09-01

首个版本。

- 4 个 DSH 原生工具：`anysearch_search`（通用/垂直域搜索）、`anysearch_batch_search`（1-5 条并行）、`anysearch_sub_domains`（垂直域目录发现）、`anysearch_extract`（网页转 Markdown）
- API key 设置面板（`settings.section` slot，DSW 设计令牌，浅色/深色主题自适应）：保存 / 清除 / 测试连接，即时生效
- 系统提示注入：声明 anysearch 优先于内置 `web_search` / `web_fetch`
- key 优先级：设置面板 > 插件目录 `.env` > 环境变量 `ANYSEARCH_API_KEY` > 匿名
- 配额耗尽且 API 返回 `auto_registered` 新 key 时在工具结果中提示（经用户确认后保存）
- 兼容原 skill 的 `X-Anysearch-Client` 识别头与 `ANYSEARCH_API_BASE_URL` 覆盖
