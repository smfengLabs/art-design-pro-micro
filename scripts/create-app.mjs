#!/usr/bin/env node
/**
 * 一键生成子应用脚手架
 *
 * 用法：
 *   node scripts/create-app.mjs --name app-order --port 3102
 *
 * 流程：
 *   1. 复制 templates/app-template 为 apps/<name>，并清理构建/依赖缓存
 *   2. 替换包名、环境变量、路由前缀、RouteName 枚举、MF 名称等应用身份
 *   3. 生成欢迎页与空业务路由，保证新应用零业务包袱
 *   4. 校验模板直接挂载公共 ArtUnifiedLogin，禁止再生成应用级登录页
 *   5. 向 packages/app-config/src/vite/remotes.ts 追加 dev/prod 注册项
 *   6. 扩展 packages/app-utils/src/enums/routeName.ts，保证生成应用类型检查通过
 *
 * 主应用 app-main 通过 createRemoteRouteSources(__MF_REMOTE_REGISTRY__) 自动消费
 * remotes 注册表，因此无需在 main.ts 中重复维护路由源列表。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const appsDir = path.join(repoRoot, 'apps')
const templatesDir = path.join(repoRoot, 'templates')
const templateDir = path.join(templatesDir, 'app-template')
const remotesFile = path.join(repoRoot, 'packages/app-config/src/vite/remotes.ts')
const routeNameFile = path.join(repoRoot, 'packages/app-utils/src/enums/routeName.ts')
const hostMainFile = path.join(appsDir, 'app-main/src/main.ts')

/** 复制模板时需要跳过的缓存目录（生成后再做一次兜底清理） */
const CACHE_DIRS = new Set([
  'node_modules',
  'dist',
  '.turbo',
  '.mf',
  '.__mf__temp',
  '@mf-types',
  '.vite',
  '.vite-temp'
])

/** 需要做应用身份替换的文本文件扩展名 */
const TEXT_EXTENSIONS = new Set(['.ts', '.vue', '.json', '.html', '.scss', '.css', '.md', '.txt'])

function fail(message) {
  throw new Error(message)
}

function read(file) {
  return fs.readFileSync(file, 'utf-8')
}

function write(file, content) {
  fs.writeFileSync(file, content, 'utf-8')
}

function printUsage() {
  console.log(`
用法: node scripts/create-app.mjs --name <app-name> --port <port>

参数:
  --name  子应用目录与包名，必须以 app- 开头，例如 app-order
  --port  子应用独立运行端口，例如 3102
  --help  显示帮助

示例:
  node scripts/create-app.mjs --name app-order --port 3102
`)
}

function parseArgs(argv) {
  const options = {}

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index]

    if (arg === '--help' || arg === '-h') {
      printUsage()
      process.exit(0)
    }

    if (arg === '--name' || arg === '--port') {
      const value = argv[index + 1]
      if (!value || value.startsWith('--')) {
        fail(`参数 ${arg} 缺少值`)
      }
      options[arg.slice(2)] = value
      index++
      continue
    }

    if (arg.startsWith('--name=')) {
      options.name = arg.slice('--name='.length)
      continue
    }

    if (arg.startsWith('--port=')) {
      options.port = arg.slice('--port='.length)
      continue
    }

    fail(`未知参数：${arg}`)
  }

  if (!options.name) fail('缺少 --name 参数')
  if (!options.port) fail('缺少 --port 参数')
  return options
}

function toCamel(value) {
  const parts = value.split(/[^a-zA-Z0-9]+/).filter(Boolean)
  return parts
    .map((part, index) => {
      const normalized = part.toLowerCase()
      if (index === 0) return normalized
      return normalized.charAt(0).toUpperCase() + normalized.slice(1)
    })
    .join('')
}

function toPascal(value) {
  const camel = toCamel(value)
  return camel.charAt(0).toUpperCase() + camel.slice(1)
}

function readPort(file) {
  if (!fs.existsSync(file)) return null
  const matched = read(file).match(/^VITE_PORT\s*=\s*(\d+)/m)
  return matched ? Number(matched[1]) : null
}

