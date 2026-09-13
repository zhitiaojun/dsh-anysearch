# Changelog

## 0.2.0 — 2026-09-13

**改名**：包名 `@dsh-external/dsh-anysearch` → **`@zhitiaojun/dsh-anysearch`**（工具名 `anysearch_*` 不变，路由 `/anysearch/api` 与设置面板数据目录 `~/.dsh/dsh-anysearch/` 不变，已保存的 API key 无需迁移）。

**Bug 修复**（与官方 `@anysearch/anysearch-dsh` 对比实测后发现）：

- `anysearch_extract` 增加输出上限（默认 12,000 字符，`ANYSEARCH_EXTRACT_MAX_CHARS` 可调）并显式标注截断；原实现无上限，抓大页面一次吐出 50KB+ 触发 spill
- `anysearch_extract` 补齐空值兜底：URL / 正文缺失时给出明确占位与「可能是空白页、二进制或不支持格式」提示，不再返回空正文
- 批量搜索改为**逐项归一化**：单个条目参数非法只让该条失败，不再牵连整批（与「单项失败不阻塞其它项」的承诺一致）
- 设置 API 请求体超限时立即停止累积数据并以 413 响应（原实现只 reject 不停止读取，会反复 reject 并继续吃数据）
- `params` 传入数字 / 布尔 / 数组等非法类型时显式报错并给出示例（原实现静默转成 `{"42":""}`，最终报「缺 required 参数」，把调用方指向错误方向）
- `auto_registered` 新 key 解析兼容 4 种响应形状（字符串 / `{key}` / `{api_key}` / `{api_key:{key}}`），提示中给出完整 key 供保存

**优化**：

- `anysearch_sub_domains` 增加进程内 TTL 缓存（10 分钟），同一组域的重复调用直接命中
- API key 解析增加调用级缓存（30 秒，写盘即失效）：batch 并发不再每个请求同步读一次磁盘
- `/test` 失败改返回 HTTP 502（原先用 200 掩盖错误）

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
