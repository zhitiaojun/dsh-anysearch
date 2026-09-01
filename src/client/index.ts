/**
 * @dsh-external/dsh-anysearch — client 设置面板（settings.section slot）。
 *
 * ⚠️ 契约（实测于 0.1.1-rc.2，源自官方 ui-settings-general 的注册方式）：
 * slots.register(options, ReactComponent) —— 组件是**第二个位置参数**的 React 函数组件，
 * options 里的 `component:` 字段会被忽略（脚手架/注入器的旧写法导致白屏）。
 *
 * 视觉：DSH 设计语言 —— 全部颜色/圆角/字阶/focus ring 取自官方 --dsw-alias-* 令牌
 * （与 ui-settings-plugin-inventory 同款），浅色/深色主题自适应，无硬编码色值。
 *
 * 构建：npm run build:client（tsdown，产物 lib/client.js，ModuleLoader.load 注册）。
 */
import { createElement as h, useEffect, useRef, useState } from 'react'
import type { SlotsService } from '@deepseek-ai/dsh-client-ui-slots'

const API = '/anysearch/api'

type ClientContext = {
  slots: SlotsService
}

export const inject = ['slots']

// ───────────────────────── 样式（官方 plugin-css 模式，幂等注入 head；令牌全部来自 --dsw-alias-*） ─────────────────────────
const CSS = `
.AnySearchSection_root{width:100%;max-width:760px;color:var(--dsw-alias-label-primary);display:flex;flex-direction:column;gap:14px}
.AnySearchSection_root h3{margin:0;font-size:13px;font-weight:600;line-height:20px}
.AnySearchSection_desc{margin:2px 0 0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
.AnySearchSection_card{display:flex;flex-direction:column;gap:12px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:10px;padding:14px}
.AnySearchSection_status{display:flex;align-items:center;gap:9px;min-height:28px}
.AnySearchSection_dot{flex:none;width:7px;height:7px;border-radius:999px;display:inline-block;background:var(--dsw-alias-label-tertiary)}
.AnySearchSection_dot[data-state="ok"]{background:var(--dsw-alias-state-success-primary)}
.AnySearchSection_dot[data-state="warn"]{background:var(--dsw-alias-state-business-primary)}
.AnySearchSection_dot[data-state="err"]{background:var(--dsw-alias-state-error-primary)}
.AnySearchSection_statusText{font-size:13px;line-height:20px;font-weight:600}
.AnySearchSection_statusSub{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;font-weight:400}
.AnySearchSection_spacer{flex:1}
.AnySearchSection_row{display:flex;gap:8px;flex-wrap:wrap}
.AnySearchSection_input{flex:1;min-width:220px;height:36px;padding:0 12px;font:inherit;font-size:13px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:8px;outline:none}
.AnySearchSection_input::placeholder{color:var(--dsw-alias-label-tertiary)}
.AnySearchSection_input:focus-visible{border-color:var(--dsw-alias-state-business-primary);box-shadow:0 0 0 2px color-mix(in srgb, var(--dsw-alias-state-business-primary) 18%, transparent)}
.AnySearchSection_btn{font:inherit;font-size:13px;line-height:20px;cursor:pointer;border-radius:6px;padding:7px 14px;border:1px solid var(--dsw-alias-border-l2);background:0 0;color:var(--dsw-alias-label-primary);white-space:nowrap}
.AnySearchSection_btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
.AnySearchSection_btn:disabled{opacity:.5;cursor:not-allowed}
.AnySearchSection_btn[data-kind="primary"]{border-color:color-mix(in srgb, var(--dsw-alias-state-business-primary) 55%, transparent);color:var(--dsw-alias-state-business-primary)}
.AnySearchSection_btn[data-kind="danger"]{color:var(--dsw-alias-state-error-primary);border-color:color-mix(in srgb, var(--dsw-alias-state-error-primary) 40%, transparent)}
.AnySearchSection_msg{margin:0;padding:8px 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-1);font-size:12px;line-height:18px;color:var(--dsw-alias-label-primary);white-space:pre-wrap;word-break:break-word}
.AnySearchSection_msg[data-kind="ok"]{color:var(--dsw-alias-state-success-primary);border-color:color-mix(in srgb, var(--dsw-alias-state-success-primary) 35%, transparent)}
.AnySearchSection_msg[data-kind="err"]{color:var(--dsw-alias-state-error-primary);border-color:color-mix(in srgb, var(--dsw-alias-state-error-primary) 35%, transparent)}
.AnySearchSection_hint{margin:0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
.AnySearchSection_hint a{color:var(--dsw-alias-state-business-primary)}
`
const CSS_TAG_ID = '@dsh-external/dsh-anysearch/SettingsSection.module.css'

