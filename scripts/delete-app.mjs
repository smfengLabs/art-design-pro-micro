#!/usr/bin/env node
/**
 * 删除微应用脚手架
 *
 * 用法：
 *   node scripts/delete-app.mjs --name app-example
 *
 * 流程：
 *   1. 防呆校验：拒绝删除宿主 app-main 与脚手架模板 app-system
 *   2. 从 remotes.ts 的 dev/prod 注册表中移除对应别名的完整对象
 *   3. 从 routeName.ts 中移除该应用的 RouteName 枚举与生成注释
 *   4. 物理删除 apps/<name>；注册表写入失败时自动回滚
 *
 * 删除完成后需执行 pnpm install，让 pnpm 更新 workspace 链接与 lockfile。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const appsDir = path.join(repoRoot, 'apps')
const remotesFile = path.join(repoRoot, 'packages/app-config/src/vite/remotes.ts')
const routeNameFile = path.join(repoRoot, 'packages/app-utils/src/enums/routeName.ts')

/** 禁止通过本脚本删除的应用 */
const PROTECTED_APPS = new Map([
  ['app-main', '宿主应用（基座），删除后整个微前端将无法启动'],
  ['app-system', '脚手架模板，删除后 app:create 将无法生成新应用']
])

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
用法: node scripts/delete-app.mjs --name <app-name>

参数:
  --name  要删除的子应用目录名，例如 app-article
  --help  显示帮助

说明:
  - app-main（宿主）与 app-system（脚手架模板）不允许删除
  - 脚本会同步清理 remotes.ts 与 routeName.ts 中的注册信息

示例:
  node scripts/delete-app.mjs --name app-article
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

    if (arg === '--name') {
      const value = argv[index + 1]
      if (!value || value.startsWith('--')) fail('参数 --name 缺少值')
      options.name = value
      index++
      continue
    }

    if (arg.startsWith('--name=')) {
      options.name = arg.slice('--name='.length)
      continue
    }

    fail(`未知参数：${arg}`)
  }

  if (!options.name) fail('缺少 --name 参数')
  return options
}

