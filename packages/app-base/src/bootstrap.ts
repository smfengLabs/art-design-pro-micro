/**
 * 应用引导（v2 G2 装配顺序）
 *
 * 顺序：运行时容器注入 → HTTP 注入点 → createApp → Pinia → 路由（含守卫）
 *      → 全局指令 → 错误处理 → i18n → 动态 remote HMR（dev）→ 触摸优化 → mount
 *
 * @module app-base/bootstrap
 */
import { createApp } from 'vue'
import http from '@art/app-api'
import i18n, { $t } from '@art/app-core/locales'
import { useUserStore } from '@art/app-core/store/modules/user'
import {
  initStore,
  createHostRouter,
  initRouter,
  setupGlobDirectives,
  setupErrorHandle,
  setStaticRoutes,
  setHomePagePath,
  setAsyncRouteSource,
  setRemoteRouteSources,
  setComponentGlob,
  setLayoutComponent,
  setIframeComponent
} from '@art/app-core/bootstrap'
import { initRemoteHmr } from './remote-hmr'
import type { AppBootstrapOptions } from './options'

export async function bootstrapApp(options: AppBootstrapOptions): Promise<void> {
  const {
    App,
    staticRoutes,
    homePath = '',
    asyncRouteSource = [],
    remoteRouteSources = [],
    dynamicRemotes = [],
    localComponents = {}
  } = options
  // ── 1. 运行时容器注入（先于任何守卫/组件执行） ──
  setStaticRoutes(staticRoutes)
  setHomePagePath(homePath)
  setAsyncRouteSource(asyncRouteSource)
  setRemoteRouteSources(remoteRouteSources)
  setComponentGlob(localComponents.componentGlob || {})
  if (localComponents.layoutComponent) setLayoutComponent(localComponents.layoutComponent)
  if (localComponents.iframeComponent) setIframeComponent(localComponents.iframeComponent)

  // ── 2. HTTP 注入点（@art/app-api 解耦：token / 401 / i18n 翻译） ──
  http.setTokenProvider(() => useUserStore().accessToken)
  http.onUnauthorized(() => {
    useUserStore().logOut()
  })
  http.setTranslator((key: string, ...args: any[]) => ($t as any)(key, ...args))

  // ── 3. 应用实例 ──
  const app = createApp(App)

  // ── 4. Pinia（store 实例 + 版本化持久化，先于一切 store 消费） ──
  initStore(app)

  // ── 5. 路由：创建宿主实例并挂载守卫 ──
  createHostRouter()
  initRouter(app)

  // ── 6. 全局指令 ──
  setupGlobDirectives(app)

  // ── 7. 全局错误处理 + i18n ──
  setupErrorHandle(app)
  app.use(i18n)

  // ── 8. 动态 remote 注册与运行时 HMR（dev 有效） ──
  initRemoteHmr(dynamicRemotes)

  // ── 9. 触摸优化 + 挂载（origin main.ts 行为） ──
  document.addEventListener('touchstart', function () {}, { passive: false })
  app.mount('#app')
}
