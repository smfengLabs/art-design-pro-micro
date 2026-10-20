// app-system 业务路由，host 聚合与 standalone 共用
import type { RouteRecordRaw } from 'vue-router'
import { RouteName } from '@art/app-utils'

export const systemRoutes: RouteRecordRaw[] = [
  {
    path: '/system',
    name: RouteName.SYSTEM,
    component: () => import('@art/app-components/layouts'),
    redirect: '/system/user',
    meta: {
      title: 'menus.system.title',
      icon: 'ri:user-3-line',
      roles: ['R_SUPER', 'R_ADMIN']
    },
    children: [
      {
        path: 'user',
        name: RouteName.SYSTEM_USER,
        component: () => import('./views/system/user/index.vue'),
        meta: {
          title: 'menus.system.user',
          icon: 'ri:user-line',
          keepAlive: true,
          roles: ['R_SUPER', 'R_ADMIN']
        }
      },
      {
        path: 'role',
        name: RouteName.SYSTEM_ROLE,
        component: () => import('./views/system/role/index.vue'),
        meta: {
          title: 'menus.system.role',
          icon: 'ri:user-settings-line',
          keepAlive: true,
          roles: ['R_SUPER']
        }
      },
      {
        path: 'user-center',
        name: RouteName.SYSTEM_USER_CENTER,
        component: () => import('./views/system/user-center/index.vue'),
        meta: {
          title: 'menus.system.userCenter',
          icon: 'ri:user-line',
          isHide: true,
          keepAlive: true,
          isHideTab: true
        }
      },
      {
        path: 'menu',
        name: RouteName.SYSTEM_MENU,
        component: () => import('./views/system/menu/index.vue'),
        meta: {
          title: 'menus.system.menu',
          icon: 'ri:menu-line',
          keepAlive: true,
          roles: ['R_SUPER'],
          authList: [
            { title: '新增', authMark: 'add' },
            { title: '编辑', authMark: 'edit' },
            { title: '删除', authMark: 'delete' }
          ]
        }
      }
    ]
  }
]

export default systemRoutes