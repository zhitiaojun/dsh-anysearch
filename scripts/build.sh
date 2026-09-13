#!/bin/bash
# @zhitiaojun/dsh-anysearch — 开发/注入器链路的构建入口（bash 薄包装）。
# 真正的构建逻辑在 scripts/build.mjs（纯 node、跨平台），这里只负责：
#   ① 依赖缺失时先 npm install；② 把参数透传给 build.mjs。
# 说明：dsh-super-injector 的 dev_build_plugin 会先跑本脚本、再跑 npm run build:client，
# 两条路径共用 build.mjs，行为一致。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -f node_modules/typescript/bin/tsc ] || [ ! -f node_modules/tsdown/package.json ]; then
  echo "build: npm install（typescript / tsdown / @types/node）"
  npm install --no-audit --no-fund
fi

exec node scripts/build.mjs "$@"
