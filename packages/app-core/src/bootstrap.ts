/**
 * @art/app-core 装配面（assembly）
 *
 * 定义（v2 B3 规则 5/6）：assembly = bootstrap.ts + router/guards/** + store/create.ts。
 * 仅允许 @art/app-base 的 bootstrapApp 经由子路径 '@art/app-core/bootstrap' 导入；
 * 应用（apps/*）不得直接导入，remote 可达闭包（index 外壳面）亦不得触达本文件及其导出。
 *
 * @module @art/app-core/bootstrap
 */

// ── pinia 实例与持久化装配（store/create.ts） ──
export { store, store as pinia, initStore } from './store/create'

// ── 路由装配（宿主路由创建 + 守卫挂载 + 登出复位） ──
export { createHostRouter, initRouter } from './router/index'
export { resetRouterState } from './router/logout'
export {
  setupBeforeEachGuard,
  getRouteInitFailed,
  getPendingLoading,
  resetPendingLoading
} from './router/guards/beforeEach'
export { setupAfterEachGuard } from './router/guards/afterEach'

// ── 全局指令 / 错误处理 ──
export { setupGlobDirectives } from './directives'
export { setupErrorHandle } from './error-handle'

// ── 路由运行时容器注入点（host 装配期写入） ──
export * from './router/runtime'
