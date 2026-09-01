#!/bin/bash
# @dsh-external/dsh-anysearch — host 构建（src/*.ts → lib/index.js）。
# 无需 DSH 源码 checkout：编译期用 src/vendor.d.ts ambient 声明；
# 运行期 @deepseek-ai/dsh-tools 通过 junction 指向本机 dsh 运行时（版本与 host 一致）。
# client 构建走 npm run build:client（tsdown → lib/client.js），由 dev_build_plugin 串行调用。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# ── 1) 本地构建依赖：typescript / @types/node（tsdown 由 build:client 用） ──
if [ ! -f node_modules/typescript/bin/tsc ]; then
  echo "build: npm install（typescript/tsdown/@types/node）"
  npm install --no-audit --no-fund
fi
if [ ! -f node_modules/typescript/bin/tsc ]; then
  echo "build: typescript 不可用（npm install 失败？）" >&2
  exit 1
fi

# ── 2) 编译 host（此时 node_modules 里没有 @deepseek-ai/dsh-tools，走 ambient 声明） ──
echo "=== tsc: src → lib（host） ==="
node node_modules/typescript/bin/tsc -p tsconfig.json

# ── 3) 运行时依赖 junction：@deepseek-ai/dsh-tools → 本机 dsh 运行时 ──
TOOLS_LINK="node_modules/@deepseek-ai/dsh-tools"
if [ ! -d "$TOOLS_LINK" ]; then
  RUNTIME="${DSH_RUNTIME:-}"
  if [ -z "$RUNTIME" ]; then
    for candidate in "$HOME/.dsh/runtime/node_modules" "$HOME/AppData/Local/npm-cache/_npx"/*/node_modules; do
      if [ -d "$candidate/@deepseek-ai/dsh-tools" ]; then
        RUNTIME="$candidate"
        break
      fi
    done
  fi
  if [ -n "$RUNTIME" ] && [ -d "$RUNTIME/@deepseek-ai/dsh-tools" ]; then
    mkdir -p node_modules/@deepseek-ai
    node -e "
      const fs = require('fs');
      const path = require('path');
      const link = path.resolve('node_modules/@deepseek-ai/dsh-tools');
      const target = path.resolve(process.argv[1]);
      fs.rmSync(link, { recursive: true, force: true });
      fs.symlinkSync(target, link, process.platform === 'win32' ? 'junction' : 'dir');
      console.log('build: junction node_modules/@deepseek-ai/dsh-tools -> ' + target);
    " "$RUNTIME/@deepseek-ai/dsh-tools"
  else
    echo "build: WARN 未找到运行时 @deepseek-ai/dsh-tools；如注入失败，设 DSH_RUNTIME=<dsh 的 node_modules> 后重跑" >&2
  fi
fi

echo "=== host build complete（client: npm run build:client） ==="
