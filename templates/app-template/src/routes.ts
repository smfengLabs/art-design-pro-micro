// app-template 业务路由：纯净骨架，仅保留首页
import type { RouteRecordRaw } from 'vue-router'
import { RouteName } from '@art/app-utils'

export const templateRoutes: RouteRecordRaw[] = [
  {
    path: '/template',
    name: RouteName.TEMPLATE,
    component: () => import('@art/app-components/layouts'),
    redirect: '/template/home',
    meta: {
      title: 'App Template',
      icon: 'ri:home-4-line',
      collapseSingleChild: true
    },
    children: [
      {
        path: 'home',
        name: RouteName.TEMPLATE_HOME,
        component: () => import('./views/home/index.vue'),
        meta: {
          title: 'menus.home.title',
          icon: 'ri:home-4-line',
          keepAlive: true
        }
      }
    ]
  }
]

export default templateRoutes
