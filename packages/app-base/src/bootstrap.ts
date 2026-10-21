import { createApp } from 'vue'
import { setActivePinia } from 'pinia'
import http, { onErrorMessage, onSuccessMessage } from '@art/app-api'
import { ElMessage } from 'element-plus'
import i18n, { $t } from '@art/app-core/locales'
import { useUserStore } from '@art/app-core/store/modules/user'
import {
  pinia,
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
  setIframeComponent,
  setAppScope
} from '@art/app-core/bootstrap'
import { initRemoteHmr } from './remote-hmr'
import type { AppBootstrapOptions } from './options'

export async function bootstrapApp(options: AppBootstrapOptions): Promise<void> {
  const {
    App,
    appCode = (import.meta.env.VITE_APP_CODE as string | undefined) || '',
    standalone = false,
    staticRoutes,
    homePath = '',
    asyncRouteSource = [],
    remoteRouteSources = [],
    dynamicRemotes = [],
    localComponents = {}
  } = options
  setAppScope(appCode, standalone)
  setStaticRoutes(staticRoutes)
  setHomePagePath(homePath)
  setAsyncRouteSource(asyncRouteSource)
  setRemoteRouteSources(remoteRouteSources)
  setComponentGlob(localComponents.componentGlob || {})
  if (localComponents.layoutComponent) setLayoutComponent(localComponents.layoutComponent)
  if (localComponents.iframeComponent) setIframeComponent(localComponents.iframeComponent)

  onErrorMessage((message) => ElMessage.error(message))
  onSuccessMessage((message) => ElMessage.success(message))

  http.setTokenProvider(() => useUserStore().accessToken)
  http.onUnauthorized(() => {
    useUserStore().logOut()
  })
  http.setTranslator((key: string, ...args: any[]) => ($t as any)(key, ...args))

  const app = createApp(App)

  // Pinia 必须最先安装：路由守卫、全局指令、i18n 以及后续组件 setup 都可能
  // 调用 useStore()。晚于它们安装会让 useStore() 在无 active pinia 时执行，
  // 生产环境直接抛 `Cannot read properties of undefined (reading '_s')`。
  app.use(pinia)
  // 显式激活唯一实例：覆盖非组件上下文（路由守卫、HTTP 拦截器回调等）。
  setActivePinia(pinia)

  createHostRouter()
  initRouter(app)

  setupGlobDirectives(app)

  setupErrorHandle(app)
  app.use(i18n)

  initRemoteHmr(dynamicRemotes)

  document.addEventListener('touchstart', function () {}, { passive: false })
  app.mount('#app')
}
