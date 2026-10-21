import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin, ViteDevServer } from 'vite'

/**
 * [图标自动注入] 构建期扫描源码中的 `prefix:name` 图标字符串，从 @iconify/json
 * 按需提取并注入 virtual:art-iconify。
 *
 * 路由 meta、菜单配置等处的图标名是运行时字符串，unplugin-icons 只能处理静态
 * 组件导入，无法覆盖这类写法；因此由本插件统一扫描并按需注册。扫描范围包含
 * 全部 apps：宿主需要渲染远端菜单，必须持有远端路由所用的图标数据。
 */

const VIRTUAL_ID = 'virtual:art-iconify'
const RESOLVED_ID = `\0${VIRTUAL_ID}`

const SCAN_DIRS = ['apps', 'packages', 'templates']
const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  '.turbo',
  '.git',
  '.mf',
  '__mf__temp',
  '@mf-types',
  '.vite',
  '.vite-temp'
])
const SOURCE_FILE_RE = /\.(?:ts|vue|js|mjs)$/
const ICON_LITERAL_RE = /(['"`])([a-z0-9-]+):([a-z0-9-]+)\1/g

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')
const iconifyJsonRoot = path.dirname(
  createRequire(import.meta.url).resolve('@iconify/json/collections.json')
)
const collectionsDir = path.join(iconifyJsonRoot, 'json')

interface IconifyCollection {
  prefix: string
  width?: number
  height?: number
  icons: Record<string, unknown>
  aliases?: Record<string, unknown>
}

interface IconPayload {
  code: string
  fingerprint: string
  iconCount: number
  collectionCount: number
}

function isScannableFile(file: string): boolean {
  if (!SOURCE_FILE_RE.test(file)) return false

  const relative = path.relative(repoRoot, file)
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return false

  const segments = relative.split(/[\\/]/)
  if (!SCAN_DIRS.includes(segments[0])) return false

  return !segments.some((segment) => SKIP_DIRS.has(segment))
}

function collectSourceFiles(dir: string, files: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) collectSourceFiles(full, files)
    else if (SOURCE_FILE_RE.test(entry.name)) files.push(full)
  }
  return files
}

function listCollectionPrefixes(): Set<string> {
  return new Set(
    fs
      .readdirSync(collectionsDir)
      .filter((file) => file.endsWith('.json'))
      .map((file) => file.slice(0, -'.json'.length))
  )
}

function buildPayload(): IconPayload {
  const knownPrefixes = listCollectionPrefixes()
  const used = new Map<string, Set<string>>()

  for (const dir of SCAN_DIRS) {
    const absolute = path.join(repoRoot, dir)
    if (!fs.existsSync(absolute)) continue

    for (const file of collectSourceFiles(absolute)) {
      const source = fs.readFileSync(file, 'utf-8')
      for (const match of source.matchAll(ICON_LITERAL_RE)) {
        const prefix = match[2]
        if (!knownPrefixes.has(prefix)) continue

        if (!used.has(prefix)) used.set(prefix, new Set())
        used.get(prefix)!.add(match[3])
      }
    }
  }

  const collections: IconifyCollection[] = []
  let iconCount = 0

  for (const [prefix, names] of [...used].sort(([a], [b]) => a.localeCompare(b))) {
    const source = JSON.parse(
      fs.readFileSync(path.join(collectionsDir, `${prefix}.json`), 'utf-8')
    ) as {
      width?: number
      height?: number
      icons?: Record<string, unknown>
      aliases?: Record<string, { parent?: string }>
    }

    const icons: Record<string, unknown> = {}
    const aliases: Record<string, unknown> = {}

    for (const name of [...names].sort()) {
      if (source.icons?.[name]) {
        icons[name] = source.icons[name]
        continue
      }

      const alias = source.aliases?.[name]
      if (!alias) continue
      aliases[name] = alias
      if (alias.parent && source.icons?.[alias.parent] && !icons[alias.parent]) {
        icons[alias.parent] = source.icons[alias.parent]
      }
    }

    const resolvedCount = Object.keys(icons).length
    if (resolvedCount === 0) continue

    collections.push({
      prefix,
      width: source.width,
      height: source.height,
      icons,
      ...(Object.keys(aliases).length ? { aliases } : {})
    })
    iconCount += resolvedCount
  }

  const json = JSON.stringify(collections)
  return {
    code: `export default ${json}`,
    fingerprint: json,
    iconCount,
    collectionCount: collections.length
  }
}

function logPayload(payload: IconPayload) {
  console.log(
    `[art:auto-iconify] 自动注入 ${payload.iconCount} 个图标（${payload.collectionCount} 个集合），无需手动生成`
  )
}

/** 仅监听各工作区包的 src，避免把 dist 等构建产物纳入开发期监听 */
function collectSourceRoots(): string[] {
  const roots: string[] = []

  for (const dir of SCAN_DIRS) {
    const groupDir = path.join(repoRoot, dir)
    if (!fs.existsSync(groupDir)) continue

    for (const entry of fs.readdirSync(groupDir, { withFileTypes: true })) {
      if (!entry.isDirectory() || SKIP_DIRS.has(entry.name)) continue
      const sourceDir = path.join(groupDir, entry.name, 'src')
      if (fs.existsSync(sourceDir)) roots.push(sourceDir)
    }
  }

  return roots
}

function registerDevWatcher(server: ViteDevServer, onIconsChanged: () => void) {
  for (const root of collectSourceRoots()) server.watcher.add(root)

  let timer: ReturnType<typeof setTimeout> | undefined
  const schedule = (file: string) => {
    if (!isScannableFile(file)) return
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = undefined
      onIconsChanged()
    }, 120)
  }

  for (const event of ['add', 'change', 'unlink'] as const) {
    server.watcher.on(event, schedule)
  }
}

export function autoIconify(): Plugin {
  let cache: IconPayload | null = null

  const payload = () => {
    if (!cache) {
      cache = buildPayload()
      logPayload(cache)
    }
    return cache
  }

  return {
    name: 'art:auto-iconify',
    enforce: 'pre',
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : null
    },
    load(id) {
      return id === RESOLVED_ID ? payload().code : null
    },
    configureServer(server) {
      registerDevWatcher(server, () => {
        const previous = payload().fingerprint
        cache = buildPayload()

        if (cache.fingerprint === previous) return

        logPayload(cache)
        const module = server.moduleGraph.getModuleById(RESOLVED_ID)
        if (module) server.moduleGraph.invalidateModule(module)
        server.ws.send({ type: 'full-reload' })
      })
    }
  }
}
