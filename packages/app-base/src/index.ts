/**
 * @art/app-base 公共入口
 *
 * DAG 层 3：允许依赖 app-utils / app-api / app-core / app-components 与三方库；
 * 禁止依赖 app-config 与 apps/*。
 *
 * @module @art/app-base
 */
export { bootstrapApp } from './bootstrap'
export { initRemoteHmr } from './remote-hmr'
export { createRemoteRouteSources } from './remotes'
export type { AppBootstrapOptions, LocalComponents } from './options'
export type { DynamicRemote } from './remote-hmr'
export type { RemoteRegistryEntry } from './remotes'