function validateNameAndPort(rawName, rawPort) {
  const appName = String(rawName).trim()
  const port = Number(String(rawPort).trim())

  if (!/^app-[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(appName)) {
    fail(
      `应用名不合法：${appName}。必须形如 app-order（小写字母/数字/中划线，以 app- 开头，且 app- 后首字符为字母）`
    )
  }

  if (appName === 'app-main') {
    fail('app-main 是宿主应用，不能作为脚手架目标')
  }

  if (appName === 'app-template') {
    fail('app-template 是纯模板保留名，请使用其他应用名')
  }

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    fail(`端口不合法：${rawPort}。请输入 1-65535 之间的整数`)
  }

  return { appName, port }
}

function collectTextFiles(rootDir) {
  const files = []

  const walk = (currentDir) => {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      if (CACHE_DIRS.has(entry.name)) continue

      const absolutePath = path.join(currentDir, entry.name)
      if (entry.isDirectory()) {
        walk(absolutePath)
        continue
      }

      if (!entry.isFile()) continue

      const isEnvFile = entry.name.startsWith('.env')
      if (isEnvFile || TEXT_EXTENSIONS.has(path.extname(entry.name))) {
        files.push(absolutePath)
      }
    }
  }

  walk(rootDir)
  return files
}

function replaceInFiles(files, transform) {
  for (const file of files) {
    const before = read(file)
    const after = transform(before)
    if (after !== before) write(file, after)
  }
}