function injectStyles(): void {
  if (typeof document === 'undefined') return
  if (document.querySelector('style[data-plugin-css="' + CSS_TAG_ID + '"]') !== null) return
  const tag = document.createElement('style')
  tag.dataset.plugin = '@dsh-external/dsh-anysearch'
  tag.dataset.pluginCss = CSS_TAG_ID
  tag.textContent = CSS
  document.head.appendChild(tag)
}

// ───────────────────────── host API ─────────────────────────
type ConfigResp = {
  ok?: boolean
  source?: string
  hasKey?: boolean
  keyMasked?: string
  error?: string
}
type TestResp = ConfigResp & { results?: number; ms?: number }

async function fetchJson(path: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(API + path, { headers: { 'content-type': 'application/json' }, ...init })
  return res.json()
}

const SOURCE_LABEL: Record<string, string> = {
  settings: '设置面板保存的 key',
  '.env': '来自插件目录 .env',
  env: '来自环境变量 ANYSEARCH_API_KEY',
}

// ───────────────────────── 面板组件 ─────────────────────────
type Msg = { kind: 'ok' | 'err' | 'info'; text: string } | null

function AnySearchSettingsSection(): ReturnType<typeof h> {
  const [status, setStatus] = useState<{ loading: boolean; source: string; masked: string; error: string }>({
    loading: true, source: '', masked: '', error: '',
  })
  const [keyDraft, setKeyDraft] = useState('')
  const [busy, setBusy] = useState<'' | 'save' | 'clear' | 'test'>('')
  const [msg, setMsg] = useState<Msg>(null)
  const aliveRef = useRef(true)
  useEffect(() => {
    aliveRef.current = true
    return () => { aliveRef.current = false }
  }, [])

  const refresh = (): void => {
    fetchJson('/config').then((d) => {
      if (!aliveRef.current) return
      const c = d as ConfigResp
      if (!c?.ok) { setStatus({ loading: false, source: '', masked: '', error: c?.error ?? '未知响应' }); return }
      setStatus({ loading: false, source: c.source ?? 'anonymous', masked: c.keyMasked ?? '', error: '' })
    }).catch((err) => {
      if (aliveRef.current) setStatus({ loading: false, source: '', masked: '', error: String(err) })
    })
  }

  useEffect(() => {
    injectStyles()
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const save = (): void => {
    const key = keyDraft.trim()
    if (!key) { setMsg({ kind: 'err', text: '请先粘贴 key（as_sk_…）；要清除已保存的 key 请点「清除」。' }); return }
    setBusy('save')
    setMsg(null)
    fetchJson('/config', { method: 'POST', body: JSON.stringify({ apiKey: key }) }).then((d) => {
      const r = d as ConfigResp
      if (r?.ok) { setMsg({ kind: 'ok', text: '已保存。工具调用将立即使用新 key（无需重启）。' }); setKeyDraft('') }
      else setMsg({ kind: 'err', text: r?.error ?? JSON.stringify(r) })
      refresh()
    }).catch((err) => setMsg({ kind: 'err', text: '保存失败: ' + String(err) })).finally(() => {
      if (aliveRef.current) setBusy('')
    })
  }

  const clear = (): void => {
    setBusy('clear')
    setMsg(null)
    fetchJson('/config', { method: 'POST', body: JSON.stringify({ apiKey: '' }) }).then((d) => {
      const r = d as ConfigResp
      if (r?.ok) setMsg({ kind: 'info', text: '已清除保存的 key。当前生效来源：' + String(r.source) })
      else setMsg({ kind: 'err', text: r?.error ?? JSON.stringify(r) })
      refresh()
    }).catch((err) => setMsg({ kind: 'err', text: '清除失败: ' + String(err) })).finally(() => {
      if (aliveRef.current) setBusy('')
    })
  }

  const test = (): void => {
    setBusy('test')
    setMsg({ kind: 'info', text: '正在发起一次真实搜索（query=hello world, max_results=1）…' })
    fetchJson('/test', { method: 'POST', body: '{}' }).then((d) => {
      const r = d as TestResp
      if (r?.ok) setMsg({ kind: 'ok', text: `✓ 连接正常（来源 ${r.source}，返回 ${r.results} 条，${r.ms}ms）` })
      else setMsg({ kind: 'err', text: `✗ 测试失败：${r?.error}（${r?.ms}ms）` })
    }).catch((err) => setMsg({ kind: 'err', text: '测试请求失败: ' + String(err) })).finally(() => {
      if (aliveRef.current) setBusy('')
    })
  }

  // 状态行映射
  let dotState = ''
  let title = '检测中…'
  let sub = ''
  if (status.error) {
    dotState = 'err'; title = '无法读取插件状态'; sub = status.error
  } else if (status.loading) {
    // 保持默认检测态
  } else if (status.source === 'settings' || status.source === '.env' || status.source === 'env') {
    dotState = 'ok'
    title = `已配置（${status.masked}）`
    sub = SOURCE_LABEL[status.source] ?? status.source
  } else {
    dotState = 'warn'
    title = '匿名模式'
    sub = '未配置 key —— 可用，但速率/配额受限'
  }

  return h('div', { className: 'AnySearchSection_root' },
    h('div', { style: { display: 'flex', flexDirection: 'column' } },
      h('h3', null, 'AnySearch 实时搜索'),
      h('p', { className: 'AnySearchSection_desc' },
        'anysearch_search（通用/垂直搜索）· anysearch_batch_search（1-5 条并行）· anysearch_sub_domains（垂直域目录）· anysearch_extract（网页转 Markdown）。优先于内置 web_search。'),
    ),
    h('div', { className: 'AnySearchSection_card' },
      h('div', { className: 'AnySearchSection_status' },
        h('span', { className: 'AnySearchSection_dot', 'data-state': dotState, 'aria-hidden': 'true' }),
        h('div', { style: { minWidth: 0 } },
          h('div', { className: 'AnySearchSection_statusText' }, title),
          sub ? h('div', { className: 'AnySearchSection_statusSub' }, sub) : null,
        ),
        h('div', { className: 'AnySearchSection_spacer' }),
        h('button', {
          type: 'button', className: 'AnySearchSection_btn', onClick: test,
          disabled: busy !== '' || !!status.error, 'aria-label': '测试 AnySearch 连接',
        }, busy === 'test' ? '测试中…' : '测试连接'),
      ),
      h('div', { className: 'AnySearchSection_row' },
        h('input', {
          type: 'password', className: 'AnySearchSection_input', value: keyDraft,
          placeholder: 'as_sk_xxxxxxxxxxxxxxxx（可选）', autoComplete: 'off', spellCheck: false,
          'aria-label': 'AnySearch API key',
          onChange: (e: { currentTarget: { value: string } }) => setKeyDraft(e.currentTarget.value),
          onKeyDown: (e: { key: string }) => { if (e.key === 'Enter') save() },
        }),
        h('button', { type: 'button', className: 'AnySearchSection_btn', 'data-kind': 'primary', onClick: save, disabled: busy !== '' },
          busy === 'save' ? '保存中…' : '保存'),
        h('button', { type: 'button', className: 'AnySearchSection_btn', 'data-kind': 'danger', onClick: clear, disabled: busy !== '' },
          busy === 'clear' ? '清除中…' : '清除'),
      ),
      msg ? h('p', { className: 'AnySearchSection_msg', role: msg.kind === 'err' ? 'alert' : 'status', 'data-kind': msg.kind }, msg.text) : null,
    ),
    h('p', { className: 'AnySearchSection_hint' },
      '没有 key？在 ',
      h('a', { href: 'https://anysearch.com/console/api-keys', target: '_blank', rel: 'noreferrer' }, 'anysearch.com/console/api-keys'),
      ' 免费创建（匿名也可用，限额较低）。API key 优先级：此处保存 > 插件目录 .env > 环境变量 > 匿名。'),
  )
}

export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'anysearch',
    order: 51,
    label: () => 'AnySearch',
  }, AnySearchSettingsSection)), 'anysearch: settings panel')
}
