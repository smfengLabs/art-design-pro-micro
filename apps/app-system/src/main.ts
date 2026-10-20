window.addEventListener('error', (e) => {
  const errMsg =
    e.message || (e.target instanceof HTMLScriptElement ? '资源加载失败: ' + e.target.src : '未知错误')
  console.error('全局错误:', errMsg, e.error)
  document.body.innerHTML = `<div style="color:red; padding:20px; font-size:20px; background:#fff; z-index:9999; position:relative;">
       <h2>页面崩溃了，错误信息：</h2>
       <pre>${errMsg}</pre>
     </div>`
})

window.addEventListener('unhandledrejection', (e) => {
  console.error('未处理的 Promise 拒绝:', e.reason)
  document.body.innerHTML = `<div style="color:red; padding:20px; font-size:20px; background:#fff; z-index:9999; position:relative;">
       <h2>Promise 崩溃了，错误信息：</h2>
       <pre>${e.reason}</pre>
     </div>`
})

// app-system 独立调试入口；host 只消费 ./routes 与组件 expose，不加载本文件
import type { RouteRecordRaw } from 'vue-router'
import { bootstrapApp } from '@art/app-base'
import { RouteName } from '@art/app-utils'
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
    component: () => import('@art/app-components/auth/login'),
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