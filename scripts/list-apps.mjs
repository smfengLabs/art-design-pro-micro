#!/usr/bin/env node
/**
 * 查看 workspace 微应用列表
 *
 * 用法：
 *   node scripts/list-apps.mjs
 *
 * 输出：
 *   应用名、包名、独立运行端口、应用类型（基座/子应用）
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const appsDir = path.join(repoRoot, 'apps')

function fail(message) {
  throw new Error(message)
}

function printUsage() {
  console.log(`
用法: node scripts/list-apps.mjs

说明:
  扫描 apps/ 下所有应用目录，读取 .env 的端口与 package.json 的包名，
  以表格形式输出应用名、包名、端口和类型（基座/子应用）。

示例:
  node scripts/list-apps.mjs
`)
}

function parseArgs(argv) {
  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') {
      printUsage()
      process.exit(0)
    }

    fail(`未知参数：${arg}`)
  }
}

function readPackageName(appDir) {
  const packageFile = path.join(appDir, 'package.json')
  if (!fs.existsSync(packageFile)) return '-'

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageFile, 'utf-8'))
    return packageJson.name || '-'
  } catch {
    return '-'
  }
}

function readPort(appDir) {
  const envFile = path.join(appDir, '.env')
  if (!fs.existsSync(envFile)) return '-'

  const matched = fs.readFileSync(envFile, 'utf-8').match(/^VITE_PORT\s*=\s*(\d+)/m)
  return matched ? matched[1] : '-'
}

function collectApps() {
  if (!fs.existsSync(appsDir)) return []

  const apps = fs
    .readdirSync(appsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => {
      const appDir = path.join(appsDir, entry.name)
      return {
        name: entry.name,
        packageName: readPackageName(appDir),
        port: readPort(appDir),
        type: entry.name === 'app-main' ? '基座' : '子应用'
      }
    })

  const priority = new Map([
    ['app-main', 0],
    ['app-system', 1]
  ])

  return apps.sort((left, right) => {
    const leftPriority = priority.get(left.name) ?? 2
    const rightPriority = priority.get(right.name) ?? 2
    if (leftPriority !== rightPriority) return leftPriority - rightPriority
    return left.name.localeCompare(right.name)
  })
}

function isWideChar(codePoint) {
  return (
    (codePoint >= 0x1100 && codePoint <= 0x115f) ||
    (codePoint >= 0x2e80 && codePoint <= 0xa4cf) ||
    (codePoint >= 0xac00 && codePoint <= 0xd7a3) ||
    (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
    (codePoint >= 0xfe30 && codePoint <= 0xfe4f) ||
    (codePoint >= 0xff00 && codePoint <= 0xff60) ||
    (codePoint >= 0xffe0 && codePoint <= 0xffe6)
  )
}

function displayWidth(value) {
  let width = 0
  for (const char of value) {
    width += isWideChar(char.codePointAt(0)) ? 2 : 1
  }
  return width
}

function pad(value, width) {
  return `${value}${' '.repeat(Math.max(0, width - displayWidth(value)))}`
}

function renderTable(apps) {
  const headers = ['应用名', '包名', '端口', '类型']
  const rows = apps.map((app) => [app.name, app.packageName, app.port, app.type])
  const widths = headers.map((header, columnIndex) =>
    Math.max(displayWidth(header), ...rows.map((row) => displayWidth(row[columnIndex])))
  )

  const border = (left, middle, right) =>
    `${left}${widths.map((width) => '─'.repeat(width + 2)).join(middle)}${right}`
  const renderRow = (cells) =>
    `│ ${cells.map((cell, columnIndex) => pad(cell, widths[columnIndex])).join(' │ ')} │`

  const lines = [
    border('┌', '┬', '┐'),
    renderRow(headers),
    border('├', '┼', '┤'),
    ...rows.map(renderRow),
    border('└', '┴', '┘')
  ]

  return lines.join('\n')
}

function main() {
  parseArgs(process.argv.slice(2))

  const apps = collectApps()

  if (apps.length === 0) {
    console.log('apps/ 目录下暂无应用')
    return
  }

  const hostCount = apps.filter((app) => app.type === '基座').length
  const remoteCount = apps.length - hostCount

  console.log('\nART Design Pro · 微应用列表\n')
  console.log(renderTable(apps))
  console.log(`\n共 ${apps.length} 个应用：${hostCount} 个基座，${remoteCount} 个子应用`)

  if (apps.some((app) => app.name === 'app-system')) {
    console.log('app-system 是脚手架模板，app:create 会以它为源生成新子应用。')
  }
}

try {
  main()
} catch (error) {
  console.error(`\n✖ ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
}
