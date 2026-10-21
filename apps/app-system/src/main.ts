// Element Plus 组件通过 Module Federation 共享，按需样式插件无法拦截其内部样式导入，
// 因此必须在所有模块之前全局引入一次，避免远程/独立运行时组件样式丢失。
import 'element-plus/dist/index.css'

// app-system 独立调试入口；host 只消费 ./routes 与组件 expose，不加载本文件
import type { RouteRecordRaw } from 'vue-router'
import { bootstrapApp } from '@art/app-base'
import { RouteName } from '@art/app-utils'
// 显式注册离线 Iconify 图标集（独立子路径，避免仅为副作用加载整个组件库）
import '@art/app-components/iconify'
import App from './App.vue'
import { systemRoutes } from './routes'
import '@styles/core/tailwind.css'
import '@styles/index.scss'

const standaloneStaticRoutes: RouteRecordRaw[] = [
  { path: '/', redirect: '/system/user' },
  {
    path: '/login',
    alias: ['/auth/login'],
    name: RouteName.LOGIN,
    component: () => import('@art/app-components/auth/unified-login'),
    meta: { title: 'menus.login.title', isHideTab: true }
  },
  {
    path: '/auth/register',
    name: RouteName.REGISTER,
    component: () => import('@art/app-components/auth/register'),
    meta: { title: 'menus.register.title', isHideTab: true }
  },
  {
    path: '/auth/forget-password',
    name: RouteName.FORGET_PASSWORD,
    component: () => import('@art/app-components/auth/forget-password'),
    meta: { title: 'menus.forgetPassword.title', isHideTab: true }
  },
  {
    path: '/exception-500',
    name: RouteName.EXCEPTION_500,
    component: () => import('./dev/NotFound.vue'),
    meta: { title: '500', isHideTab: true }
  },
  {
    path: '/:pathMatch(.*)*',
    name: RouteName.EXCEPTION_404,
    component: () => import('./dev/NotFound.vue'),
    meta: { title: '404', isHideTab: true }
  }
]

bootstrapApp({
  appName: 'app-system',
  appCode: 'app_system',
  standalone: true,
  App,
  staticRoutes: standaloneStaticRoutes,
  homePath: '/system/user',
  asyncRouteSource: systemRoutes,
  remoteRouteSources: [],
  dynamicRemotes: [],
  localComponents: {
    componentGlob: import.meta.glob('./views/**/*.vue'),
    layoutComponent: () => import('@art/app-components/layouts')
  }
})