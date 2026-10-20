// 装配面：仅 @art/app-base 可导入，apps 不得直接引用
export { store, store as pinia, initStore } from './store/create'

export { createHostRouter, initRouter } from './router/index'
export { resetRouterState } from './router/logout'
export {
  setupBeforeEachGuard,
  getRouteInitFailed,
  getPendingLoading,
  resetPendingLoading
} from './router/guards/beforeEach'
export { setupAfterEachGuard } from './router/guards/afterEach'

export { setupGlobDirectives } from './directives'
export { setupErrorHandle } from './error-handle'

export * from './router/runtime'