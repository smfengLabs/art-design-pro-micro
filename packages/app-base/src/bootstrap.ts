import { createApp } from 'vue'
import http, { onErrorMessage, onSuccessMessage } from '@art/app-api'
import { ElMessage } from 'element-plus'
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

  initStore(app)

  createHostRouter()
  initRouter(app)

  setupGlobDirectives(app)

  setupErrorHandle(app)
  app.use(i18n)

  initRemoteHmr(dynamicRemotes)

  document.addEventListener('touchstart', function () {}, { passive: false })
  app.mount('#app')
}
