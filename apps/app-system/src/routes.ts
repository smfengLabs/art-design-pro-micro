/**
 * app-system 路由契约（v2 E1/E2）
 *
 * - systemRoutes：system 域真实业务路由（RouteRecordRaw[]）
 *   · host（frontend 权限模式）：经 MF expose './routes' 由 MenuProcessor 聚合，
 *     组件已内联为可渲染函数，host 原样接受（无 mf:// 字符串解析）；
 *   · standalone：经 bootstrapApp 的 asyncRouteSource 注入本会话 router。
 * - default 导出即候选路由清单（E2 聚合入口）。
 *
 * E1 约定：一级路由 component 为 @art/app-components/layouts 共享壳；
 * 子路由一律 () => import('./views/system/**')；name 统一引用 @art/app-utils 的 RouteName。
 *
 * 开源前大扫除（2026-10-19）：演示性菜单（多级菜单 nested / 阶段一 Hello 演示页）
 * 已随视图物理删除，菜单仅保留 system 域自身业务（用户 / 角色 / 菜单 / 用户中心）。
 *
 * @module app-system/routes
 */
import type { RouteRecordRaw } from 'vue-router'
import { RouteName } from '@art/app-utils'

/** system 域业务路由（host 聚合与 standalone 共用） */
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

/** host 聚合入口（MF expose './routes'：default 导出即候选路由清单） */
export default systemRoutes
