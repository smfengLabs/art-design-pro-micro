import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

/** 仓库根目录（packages/app-config/src/vite → ../../../..） */
export const repoRoot = path.resolve(currentDir, '../../../..')

/** 读取 pnpm-workspace.yaml 的 catalog 段（键 → 版本） */
export function getCatalogVersions(): Record<string, string> {
  const result: Record<string, string> = {}
  const file = path.join(repoRoot, 'pnpm-workspace.yaml')
  let inCatalog = false

  for (const line of fs.readFileSync(file, 'utf-8').split(/\r?\n/)) {
    if (!inCatalog) {
      if (/^catalog:\s*$/.test(line)) inCatalog = true
      continue
    }
    // catalog 段结束：顶格的非空行
    if (/^\S/.test(line)) break
    const matched = line.match(/^\s{2}'?([^':\s]+)'?:\s*(\S+)\s*$/)
    if (matched) result[matched[1]] = matched[2]
  }
  return result
}

const catalog = getCatalogVersions()

/** 取 catalog 版本（缺失 fail-fast，防止 shared 清单与锁版脱节） */
export function getCatalogVersion(name: string): string {
  const version = catalog[name]
  if (!version) {
    throw new Error(
      `[app-config] pnpm-workspace.yaml catalog 缺少 "${name}"，无法生成 federation requiredVersion`
    )
  }
  return version
}

/** 读取仓库根 VERSION 并生成 __APP_VERSION__ 的 define 值（缺失/空 fail-fast） */
export function createVersionDefine(): string {
  const version = fs.readFileSync(path.join(repoRoot, 'VERSION'), 'utf-8').trim()
  if (!version) {
    throw new Error('[app-config] 仓库根 VERSION 文件为空，无法注入 __APP_VERSION__')
  }
  return JSON.stringify(version)
}

/**
 * 共享依赖清单（v2 C3）：host/remote 同一份，保证内核单例
 */
export const mfSharedConfig = {
  vue: { singleton: true, requiredVersion: getCatalogVersion('vue') },
  'vue/': { singleton: true, requiredVersion: getCatalogVersion('vue') },
  'vue-router': { singleton: true, requiredVersion: getCatalogVersion('vue-router') },
  pinia: { singleton: true, requiredVersion: getCatalogVersion('pinia') },
  'pinia-plugin-persistedstate': {
    singleton: true,
    requiredVersion: getCatalogVersion('pinia-plugin-persistedstate')
  },
  'vue-i18n': { singleton: true, requiredVersion: '^9.14.0' },
  'element-plus': { singleton: true, requiredVersion: getCatalogVersion('element-plus') },
  // 运行时强耦合的 UI 库：内部依赖渲染期 currentInstance/onMounted 与 ref 归一化，
  // 若被远端 dev 预打包成独立副本会携带第二个 Vue 运行时（拖拽 Sortable 初始化失败、
  // @iconify/vue 图标数据更新失效）。与 element-plus 同理纳入共享，复用 provider 单例。
  '@iconify/vue/offline': {
    singleton: true,
    requiredVersion: getCatalogVersion('@iconify/vue')
  },
  'vue-draggable-plus': {
    singleton: true,
    requiredVersion: getCatalogVersion('vue-draggable-plus')
  },
  // 组件库的表格/搜索/表单/布局都用它，远端各自预打包会出多份副本
  '@vueuse/core': {
    singleton: true,
    requiredVersion: getCatalogVersion('@vueuse/core')
  },
  axios: { singleton: true, requiredVersion: getCatalogVersion('axios') },
  '@art/app-utils': { singleton: true, allowNodeModulesSuffixMatch: true },
  '@art/app-api': { singleton: true, allowNodeModulesSuffixMatch: true },
  '@art/app-core': { singleton: true, allowNodeModulesSuffixMatch: true },
  '@art/app-base': { singleton: true, allowNodeModulesSuffixMatch: true },
  '@art/app-components': { singleton: true, allowNodeModulesSuffixMatch: true }
}
