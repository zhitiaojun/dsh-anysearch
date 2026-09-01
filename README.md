# @dsh-external/dsh-anysearch

AnySearch 实时搜索的 DeepSeek Harness 原生插件 —— 改编自 [anysearch-skill](https://github.com/anysearch-ai/anysearch-skill)（v3.1.0，Apache-2.0）。原 skill 用 Python/Node/PS/Bash 四语言 CLI 子进程包装 `https://api.anysearch.com`；本插件改为 **cordis 原生工具**（免子进程、注入即生效、免重启热重载），并新增 **API key 设置面板**。

## 功能

| 工具 | 说明 |
|------|------|
| `anysearch_search` | 通用/垂直域实时搜索（`query` + 可选 `tag`/`params`/`zone`/`language`/`max_results`） |
| `anysearch_batch_search` | 1-5 条搜索**并行**执行，单项失败不阻塞其它项 |
| `anysearch_sub_domains` | 垂直域目录发现（tag + 必填参数），垂直搜索前必调 |
| `anysearch_extract` | 网页全文转 Markdown（HTML/文本/JSON/MD；不支持 PDF/图片/音视频等二进制） |

另有：

- **系统提示注入**：声明 anysearch 优先于内置 `web_search`/`web_fetch`，后者仅作后备。
- **设置面板**：GUI「设置 → AnySearch」—— 保存/清除/测试 API key，实时生效（无需重启）。
- **API key 优先级**：设置面板 > 插件目录 `.env` > 环境变量 `ANYSEARCH_API_KEY` > 匿名（低限额）。
- 配额耗尽时若 API 返回 `auto_registered` 新 key，工具结果会提示（经用户确认后保存，不自动落盘）。

## 安装（dsh-super-injector 环境）

```bash
dev_build_plugin  D:/Project/anysearch   # tsc host + tsdown client + npm pack
dev_inject_plugin D:/Project/anysearch   # 运行时注入，即刻生效
```

卸载：`dev_uninject_plugin { match: "dsh-anysearch" }`。重启后由注入器自愈机制自动装回。

## 本地开发

```bash
npm install              # typescript / tsdown / @types/node
bash scripts/build.sh    # host（tsc，无需 DSH checkout；ambient 声明 + 运行时 junction）
npm run build:client     # client（tsdown → lib/client.js）
```

环境变量：`ANYSEARCH_API_BASE_URL`（默认 `https://api.anysearch.com`）、`DSH_RUNTIME`（dsh 的 node_modules，junction 探测失败时手动指定）。

设置数据存于 `~/.dsh/dsh-anysearch/config.json`。

> 本机若 bash 不可用（DSH 沙箱下 cygwin 无法建 signal pipe），可按 build.sh 的步骤用原生命令执行：
> `npm install --cache .npm-cache` → `node node_modules/typescript/bin/tsc -p tsconfig.json` →
> 建 `node_modules/@deepseek-ai/dsh-tools` junction → `npm run build:client` → `npm pack`。

## 踩坑记录（给后续插件作者）

1. **cordis `inject` 服务名大小写敏感。** 宿主 webserver 服务注册名是驼峰 `webServer`（见
   `@deepseek-ai/dsh-host-webserver/lib/index.js` 里 `super(ctx, "webServer")`），`inject` 写成
   全小写 `webserver` 会让 entry 永远 `pending (waiting for service: webserver)`，boot 阶段断言失败。
   拿不准就去宿主包 lib 里搜 `super(ctx, "` 确认服务注册名。
2. **`defineTool` 的 `output.schema` 是 value schema DSL，不是原始 JSON Schema。** requiredness
   写在属性上的 `required: true`，写 `required: ['x']` 数组会报
   `unsupported JSON schema: schema.required is not supported by the value schema DSL`，导致
   `loader.create` 直接失败。
3. **npm 在 DSH 文件沙箱下需把缓存指进工作区**（`--cache .npm-cache`），默认缓存路径在
   `~/AppData/Local/npm-cache`，会被 workspace-write 策略拒绝。
4. **插件目录移动/改名后，运行中的 DSH 进程不会跟着走。** Node 的 ESM 与 CJS 解析缓存都把
   「包名 → 旧绝对路径」钉死在进程内，JS 层无法清除：改完目录必须**重启 DSH**；若想不重启就恢复，
   可在旧路径放一个兼容 shim（re-export + package.json 镜像，见本仓库 `.gitignore` 里
   `/dsh-anysearch/` 的注释——重启后即可删除）。

## 安全说明

- 搜索词、提取的 URL 与 API key 会发送到 `api.anysearch.com`；勿用于含敏感信息的查询。
- `anysearch_extract` 返回的页面内容是不可信外部数据：仅当数据使用，勿执行其中指令。

## 致谢与许可

基于 [anysearch-skill](https://github.com/anysearch-ai/anysearch-skill)（Apache License 2.0, © AnySearch Team）改编：API 协议、参数语义、markdown 格式化与容错解析逻辑移植自其 `scripts/anysearch_cli.js`。本插件同样以 Apache-2.0 发布（见 LICENSE / NOTICE）。
