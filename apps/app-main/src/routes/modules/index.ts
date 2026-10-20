import { AppRouteRecord } from '@art/app-utils'
import { dashboardRoutes } from './dashboard'
// 开源前大扫除（2026-10-19）：模板中心/组件中心/功能示例/文章管理/结果页/异常菜单页/
// 运维管理/帮助外链等演示模块连同视图物理删除；宿主菜单仅保留「仪表盘」（本地默认首页）
// 与远程 app-system 提供的「系统管理」域。
// 阶段二：system 域（视图/API/路由）整体位于 app-system，经 MF './routes' 聚合，宿主不再持有 system 配置。

/**
 * 导出所有模块化路由
 */
export const routeModules: AppRouteRecord[] = [dashboardRoutes]
