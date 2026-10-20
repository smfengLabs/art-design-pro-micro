export interface RemoteRegistryEntry {
  alias: string
  manifestUrl: string
  moduleId?: string
}

/** app-system 生产环境默认 manifest 地址（独立域名部署） */
const APP_SYSTEM_PROD_MANIFEST_URL = 'https://app-system.qxiangkj.cn/mf-manifest.json'

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
      manifestUrl: APP_SYSTEM_PROD_MANIFEST_URL,
      moduleId: 'app-system/routes'
    }
  ] as RemoteRegistryEntry[]
}

type RemoteEnv = Record<string, string | undefined>

/** 解析当前模式下的远端清单地址；生产环境允许通过 env 覆盖默认线上地址 */
function resolveRemoteEntries(isDev: boolean, env: RemoteEnv = {}): RemoteRegistryEntry[] {
  if (isDev) return remoteRegistry.dev

  const appSystemUrl = env.VITE_REMOTE_APP_SYSTEM_URL?.trim()
  const entries = remoteRegistry.prod.map((entry) =>
    entry.alias === 'app-system' && appSystemUrl
      ? { ...entry, manifestUrl: appSystemUrl }
      : entry
  )

  for (const entry of entries) {
    if (!/^https?:\/\//i.test(entry.manifestUrl)) {
      throw new Error(
        `[MF] 生产环境 remote "${entry.alias}" 必须使用绝对地址，当前为: ${entry.manifestUrl}`
      )
    }
  }

  return entries
}

/** 静态注册表（define 注入 __MF_REMOTE_REGISTRY__） */
export function createRemoteRegistry(
  isDev: boolean,
  env: RemoteEnv = {}
): { routeSources: RemoteRegistryEntry[] } {
  return { routeSources: resolveRemoteEntries(isDev, env) }
}

/** federation remotes 段（与注册表同源） */
export function createRemotes(isDev: boolean, env: RemoteEnv = {}): Record<string, string> {
  return Object.fromEntries(
    resolveRemoteEntries(isDev, env).map((item) => [item.alias, item.manifestUrl])
  )
}
