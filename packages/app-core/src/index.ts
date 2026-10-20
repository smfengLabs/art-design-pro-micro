/**
 * @art/app-core 公共入口（外壳面 shell）
 *
 * DAG 层 2：允许依赖 @art/app-utils、@art/app-api 与三方库；
 * 禁止依赖 @art/app-base、@art/app-config 与 apps/*。
 *
 * 装配面（pinia / guards / 宿主路由创建）在 './bootstrap' 子路径，仅 @art/app-base 可导入；
 * remote（app-system）经本入口消费 store/hooks/util —— 可达闭包内不得出现
 * bootstrap.ts / router/guards/** / store/create.ts（DAG 规则 5/6）。
 *
 * @module @art/app-core
 */

// ── 路由运行时（状态容器 + 访问器 + 注入点） ──
export * from './router/runtime'

// ── 路由核心处理器（组件加载器、菜单处理、路由注册器） ──
export * from './router/core'

// ── Store（模块级单例，经 pinia 持久化） ──
export * from './store'

// ── 国际化 ──
export { default as i18n, $t, languageOptions } from './locales'

// ── Hooks ──
export * from './hooks'

// ── 工具 ──
export * from './utils/router'
export * from './utils/navigation'
export * from './utils/storage'
export * from './utils/ui'
// 多端数据同步（WebSocket 实时同步）
export { initSocket, closeSocket } from './utils/socket'
export type { GlobalDataRefreshPayload } from './utils/socket'
// 全局事件总线（mittBus，供业务页面与多端同步消费）
export { mittBus } from '@art/app-utils'

// ── 配置（AppConfig / setting / 图片资源 / 布局功能开关） ──
export { default as AppConfig } from './config'
export * from './config/setting'
export * from './config/assets/images'
export * from './config/modules/headerBar'
