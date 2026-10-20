/**
 * app-system standalone 调试入口（v2 G2 + G3 解法 2）
 *
 * 生产 host 会话中本文件不会被加载：MF 只消费 ./routes 与组件 expose，
 * main.ts 不在任何 expose 的 importer 图内（depcruiser 规则 6 机器保证）。
 *
 * standalone 会话自持完整装配：
 * - staticRoutes：真实登录/注册/忘记密码页（@art/app-components/auth/*）+ 异常兜底
 * - asyncRouteSource：本应用暴露的 system 业务路由（frontend 权限模式，守卫/菜单完整可用）
 *
 * @module app-system/main
 */
import type { RouteRecordRaw } from 'vue-router'
import { bootstrapApp } from '@art/app-base'
import { RouteName } from '@art/app-utils'
import App from './App.vue'
import { systemRoutes } from './routes'
import '@styles/core/tailwind.css' // tailwind 基类（standalone 独立文档自持一份，@styles 别名由 app-config 提供）
import '@styles/index.scss' // 核心样式（origin 原样）

// standalone 静态路由：未登录访问业务页 → 守卫重定向到 Login（真实登录页，G3 解法 2）
const standaloneStaticRoutes: RouteRecordRaw[] = [
  { path: '/', redirect: '/system/user' },
  {
    path: '/login',
    alias: ['/auth/login'],
    name: RouteName.LOGIN,
    component: () => import('@art/app-components/auth/login'),
    meta: { title: 'menus.login.title', isHideTab: true }
  },
  // origin 登录页内「注册 / 忘记密码」链接的真实落地：同为公共包视图（Auth 域全量 SSOT）
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
  // 首页路径：standalone 登录后的默认重定向落点（本应用第一个业务页面）
  homePath: '/system/user',
  // 自己当 host：把暴露的 system 业务路由作为本会话动态路由源（frontend 权限模式）
  asyncRouteSource: systemRoutes,
  // standalone 不消费远程路由源
  remoteRouteSources: [],
  dynamicRemotes: [],
  localComponents: {
    // 本地视图 glob（ComponentLoader 数据源；standalone 路由组件已内联函数，无需字符串解析）
    componentGlob: import.meta.glob('./views/**/*.vue'),
    // 布局壳：与 remote 模式一致，使用 @art/app-components/layouts
    layoutComponent: () => import('@art/app-components/layouts')
  }
})
