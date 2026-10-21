// Element Plus 通过 Module Federation 共享时，按需样式不会随共享组件加载，
// 需要主应用在所有模块之前全局引入一次基础样式。
import 'element-plus/dist/index.css'

import App from './App.vue'
// 显式注册离线 Iconify 图标集（独立子路径，避免仅为副作用加载整个组件库）
import '@art/app-components/iconify'
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
  // 远程路由源由注册表统一生成；脚手架新增子应用时只需追加 remotes 注册项
  remoteRouteSources: createRemoteRouteSources(__MF_REMOTE_REGISTRY__),
  dynamicRemotes: [],
  localComponents: {
    componentGlob: import.meta.glob('./views/**/*.vue'),
    layoutComponent: () => import('@art/app-components/layouts')
  }
})