/** 生成纯净欢迎页：纯展示、零业务依赖，开箱即可作为业务开发起点 */
function buildHomePage(displayName, componentName) {
  return `<!-- 欢迎页：脚手架生成的纯净业务起点 -->
<template>
  <div class="home-page">
    <div class="home-glow home-glow--primary"></div>
    <div class="home-glow home-glow--secondary"></div>

    <section class="home-card">
      <div class="home-icons" aria-hidden="true">
        <span class="home-icon home-icon--violet">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09Z" />
            <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2Z" />
            <path d="M9 12H4l3-5h5M12 15v5l5-3v-5" />
          </svg>
        </span>
        <span class="home-icon home-icon--blue">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="m12 3-1.9 5.1a2 2 0 0 1-1.2 1.2L4 11.2l4.9 1.9a2 2 0 0 1 1.2 1.2L12 19.4l1.9-5.1a2 2 0 0 1 1.2-1.2l4.9-1.9-4.9-1.9a2 2 0 0 1-1.2-1.2L12 3Z" />
            <path d="M5 3v4M3 5h4M19 17v4M17 19h4" />
          </svg>
        </span>
        <span class="home-icon home-icon--cyan">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="m8 9-4 3 4 3M16 9l4 3-4 3M14 5l-4 14" />
          </svg>
        </span>
      </div>

      <p class="home-kicker">ART DESIGN PRO · STARTER</p>
      <h1 class="home-title">欢迎使用 <span>{{ appName }}</span>！</h1>
      <p class="home-desc">当前是一个纯净的子应用模板，请在此处开发您的业务逻辑。</p>

      <div class="home-tags">
        <span class="home-tag">布局已接入</span>
        <span class="home-tag">路由已就绪</span>
        <span class="home-tag">登录已统一</span>
      </div>

      <p class="home-hint">从 src/views/home/index.vue 开始你的开发</p>
    </section>
  </div>
</template>

<script setup lang="ts">
  defineOptions({ name: '${componentName}' })

  const appName = '${displayName}'
</script>

<style scoped>
  .home-page {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: calc(100vh - 100px);
    padding: 32px;
    overflow: hidden;
    background:
      radial-gradient(circle at 12% 18%, rgba(99, 102, 241, 0.16), transparent 32%),
      radial-gradient(circle at 88% 82%, rgba(6, 182, 212, 0.14), transparent 30%),
      var(--art-bg-color, #f6f8fc);
  }

  .home-glow {
    position: absolute;
    width: 360px;
    height: 360px;
    border-radius: 999px;
    filter: blur(70px);
    opacity: 0.55;
    pointer-events: none;
  }

  .home-glow--primary {
    top: -120px;
    left: -80px;
    background: rgba(99, 102, 241, 0.35);
  }

  .home-glow--secondary {
    right: -100px;
    bottom: -140px;
    background: rgba(14, 165, 233, 0.28);
  }

  .home-card {
    position: relative;
    z-index: 1;
    width: min(100%, 680px);
    padding: clamp(32px, 6vw, 64px) clamp(24px, 5vw, 56px);
    text-align: center;
    border: 1px solid rgba(255, 255, 255, 0.72);
    border-radius: 28px;
    background: rgba(255, 255, 255, 0.78);
    box-shadow: 0 24px 80px rgba(30, 41, 59, 0.12);
    backdrop-filter: blur(18px);
  }

  .home-icons {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
    margin-bottom: 34px;
  }

  .home-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 58px;
    height: 58px;
    border-radius: 18px;
    color: #fff;
    box-shadow: 0 12px 30px rgba(79, 70, 229, 0.24);
    animation: home-float 4.8s ease-in-out infinite;
  }

  .home-icon svg {
    width: 27px;
    height: 27px;
  }

  .home-icon--violet {
    background: linear-gradient(135deg, #8b5cf6, #6366f1);
    transform: rotate(-8deg);
  }

  .home-icon--blue {
    background: linear-gradient(135deg, #38bdf8, #2563eb);
    animation-delay: 0.35s;
  }

  .home-icon--cyan {
    background: linear-gradient(135deg, #2dd4bf, #0891b2);
    transform: rotate(8deg);
    animation-delay: 0.7s;
  }

  .home-kicker {
    margin: 0 0 14px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.24em;
    color: #6366f1;
  }

  .home-title {
    margin: 0;
    font-size: clamp(28px, 4vw, 42px);
    line-height: 1.25;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: #111827;
  }

  .home-title span {
    background: linear-gradient(120deg, #4f46e5, #0891b2);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }

  .home-desc {
    max-width: 480px;
    margin: 18px auto 0;
    font-size: 15px;
    line-height: 1.9;
    color: #64748b;
  }

  .home-tags {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
    margin-top: 28px;
  }

  .home-tag {
    padding: 7px 14px;
    font-size: 12px;
    font-weight: 600;
    color: #475569;
    border: 1px solid rgba(99, 102, 241, 0.16);
    border-radius: 999px;
    background: rgba(99, 102, 241, 0.07);
  }

  .home-hint {
    margin: 30px 0 0;
    font-size: 12px;
    color: #94a3b8;
  }

  :global(.dark) .home-page {
    background:
      radial-gradient(circle at 12% 18%, rgba(99, 102, 241, 0.2), transparent 32%),
      radial-gradient(circle at 88% 82%, rgba(6, 182, 212, 0.16), transparent 30%),
      #0b1020;
  }

  :global(.dark) .home-card {
    border-color: rgba(255, 255, 255, 0.08);
    background: rgba(17, 24, 39, 0.78);
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.32);
  }

  :global(.dark) .home-title {
    color: #f8fafc;
  }

  :global(.dark) .home-desc {
    color: #94a3b8;
  }

  :global(.dark) .home-tag {
    color: #cbd5e1;
    border-color: rgba(129, 140, 248, 0.2);
    background: rgba(129, 140, 248, 0.12);
  }

  :global(.dark) .home-hint {
    color: #64748b;
  }

  @keyframes home-float {
    0%,
    100% {
      translate: 0 0;
    }
    50% {
      translate: 0 -6px;
    }
  }

  @media (max-width: 640px) {
    .home-page {
      padding: 20px;
    }

    .home-card {
      padding: 36px 22px;
    }

    .home-icons {
      margin-bottom: 26px;
    }

    .home-icon {
      width: 50px;
      height: 50px;
      border-radius: 15px;
    }
  }
</style>
`
}

/** 重写路由：布局根路由 + 唯一 home 子路由 */
function buildHomeRoutes({ routeVariable, routeBase, routePrefix, displayName }) {
  return `// ${displayName} 业务路由：纯净骨架，仅保留首页
import type { RouteRecordRaw } from 'vue-router'
import { RouteName } from '@art/app-utils'

export const ${routeVariable}: RouteRecordRaw[] = [
  {
    path: '${routeBase}',
    name: RouteName.${routePrefix},
    component: () => import('@art/app-components/layouts'),
    redirect: '${routeBase}/home',
    meta: {
      title: '${displayName}',
      icon: 'ri:home-4-line',
      collapseSingleChild: true
    },
    children: [
      {
        path: 'home',
        name: RouteName.${routePrefix}_HOME,
        component: () => import('./views/home/index.vue'),
        meta: {
          title: 'menus.home.title',
          icon: 'ri:home-4-line',
          keepAlive: true
        }
      }
    ]
  }
]

export default ${routeVariable}
`
}

