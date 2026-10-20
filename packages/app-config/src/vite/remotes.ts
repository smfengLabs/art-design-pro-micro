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
