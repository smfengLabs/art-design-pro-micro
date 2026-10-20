/**
 * 远程应用注册表（v2 C1/G6）
 *
 * - dev：remote dev server 的 manifest 地址
 * - prod：同域网关路径（生产部署由网关转发，域名表占位待确认）
 *
 * federation remotes 段与运行时 __MF_REMOTE_REGISTRY__ 均取自本文件（同源）。
 *
 * @module app-config/vite/remotes
 */
export interface RemoteRegistryEntry {
  alias: string
  manifestUrl: string
  moduleId?: string
}

export const remoteRegistry = {
  dev: [
    {
      alias: 'app-system',
      manifestUrl: 'http://localhost:3101/mf-manifest.json',
      moduleId: 'app-system/routes'
    }
  ] as RemoteRegistryEntry[],
  prod: [
    {
      alias: 'app-system',
      manifestUrl: '/remotes/app-system/mf-manifest.json',
      moduleId: 'app-system/routes'
    }
  ] as RemoteRegistryEntry[]
}

/** 静态注册表（define 注入 __MF_REMOTE_REGISTRY__） */
export function createRemoteRegistry(isDev: boolean): { routeSources: RemoteRegistryEntry[] } {
  return { routeSources: isDev ? remoteRegistry.dev : remoteRegistry.prod }
}

/** federation remotes 段（与注册表同源） */
export function createRemotes(isDev: boolean): Record<string, string> {
  const entries = isDev ? remoteRegistry.dev : remoteRegistry.prod
  return Object.fromEntries(entries.map((item) => [item.alias, item.manifestUrl]))
}