/** 将生成应用的入口重定向和开发环境 404 回跳统一指向欢迎页 */
function updateGeneratedShell(targetDir, routeBase) {
  const files = [path.join(targetDir, 'src/main.ts'), path.join(targetDir, 'src/dev/NotFound.vue')]

  for (const file of files) {
    if (!fs.existsSync(file)) continue
    const before = read(file)
    const after = before.replaceAll('/template/home', `${routeBase}/home`)
    if (after !== before) write(file, after)
  }

  const mainSource = read(path.join(targetDir, 'src/main.ts'))
  if (!mainSource.includes(`${routeBase}/home`)) {
    fail(`生成应用的 src/main.ts 未指向欢迎页：${routeBase}/home`)
  }
}

function assertExists(file, label) {
  if (!fs.existsSync(file)) fail(`${label} 不存在：${path.relative(repoRoot, file)}`)
}

function assertNoGeneratedAlias(source, appName) {
  if (source.includes(`alias: '${appName}'`)) {
    fail(`remotes 注册表已存在 ${appName}，请先清理旧注册项`)
  }
}

function assertPackageNameAvailable(appName) {
  const packageName = `@art/${appName}`

  for (const group of ['apps', 'packages', 'templates']) {
    const groupDir = path.join(repoRoot, group)
    if (!fs.existsSync(groupDir)) continue
    for (const entry of fs.readdirSync(groupDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const packageFile = path.join(groupDir, entry.name, 'package.json')
      if (!fs.existsSync(packageFile)) continue

      const packageJson = JSON.parse(read(packageFile))
      if (packageJson.name === packageName) {
        fail(`包名 ${packageName} 已被 ${group}/${entry.name} 使用，请更换 --name`)
      }
    }
  }
}

function registerRouteNames(routeKeys, appName) {
  const source = read(routeNameFile)
  const existing = new Map()

  for (const match of source.matchAll(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*'([^']*)'/gm)) {
    existing.set(match[1], match[2])
  }

  const additions = []

  for (const key of routeKeys) {
    const value = toPascal(key)

    if (existing.has(key)) {
      if (existing.get(key) !== value) {
        fail(`RouteName.${key} 已存在且值不匹配（期望 ${value}，实际 ${existing.get(key)}）`)
      }
      continue
    }

    const conflict = [...existing.entries()].find(([existingKey, existingValue]) => {
      return existingValue === value && existingKey !== key
    })

    if (conflict) {
      fail(`RouteName.${key} 的值 ${value} 已被 RouteName.${conflict[0]} 占用`)
    }

    additions.push({ key, value })
  }

  if (additions.length === 0) return

  const lastBrace = source.lastIndexOf('}')
  if (lastBrace === -1) fail('routeName.ts 结构异常：未找到枚举结束花括号')

  const head = source.slice(0, lastBrace).replace(/\s*$/, '')
  const separator = head.endsWith(',') ? '' : ','
  const block = [
    '',
    `  /** ${appName}：业务路由（脚手架生成） */`,
    ...additions.map(({ key, value }, index) => {
      const suffix = index === additions.length - 1 ? '' : ','
      return `  ${key} = '${value}'${suffix}`
    })
  ].join('\n')

  write(routeNameFile, `${head}${separator}${block}\n${source.slice(lastBrace)}`)
}

function registerRemote(source, appName, port) {
  const devMarker = '    // SCAFFOLD_REMOTES_DEV'
  const prodMarker = '    // SCAFFOLD_REMOTES_PROD'

  if (!source.includes(devMarker)) fail('remotes.ts 缺少 SCAFFOLD_REMOTES_DEV 标记')
  if (!source.includes(prodMarker)) fail('remotes.ts 缺少 SCAFFOLD_REMOTES_PROD 标记')

  const createEntry = (manifestUrl) =>
    [
      '    {',
      `      alias: '${appName}',`,
      `      manifestUrl: '${manifestUrl}',`,
      `      moduleId: '${appName}/routes'`,
      '    },',
      ''
    ].join('\n')

  const devEntry = createEntry(`http://localhost:${port}/mf-manifest.json`)
  const prodEntry = createEntry(`https://${appName}.qxiangkj.cn/mf-manifest.json`)

  return source
    .replace(devMarker, `${devEntry}${devMarker}`)
    .replace(prodMarker, `${prodEntry}${prodMarker}`)
}

