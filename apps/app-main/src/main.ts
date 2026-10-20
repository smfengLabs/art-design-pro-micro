// Element Plus 通过 Module Federation 共享时，按需样式不会随共享组件加载，
// 需要主应用在所有模块之前全局引入一次基础样式。
import 'element-plus/dist/index.css'

import App from './App.vue'
import { bootstrapApp, createRemoteRouteSources } from '@art/app-base'
import { staticRoutes } from './routes/static'
import { asyncRoutes as localAsyncRoutes } from './routes/local-async'
import '@styles/core/tailwind.css'
import '@styles/index.scss'

bootstrapApp({
  appName: 'app-main',
  App,
  staticRoutes,
  homePath: '/dashboard/console',
  asyncRouteSource: localAsyncRoutes,
  remoteRouteSources: createRemoteRouteSources(__MF_REMOTE_REGISTRY__),
  dynamicRemotes: [],
  localComponents: {
    componentGlob: import.meta.glob('./views/**/*.vue'),
    layoutComponent: () => import('@art/app-components/layouts')
  }
})