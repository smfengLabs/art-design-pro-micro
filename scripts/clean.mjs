/**
 * 缓存清理脚本（dev 抖动急救）
 *
 * 清理 Vite 依赖预构建缓存（node_modules/.vite）、turbo 缓存与 MF 生成产物，
 * 用于排查「504 Outdated Optimize Dep / chunk 卡死 / HMR 死锁」等缓存态问题。
 *
 * 用法：pnpm clean（清理后请重启 dev server）
 *
 * @module scripts/clean
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const targets = [
  // Vite 依赖预构建缓存（问题高发区）
  'node_modules/.vite',
  'apps/app-main/node_modules/.vite',
  'apps/app-system/node_modules/.vite',
  'apps/app-main/node_modules/.vite-temp',
  'apps/app-system/node_modules/.vite-temp',
  // turbo 缓存
  '.turbo',
  'apps/app-main/.turbo',
  'apps/app-system/.turbo',
  // Module Federation 生成产物（随构建/启动自动重建）
  'apps/app-main/@mf-types',
  'apps/app-system/@mf-types',
  'apps/app-main/.__mf__temp',
  'apps/app-system/.__mf__temp',
  'apps/app-main/.mf',
  'apps/app-system/.mf'
]

let removed = 0
for (const target of targets) {
  const abs = path.join(root, target)
  if (!fs.existsSync(abs)) continue
  fs.rmSync(abs, { recursive: true, force: true })
  console.log(`  ✓ 已清理 ${target}`)
  removed++
}

if (removed === 0) {
  console.log('  无缓存需要清理')
} else {
  console.log(`🧹 缓存清理完成（${removed} 项），请重启 dev server`)
}