function main() {
  const { name: rawName, port: rawPort } = parseArgs(process.argv.slice(2))
  const { appName, port } = validateNameAndPort(rawName, rawPort)

  assertExists(templateDir, '模板工程 templates/app-template')
  assertExists(remotesFile, 'remotes 注册表')
  assertExists(routeNameFile, 'RouteName 枚举')
  assertExists(hostMainFile, '宿主入口')

  const targetDir = path.join(appsDir, appName)
  if (fs.existsSync(targetDir)) {
    fail(`目标目录已存在：apps/${appName}，请先删除或更换 --name`)
  }

  assertPackageNameAvailable(appName)

  const remotesSource = read(remotesFile)
  assertNoGeneratedAlias(remotesSource, appName)

  const hostMainSource = read(hostMainFile)
  if (!hostMainSource.includes('createRemoteRouteSources(__MF_REMOTE_REGISTRY__)')) {
    fail(
      '宿主 app-main/src/main.ts 未检测到 createRemoteRouteSources(__MF_REMOTE_REGISTRY__)，' +
        '无法保证新子应用路由源自动注册'
    )
  }

  const portOwners = [appsDir, templatesDir]
  for (const ownerDir of portOwners) {
    if (!fs.existsSync(ownerDir)) continue
    for (const entry of fs.readdirSync(ownerDir, { withFileTypes: true })) {
      if (!entry.isDirectory() || (ownerDir === appsDir && entry.name === appName)) continue
      const existingPort = readPort(path.join(ownerDir, entry.name, '.env'))
      if (existingPort === port) {
        fail(
          `端口 ${port} 已被 ${path.relative(repoRoot, path.join(ownerDir, entry.name))} 使用，请更换 --port`
        )
      }
    }
  }

  const appCode = appName.replace(/-/g, '_')
  const appSegment = appName.slice('app-'.length)
  const routeBase = `/${appSegment}`
  const routePrefix = appCode.slice('app_'.length).toUpperCase()
  const routeVariable = `${toCamel(appSegment)}Routes`
  const pascalName = toPascal(appSegment)
  const displayName = pascalName

  let remotesBackup = null
  let routeNameBackup = null

  try {
    fs.cpSync(templateDir, targetDir, {
      recursive: true,
      filter(sourcePath) {
        const baseName = path.basename(sourcePath)
        if (CACHE_DIRS.has(baseName)) return false
        if (baseName === '.auto-import.json') return false
        return true
      }
    })

    // 兜底清理：即使模板里存在缓存目录，也不带入新应用
    for (const cacheDir of CACHE_DIRS) {
      const cachePath = path.join(targetDir, cacheDir)
      if (fs.existsSync(cachePath)) {
        fs.rmSync(cachePath, { recursive: true, force: true })
      }
    }

    // 新应用自带一个纯展示欢迎页，作为业务开发的起点
    const homePageFile = path.join(targetDir, 'src/views/home/index.vue')
    fs.mkdirSync(path.dirname(homePageFile), { recursive: true })
    write(homePageFile, buildHomePage(displayName, `${pascalName}Home`))

    // 登录页统一由公共包提供：模板不得再生成应用级登录页，main.ts 必须直接挂载 ArtUnifiedLogin
    const loginDir = path.join(targetDir, 'src/views/auth/login')
    if (fs.existsSync(loginDir)) {
      fail('模板仍包含 src/views/auth/login，请删除应用级登录页并改用公共 ArtUnifiedLogin')
    }

    const mainFile = path.join(targetDir, 'src/main.ts')
    const mainSource = read(mainFile)
    if (!mainSource.includes('@art/app-components/auth/unified-login')) {
      fail('模板 src/main.ts 未挂载公共 ArtUnifiedLogin，请先更新 templates/app-template/src/main.ts')
    }

    const textFiles = collectTextFiles(targetDir)

    // 应用身份替换：templates/app-template → apps/<name>，app-template → app-name
    replaceInFiles(textFiles, (content) =>
      content
        .replaceAll('templates/app-template', `apps/${appName}`)
        .replaceAll('app-template', appName)
        .replaceAll('app_template', appCode)
    )

    // 包名按 workspace 约定使用 @art/ 作用域
    const packageFile = path.join(targetDir, 'package.json')
    const packageJson = JSON.parse(read(packageFile))
    packageJson.name = `@art/${appName}`
    write(packageFile, `${JSON.stringify(packageJson, null, 2)}\n`)

    // 独立运行端口
    const envFile = path.join(targetDir, '.env')
    const envSource = read(envFile)
    if (!/^VITE_PORT\s*=.*$/m.test(envSource)) {
      fail('生成应用的 .env 中未找到 VITE_PORT')
    }
    write(envFile, envSource.replace(/^VITE_PORT\s*=.*$/m, `VITE_PORT = ${port}`))

    // 浏览器标题使用应用名，避免所有子应用都叫 System
    const htmlFile = path.join(targetDir, 'index.html')
    const htmlSource = read(htmlFile)
    if (!/<title>.*?<\/title>/.test(htmlSource)) {
      fail('生成应用的 index.html 中未找到 <title>')
    }
    write(htmlFile, htmlSource.replace(/<title>.*?<\/title>/, `<title>Art Design Pro - ${displayName}</title>`))

    // 纯净业务路由：布局根路由 + 唯一 home 子路由
    const routesFile = path.join(targetDir, 'src/routes.ts')
    write(routesFile, buildHomeRoutes({ routeVariable, routeBase, routePrefix, displayName }))

    // 入口 / 开发环境 404 的业务回跳统一指向欢迎页
    updateGeneratedShell(targetDir, routeBase)

    // routes.ts / main.ts 中的业务路由变量名同步为 demoRoutes / orderRoutes...
    replaceInFiles(collectTextFiles(targetDir), (content) =>
      content.replaceAll('templateRoutes', routeVariable)
    )

    // 兜底替换可能残留的 /template 路由字面量，避免生成应用继续指向模板欢迎页
    replaceInFiles(collectTextFiles(targetDir), (content) =>
      content.replace(/(['"`])\/template(?=\/|['"`])/g, (_matched, quote) => `${quote}${routeBase}`)
    )

    // 组件名同步为 AppXxx / XxxNotFound
    replaceInFiles(collectTextFiles(targetDir), (content) =>
      content
        .replaceAll('AppTemplate', `App${pascalName}`)
        .replaceAll('TemplateNotFound', `${pascalName}NotFound`)
    )

    const viteConfigFile = path.join(targetDir, 'vite.config.ts')
    const viteConfig = read(viteConfigFile)
    if (!viteConfig.includes(`name: '${appName}'`)) {
      fail(`生成应用的 vite.config.ts 未正确写入 MF name: ${appName}`)
    }

    const tsconfigFile = path.join(targetDir, 'tsconfig.json')
    const tsconfig = read(tsconfigFile)
    if (!tsconfig.includes(`apps/${appName}/src`)) {
      fail(`生成应用的 tsconfig.json 未正确更新路径别名: apps/${appName}/src`)
    }

    const generatedRoutes = read(routesFile)
    const routeKeys = [
      ...new Set(
        [...generatedRoutes.matchAll(/RouteName\.([A-Z][A-Z0-9_]*)/g)]
          .map((match) => match[1])
          .filter((key) => key === routePrefix || key.startsWith(`${routePrefix}_`))
      )
    ]

    if (routeKeys.length === 0) {
      fail(`生成的 src/routes.ts 中未找到 RouteName.${routePrefix}_* 路由名`)
    }

    remotesBackup = read(remotesFile)
    routeNameBackup = read(routeNameFile)

    registerRouteNames(routeKeys, appName)
    write(remotesFile, registerRemote(remotesBackup, appName, port))

    console.log(`
✔ 已生成子应用 ${appName}

  目录:       apps/${appName}
  包名:       @art/${appName}
  应用编码:   ${appCode}
  MF 名称:    ${appName}
  独立端口:   ${port}
  路由前缀:   ${routeBase}

  宿主路由源: 已通过 remotes 注册表自动接入
  RouteName:  已追加 ${routeKeys.join(', ')}

下一步:
  1. pnpm install
  2. pnpm dev
  3. 打开 http://localhost:${port} 验证独立登录
     打开 http://localhost:3006 验证宿主左侧菜单
`)
  } catch (error) {
    if (remotesBackup !== null) write(remotesFile, remotesBackup)
    if (routeNameBackup !== null) write(routeNameFile, routeNameBackup)
    if (fs.existsSync(targetDir)) fs.rmSync(targetDir, { recursive: true, force: true })
    throw error
  }
}

try {
  main()
} catch (error) {
  console.error(`\n✖ ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
}
