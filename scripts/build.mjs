#!/usr/bin/env node
/**
 * @zhitiaojun/dsh-anysearch — 跨平台构建（host + client），零 bash 依赖。
 *
 * 用法：
 *   node scripts/build.mjs                # host（tsc）+ client（tsdown）
 *   node scripts/build.mjs --host-only
 *   node scripts/build.mjs --client-only
 *
 * 该脚本是 npm `prepare` 的实现：从 GitHub / 市场以 git 依赖安装时会自动执行，
 * 因此「仓库只含源码」也能装完即用（Windows / Linux / macOS 一致）。
 * 本地开发目录（不在任何 node_modules 内）额外做一次尽力而为的运行时链接，
 * 让插件在 DSH 运行时之外也能解析到 @deepseek-ai/dsh-tools。
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, symlinkSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const flags = new Set(process.argv.slice(2))
const HOST_ONLY = flags.has('--host-only')
const CLIENT_ONLY = flags.has('--client-only')

/** 运行 node 子进程；失败即中止构建。stdio 透传，便于 CI/终端看到原始输出。 */
function run(label, nodeArgs) {
  process.stdout.write(`\n=== ${label} ===\n`)
  const result = spawnSync(process.execPath, nodeArgs, { cwd: ROOT, stdio: 'inherit' })
  if (result.error) {
    console.error(`build: ${label} 启动失败（${result.error.message}）`)
    process.exit(1)
  }
  if (result.status !== 0) {
    console.error(`build: ${label} 失败（exit ${result.status}）`)
    process.exit(result.status ?? 1)
  }
}

/** 解析某个依赖包内的可执行文件；缺失时给出可操作的提示。 */
function requireBin(pkg, rel) {
  const file = join(ROOT, 'node_modules', pkg, rel)
  if (!existsSync(file)) {
    console.error(`build: 缺少构建依赖 ${pkg}（先在项目目录执行 npm install）`)
    process.exit(1)
  }
  return file
}

/** tsdown 的 bin 入口（读它自己的 package.json，避免硬编码 dist 路径）。 */
function tsdownBin() {
  const pkgFile = join(ROOT, 'node_modules', 'tsdown', 'package.json')
  if (!existsSync(pkgFile)) {
    console.error('build: 缺少构建依赖 tsdown（先在项目目录执行 npm install）')
    process.exit(1)
  }
  const pkg = JSON.parse(readFileSync(pkgFile, 'utf8'))
  const bin = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin?.tsdown
  if (typeof bin !== 'string') {
    console.error('build: 无法确定 tsdown 的 bin 入口')
    process.exit(1)
  }
  return join(dirname(pkgFile), bin)
}

/**
 * 本地开发目录专用：把 @deepseek-ai/dsh-tools 链到本机 DSH 运行时的 node_modules。
 * 仅在「插件目录不在任何 node_modules 内」时执行（即本地开发目录，而非被安装的依赖）；
 * 被安装进 profile 时，上层 node_modules 已能解析，无需链接。尽力而为，失败只告警。
 */
function linkRuntimeTools() {
  if (/[\\/]node_modules[\\/]/.test(ROOT)) return
  const link = join(ROOT, 'node_modules', '@deepseek-ai', 'dsh-tools')
  if (existsSync(link)) return

  const candidates = []
  if (process.env.DSH_RUNTIME) candidates.push(process.env.DSH_RUNTIME)
  candidates.push(join(process.env.DSH_HOME || join(homedir(), '.dsh'), 'runtime', 'node_modules'))
  const npxCache = join(process.env.LOCALAPPDATA || join(homedir(), '.npm'), 'npm-cache', '_npx')
  if (existsSync(npxCache)) {
    for (const entry of readdirSync(npxCache)) candidates.push(join(npxCache, entry, 'node_modules'))
  }

  const target = candidates
    .map((base) => join(base, '@deepseek-ai', 'dsh-tools'))
    .find((dir) => existsSync(dir))
  if (!target) {
    console.warn('build: 未找到本机 DSH 运行时的 @deepseek-ai/dsh-tools；'
      + '如需在开发目录直接注入运行，请设 DSH_RUNTIME=<dsh 的 node_modules> 后重跑')
    return
  }
  try {
    mkdirSync(dirname(link), { recursive: true })
    rmSync(link, { recursive: true, force: true })
    symlinkSync(resolve(target), link, process.platform === 'win32' ? 'junction' : 'dir')
    console.log(`build: 运行时链接 node_modules/@deepseek-ai/dsh-tools → ${target}`)
  } catch (error) {
    console.warn(`build: 运行时链接失败（可忽略，安装进 profile 时由上层解析）：${String(error)}`)
  }
}

if (!CLIENT_ONLY) {
  run('tsc: src → lib（host）', [requireBin('typescript', join('bin', 'tsc')), '-p', 'tsconfig.json'])
  await linkRuntimeTools()
}
if (!HOST_ONLY) {
  run('tsdown: src/client → lib/client.js（client）', [tsdownBin()])
}

console.log('\n=== build 完成：lib/index.js（host）+ lib/client.js（client） ===')
