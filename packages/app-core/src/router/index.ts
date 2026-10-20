import type { App } from 'vue'
import type { Router, RouteRecordRaw } from 'vue-router'
import { createRouter, createWebHashHistory } from 'vue-router'
import { configureNProgress } from '../utils/router'
import { setupBeforeEachGuard } from './guards/beforeEach'
import { setupAfterEachGuard } from './guards/afterEach'
import { setupRouterErrorHandler } from './guards/onError'
import { getActiveRouter, getStaticRoutes, setActiveRouter } from './runtime'

/**
 * 创建宿主路由实例（静态路由来自 runtime，由 bootstrapApp 先注入）
 */
export function createHostRouter(): Router {
  const router = createRouter({
    history: createWebHashHistory(),
    routes: getStaticRoutes() as RouteRecordRaw[] // 静态路由（AppRouteRecord 与 vue-router 记录运行时兼容）
  })

  setActiveRouter(router)
  return router
}

/**
 * 初始化路由（原 router/index.ts 的 initRouter）
 */
export function initRouter(app: App<Element>): void {
  const router = getActiveRouter()
  configureNProgress() // 配置进度条
  setupBeforeEachGuard(router) // 路由前置守卫
  setupAfterEachGuard(router) // 路由后置守卫
  setupRouterErrorHandler(router) // 导航错误兜底（chunk 加载失败/超时时清理 loading）
  app.use(router)
}

// 首页路径等运行时状态收敛在 runtime（menu Store 等外壳面消费不得触达本文件，DAG 规则 6）
export { getActiveRouter } from './runtime'
