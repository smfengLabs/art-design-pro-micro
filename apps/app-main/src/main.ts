import App from './App.vue'
import { bootstrapApp, createRemoteRouteSources } from '@art/app-base'
import { staticRoutes } from './routes/static'
import { asyncRoutes as localAsyncRoutes } from './routes/local-async'
import '@styles/core/tailwind.css' // tailwind
import '@styles/index.scss' // 样式

bootstrapApp({
  appName: 'app-main',
  App,
  // 静态路由（登录/注册/异常页，无需权限）
  staticRoutes,
  // 首页路径：登录成功后的默认重定向落点（开源清理后宿主首屏固定为「仪表盘-工作台」）
  homePath: '/dashboard/console',
  // 本地异步路由源（frontend 权限模式：按角色过滤生成菜单）
  asyncRouteSource: localAsyncRoutes,
  // 静态 remote 路由源（manifest 按需加载；构建期由 @art/app-config 注入注册表）
  remoteRouteSources: createRemoteRouteSources(__MF_REMOTE_REGISTRY__),
  // 动态 remote 清单（阶段一为空；dev 时由 app-base 注册并接运行时 HMR）
  dynamicRemotes: [],
  // 本地视图装载（ComponentLoader 数据源）
  localComponents: {
    componentGlob: import.meta.glob('./views/**/*.vue'),
    // 布局壳组件（一级无子路由/iframe 兜底容器，v2 E1；菜单内字符串组件由本地 glob 解析）
    layoutComponent: () => import('@art/app-components/layouts')
  }
})
