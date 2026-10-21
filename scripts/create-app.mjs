#!/usr/bin/env node
/**
 * 一键生成子应用脚手架
 *
 * 用法：
 *   node scripts/create-app.mjs --name app-article --port 3102
 *
 * 流程：
 *   1. 复制 apps/app-system 为 apps/<name>，并清理构建/依赖缓存
 *   2. 替换包名、环境变量、路由前缀、RouteName 枚举、MF 名称等应用身份
 *   3. 校验模板直接挂载公共 ArtUnifiedLogin，禁止再生成应用级登录页
 *   4. 向 packages/app-config/src/vite/remotes.ts 追加 dev/prod 注册项
 *   5. 扩展 packages/app-utils/src/enums/routeName.ts，保证生成应用类型检查通过
 *
 * 主应用 app-main 通过 createRemoteRouteSources(__MF_REMOTE_REGISTRY__) 自动消费
 * remotes 注册表，因此无需在 main.ts 中重复维护路由源列表。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const appsDir = path.join(repoRoot, 'apps')
const templateDir = path.join(appsDir, 'app-system')
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
  --name  子应用目录与包名，必须以 app- 开头，例如 app-article
  --port  子应用独立运行端口，例如 3102
  --help  显示帮助

示例:
  node scripts/create-app.mjs --name app-article --port 3102
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
      `应用名不合法：${appName}。必须形如 app-article（小写字母/数字/中划线，以 app- 开头，且 app- 后首字符为字母）`
    )
  }

  if (appName === 'app-main') {
    fail('app-main 是宿主应用，不能作为脚手架目标')
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

  for (const group of ['apps', 'packages']) {
    const groupDir = path.join(repoRoot, group)
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

  assertExists(templateDir, '模板应用 apps/app-system')
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

  for (const entry of fs.readdirSync(appsDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === appName) continue
    const existingPort = readPort(path.join(appsDir, entry.name, '.env'))
    if (existingPort === port) {
      fail(`端口 ${port} 已被 apps/${entry.name} 使用，请更换 --port`)
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

    // 登录页统一由公共包提供：模板不得再生成应用级登录页，main.ts 必须直接挂载 ArtUnifiedLogin
    const loginDir = path.join(targetDir, 'src/views/auth/login')
    if (fs.existsSync(loginDir)) {
      fail('模板仍包含 src/views/auth/login，请删除应用级登录页并改用公共 ArtUnifiedLogin')
    }

    const mainFile = path.join(targetDir, 'src/main.ts')
    const mainSource = read(mainFile)
    if (!mainSource.includes('@art/app-components/auth/unified-login')) {
      fail('模板 src/main.ts 未挂载公共 ArtUnifiedLogin，请先更新 apps/app-system/src/main.ts')
    }

    const textFiles = collectTextFiles(targetDir)

    // 应用身份替换：app-system → app-demo / app_system → app_demo
    replaceInFiles(textFiles, (content) =>
      content.replaceAll('app-system', appName).replaceAll('app_system', appCode)
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

    // 业务路由：变量名、RouteName 前缀、绝对路径
    const routesFile = path.join(targetDir, 'src/routes.ts')
    const routesSource = read(routesFile)
    const renamedRoutes = routesSource
      .replaceAll('systemRoutes', routeVariable)
      .replace(/RouteName\.SYSTEM(?:_[A-Z0-9_]+)?(?![A-Z0-9_])/g, (matched) => {
        return `RouteName.${routePrefix}${matched.slice('RouteName.SYSTEM'.length)}`
      })
    write(routesFile, renamedRoutes)

    // routes.ts / main.ts 中的业务路由变量名同步为 demoRoutes / articleRoutes...
    replaceInFiles(collectTextFiles(targetDir), (content) =>
      content.replaceAll('systemRoutes', routeVariable)
    )

    // 只替换「引号后紧跟 /system」的路由字面量，避免误伤 ./views/system 导入路径
    replaceInFiles(collectTextFiles(targetDir), (content) =>
      content.replace(/(['"`])\/system(?=\/|['"`])/g, (_matched, quote) => `${quote}${routeBase}`)
    )

    // 组件名同步为 AppXxx / XxxNotFound
    replaceInFiles(collectTextFiles(targetDir), (content) =>
      content
        .replaceAll('AppSystem', `App${pascalName}`)
        .replaceAll('SystemNotFound', `${pascalName}NotFound`)
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