function validateAppName(rawName) {
  const appName = String(rawName).trim()

  if (!/^app-[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(appName)) {
    fail(
      `应用名不合法：${appName}。必须形如 app-article（小写字母/数字/中划线，以 app- 开头，且 app- 后首字符为字母）`
    )
  }

  const protectedReason = PROTECTED_APPS.get(appName)
  if (protectedReason) {
    fail(`拒绝删除 ${appName}：它是${protectedReason}`)
  }

  return appName
}

function assertExists(file, label) {
  if (!fs.existsSync(file)) fail(`${label} 不存在：${path.relative(repoRoot, file)}`)
}

function getRoutePrefix(appName) {
  return appName.replace(/-/g, '_').slice('app_'.length).toUpperCase()
}

function countAlias(source, appName) {
  return [...source.matchAll(/alias\s*:\s*(['"])([^'"]+)\1/g)].filter(
    (match) => match[2] === appName
  ).length
}

/**
 * 逐行扫描 dev/prod 数组，删除 alias 匹配的完整对象块。
 * 只处理脚手架生成的标准多行对象，避免误伤其他注册项或注释。
 */
function stripRemoteEntries(source, appName) {
  const eol = source.includes('\r\n') ? '\r\n' : '\n'
  const lines = source.split(/\r?\n/)
  const output = []
  const removed = { dev: 0, prod: 0 }
  let section = null
  let index = 0

  while (index < lines.length) {
    const line = lines[index]

    if (/^\s*dev\s*:\s*\[/.test(line)) {
      section = 'dev'
    } else if (/^\s*prod\s*:\s*\[/.test(line)) {
      section = 'prod'
    } else if (section && /^\s*\]\s*as\s+RemoteRegistryEntry\[\]/.test(line)) {
      section = null
    }

    if (!section || !/^\s*\{\s*$/.test(line)) {
      output.push(line)
      index += 1
      continue
    }

    let end = index + 1
    while (end < lines.length && !/^\s*\},?\s*$/.test(lines[end])) end += 1

    if (end >= lines.length) {
      fail('remotes.ts 结构异常：注册项对象缺少结束行')
    }

    const block = lines.slice(index, end + 1)
    const aliasLine = block.find((item) => /^\s*alias\s*:/.test(item))
    const aliasMatch = aliasLine ? aliasLine.match(/alias\s*:\s*(['"])([^'"]+)\1/) : null

    if (aliasMatch && aliasMatch[2] === appName) {
      removed[section] += 1
      index = end + 1
      while (index < lines.length && /^\s*$/.test(lines[index])) index += 1
      continue
    }

    output.push(...block)
    index = end + 1
  }

  const cleaned = output.join(eol)
  const remaining = countAlias(cleaned, appName)

  if (remaining > 0) {
    fail(
      `remotes.ts 中仍有 ${remaining} 处 ${appName} 注册项，` +
        '格式与脚手架生成结果不一致，请手动清理后重试'
    )
  }

  return { source: cleaned, removed }
}

/**
 * 删除该应用专属的 RouteName 枚举：
 * 优先精确删除脚手架生成注释所界定的枚举块，避免 app-order 与 app-order-center
 * 这类前缀重叠时误删其他应用的枚举；没有生成注释时再按前缀回退匹配。
 */
function stripRouteNames(source, appName) {
  const routePrefix = getRoutePrefix(appName)
  const eol = source.includes('\r\n') ? '\r\n' : '\n'
  const lines = source.split(/\r?\n/)
  const commentPattern = /^\s*\/\*\*\s*(app-[a-z0-9-]+)\s*[：:]\s*业务路由.*\*\/\s*$/
  const memberPattern = /^\s*([A-Z][A-Z0-9_]*)\s*=\s*'[^']*',?\s*$/

  const generatedBlocks = []
  for (let index = 0; index < lines.length; index++) {
    const commentMatch = lines[index].match(commentPattern)
    if (!commentMatch) continue

    let end = index + 1
    const keys = []
    while (end < lines.length) {
      const memberMatch = lines[end].match(memberPattern)
      if (!memberMatch) break
      keys.push(memberMatch[1])
      end++
    }

    generatedBlocks.push({ appName: commentMatch[1], start: index, end, keys })
    index = end - 1
  }

  const targetBlock = generatedBlocks.find((block) => block.appName === appName)
  const removedKeys = []
  const output = []
  let removedComment = false
  let lastRemovedLineIndex = -1

  if (targetBlock) {
    for (let index = 0; index < lines.length; index++) {
      if (index === targetBlock.start) {
        removedComment = true
        removedKeys.push(...targetBlock.keys)
        lastRemovedLineIndex = targetBlock.end - 1
        index = targetBlock.end - 1
        continue
      }
      output.push(lines[index])
    }
  } else {
    const ownedByOtherApps = new Set(
      generatedBlocks
        .filter((block) => block.appName !== appName)
        .flatMap((block) => block.keys)
    )
    const keyPattern = new RegExp(`^\\s*${routePrefix}(?:_[A-Z0-9_]+)?\\s*=`)

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex]
      const keyMatch = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=/)

      if (keyPattern.test(line) && keyMatch && !ownedByOtherApps.has(keyMatch[1])) {
        removedKeys.push(keyMatch[1])
        lastRemovedLineIndex = lineIndex
        continue
      }

      output.push(line)
    }
  }

  if (removedKeys.length > 0 || removedComment) {
    let closeIndex = -1
    for (let index = output.length - 1; index >= 0; index--) {
      if (/^\}\s*$/.test(output[index])) {
        closeIndex = index
        break
      }
    }

    while (closeIndex > 0 && output[closeIndex - 1].trim() === '') {
      output.splice(closeIndex - 1, 1)
      closeIndex--
    }

    // 生成脚本会为上一行补逗号；若整块位于枚举末尾，删除后同步还原尾逗号
    let closingBraceLineIndex = -1
    for (let index = lines.length - 1; index >= 0; index--) {
      if (/^\}\s*$/.test(lines[index])) {
        closingBraceLineIndex = index
        break
      }
    }
    const removedAtTail =
      lastRemovedLineIndex >= 0 &&
      closingBraceLineIndex > lastRemovedLineIndex &&
      lines
        .slice(lastRemovedLineIndex + 1, closingBraceLineIndex)
        .every((line) => line.trim() === '')

    if (removedAtTail && closeIndex > 0) {
      const memberIndex = closeIndex - 1
      const memberMatch = output[memberIndex]?.match(
        /^(\s*[A-Z][A-Z0-9_]*\s*=\s*'[^']*'),\s*$/
      )
      if (memberMatch) output[memberIndex] = memberMatch[1]
    }
  }

  return { source: output.join(eol), removedKeys }
}

function main() {
  const { name: rawName } = parseArgs(process.argv.slice(2))
  const appName = validateAppName(rawName)

  assertExists(appsDir, 'apps 目录')
  assertExists(remotesFile, 'remotes 注册表')
  assertExists(routeNameFile, 'RouteName 枚举')

  const targetDir = path.join(appsDir, appName)
  if (!fs.existsSync(targetDir)) {
    fail(`应用不存在：apps/${appName}`)
  }

  if (!fs.lstatSync(targetDir).isDirectory()) {
    fail(`目标不是目录，拒绝删除：apps/${appName}`)
  }

  const remotesSource = read(remotesFile)
  const routeNameSource = read(routeNameFile)

  const remoteResult = stripRemoteEntries(remotesSource, appName)
  const routeResult = stripRouteNames(routeNameSource, appName)
  const routePrefix = getRoutePrefix(appName)
  const removedRemotes = remoteResult.removed.dev + remoteResult.removed.prod

  if (removedRemotes === 0) {
    console.warn(`! remotes.ts 中未找到 ${appName} 注册项，可能已被手动清理`)
  }

  if (routeResult.removedKeys.length === 0) {
    console.warn(`! routeName.ts 中未找到 ${routePrefix} / ${routePrefix}_* 枚举，可能已被手动清理`)
  }

  try {
    if (remoteResult.source !== remotesSource) {
      write(remotesFile, remoteResult.source)
    }
    if (routeResult.source !== routeNameSource) {
      write(routeNameFile, routeResult.source)
    }
    fs.rmSync(targetDir, { recursive: true, force: true })
  } catch (error) {
    // 目录删除失败时恢复注册表，避免出现“应用还在、注册信息已丢”的中间态
    write(remotesFile, remotesSource)
    write(routeNameFile, routeNameSource)
    fail(`删除失败，注册表已回滚：${error instanceof Error ? error.message : String(error)}`)
  }

  const remoteSummary =
    removedRemotes === 0
      ? '未发现注册项（已跳过）'
      : `dev ${remoteResult.removed.dev} 项 / prod ${remoteResult.removed.prod} 项（已移除）`
  const routeSummary =
    routeResult.removedKeys.length === 0
      ? '未发现专属枚举（已跳过）'
      : `${routeResult.removedKeys.join(', ')}（已移除）`

  console.log(`
✔ 已删除微应用 ${appName}

  目录:       apps/${appName}（已物理删除）
  MF 注册:    ${remoteSummary}
  RouteName:  ${routeSummary}

下一步:
  1. pnpm install   # 更新 workspace 链接与 lockfile
  2. 确认 git diff 中不再包含该应用的改动
`)
}

try {
  main()
} catch (error) {
  console.error(`\n✖ ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
}
