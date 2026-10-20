#!/usr/bin/env node
/**
 * 产物审计（plan-v2 B6「坑 #1 的机器化」）
 *
 * 对每个 app 的 dist/ 断言：
 * 1. 顶层 `dist/*.js` 中 `createPinia(` 命中数 = 0 —— pinia 实例只可能存在于
 *    app-core，且被 federation shared 语义排除在顶层产物外；
 * 2. 顶层 `dist/*.js` 中 `createRouter(` 命中数 = 0（同理，路由工厂只在 app-core）；
 * 3. `mf-manifest.json` 存在且其 shared 名单 ⊇ `federation.ts` 的 mfSharedConfig
 *    清单（归一化：`vue/` → `vue`、去版本后缀；防止某端漏配 shared）。
 *
 * 附加（非断言，INFO）：扫描 `dist/assets/*.js` 中的同串分布，供人工核对
 * —— shared 依赖的实现块允许作为 provider 侧独立 chunk 存在于 assets/。
 *
 * 用法：node scripts/audit-dist.mjs（CI 在 build 后运行）
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const APPS = ['app-main', 'app-system']
const FORBIDDEN = ['createPinia(', 'createRouter(']

/** 归一化 shared 名：去尾部 '/'、去 '@<digit>' 版本后缀 */
function normalizeName(name) {
  return name
    .replace(/@(?=\d)/, '')
    .replace(/\/+$/, '')
}

/** 从 federation.ts 源码提取 mfSharedConfig 顶层键（源码级提取，单一事实来源） */
function readSharedConfigKeys() {
  const file = path.join(repoRoot, 'packages/app-config/src/vite/federation.ts')
  const source = fs.readFileSync(file, 'utf-8')
  const marker = 'export const mfSharedConfig = {'
  const start = source.indexOf(marker)
  if (start === -1) throw new Error(`[audit] ${file} 中找不到 mfSharedConfig`)
  const body = source.slice(start + marker.length)
  const keys = new Set()
  for (const line of body.split(/\r?\n/)) {
    if (/^\}/.test(line)) break // 顶格 '}' = 对象结束
    const matched = line.match(/^\s{2}'?([^'\s:]+)'?\s*:\s*\{/)
    if (matched) keys.add(normalizeName(matched[1]))
  }
  if (keys.size === 0) throw new Error('[audit] mfSharedConfig 解析结果为空')
  return keys
}

/** 从 mf-manifest.json 提取 shared 名单（数组 [name/id] 或对象键两种形态兼容） */
function readManifestSharedNames(manifest) {
  const names = new Set()
  const shared = manifest?.shared
  if (Array.isArray(shared)) {
    for (const entry of shared) {
      const name = typeof entry === 'string' ? entry : (entry?.name ?? entry?.id ?? '')
      if (name) names.add(normalizeName(String(name)))
    }
  } else if (shared && typeof shared === 'object') {
    for (const key of Object.keys(shared)) names.add(normalizeName(key))
  }
  return names
}

function countOccurrences(content, needle) {
  let count = 0
  let index = content.indexOf(needle)
  while (index !== -1) {
    count++
    index = content.indexOf(needle, index + needle.length)
  }
  return count
}

const sharedConfigKeys = readSharedConfigKeys()
const failures = []

console.log(`[audit] shared 清单（federation.ts，归一化后 ${sharedConfigKeys.size} 项）：`)
console.log(`        ${[...sharedConfigKeys].join(', ')}\n`)

for (const app of APPS) {
  const distDir = path.join(repoRoot, 'apps', app, 'dist')
  console.log(`── ${app} (${path.relative(repoRoot, distDir)}) ──`)

  if (!fs.existsSync(distDir)) {
    failures.push(`${app}: dist/ 不存在（先执行 pnpm build）`)
    console.log('  ✗ dist/ 不存在\n')
    continue
  }

  // 断言 1/2：顶层 *.js 不得出现内核工厂
  const topJs = fs.readdirSync(distDir).filter((f) => f.endsWith('.js'))
  let topHits = 0
  for (const file of topJs) {
    const content = fs.readFileSync(path.join(distDir, file), 'utf-8')
    const found = FORBIDDEN.map((needle) => `${needle} ×${countOccurrences(content, needle)}`)
    const total = FORBIDDEN.reduce((sum, needle) => sum + countOccurrences(content, needle), 0)
    topHits += total
    console.log(`  ${total === 0 ? '✓' : '✗'} dist/${file}：${found.join('，')}`)
  }
  if (topJs.length === 0) console.log('  (顶层无 .js 文件)')
  if (topHits > 0) failures.push(`${app}: 顶层产物命中内核工厂 ${topHits} 次`)

  // 断言 3：mf-manifest.json shared ⊇ federation.ts 清单
  const manifestPath = path.join(distDir, 'mf-manifest.json')
  if (!fs.existsSync(manifestPath)) {
    failures.push(`${app}: mf-manifest.json 缺失`)
    console.log('  ✗ mf-manifest.json 缺失')
  } else {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
    const manifestNames = readManifestSharedNames(manifest)
    const missing = [...sharedConfigKeys].filter((key) => !manifestNames.has(key))
    if (missing.length === 0) {
      console.log(
        `  ✓ mf-manifest.json：shared ${manifestNames.size} 项，覆盖清单全部 ${sharedConfigKeys.size} 项`
      )
    } else {
      failures.push(`${app}: mf-manifest.json 缺 shared：${missing.join(', ')}`)
      console.log(`  ✗ mf-manifest.json 缺 shared：${missing.join(', ')}`)
    }
  }

  // INFO：assets/ 深扫（shared 实现块允许存在，仅供参考）
  const assetsDir = path.join(distDir, 'assets')
  if (fs.existsSync(assetsDir)) {
    const deepJs = fs.readdirSync(assetsDir).filter((f) => f.endsWith('.js'))
    let deepHits = 0
    const deepFiles = []
    for (const file of deepJs) {
      const content = fs.readFileSync(path.join(assetsDir, file), 'utf-8')
      const total = FORBIDDEN.reduce((sum, needle) => sum + countOccurrences(content, needle), 0)
      if (total > 0) {
        deepHits += total
        deepFiles.push(`assets/${file} (${total})`)
      }
    }
    console.log(
      `  ℹ INFO：assets/ 深扫 ${deepJs.length} 个 chunk，内核工厂出现 ${deepHits} 次` +
        (deepHits > 0 ? ` → ${deepFiles.slice(0, 5).join('、')}${deepFiles.length > 5 ? ' …' : ''}` : '')
    )
    console.log('    （shared 实现块在 provider 侧独立 chunk 内属预期，不计入断言）')
  }
  console.log('')
}

if (failures.length > 0) {
  console.error('[audit] FAILED：')
  for (const item of failures) console.error(`  - ${item}`)
  process.exit(1)
}
console.log('[audit] PASSED：全部断言通过')
