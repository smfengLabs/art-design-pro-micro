/**
 * @art/app-config 公共入口（构建期专用）
 *
 * 仅允许 apps/&lowast;/vite.config.ts 与脚本导入（depcruise 规则 7：应用源码不可 import）。
 *
 * @module @art/app-config
 */
export { createBaseConfig } from './vite/base.ts'
export type { BaseConfigContext } from './vite/base.ts'
export { createMainConfig } from './vite/main.ts'
export { createRemoteConfig } from './vite/remote.ts'
export { createVersionDefine, getCatalogVersion, getCatalogVersions, mfSharedConfig } from './vite/federation.ts'
export { createRemoteRegistry, createRemotes, remoteRegistry } from './vite/remotes.ts'
export type { RemoteRegistryEntry } from './vite/remotes.ts'
export { createProxy } from './vite/proxy.ts'
