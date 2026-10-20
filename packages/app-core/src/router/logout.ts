/**
 * 路由登出复位
 *
 * 原实现位于 guards/beforeEach.ts（resetRouterState）；
 * 迁出原因（v2 B3 规则 6）：用户 Store 的登出链路属于 remote 可达闭包，
 * 不得反向触达守卫装配文件，故将复位逻辑收敛到本模块（仅依赖 runtime 与 menu Store）。
 *
 * @module app-core/router/logout
 */
import { getRouteRegistry, resetRouteInitState } from './runtime'
import { IframeRouteManager } from './core/IframeRouteManager'
import { useMenuStore } from '../store/modules/menu'

/**
 * 重置路由相关状态
 */
export function resetRouterState(delay: number): void {
  setTimeout(() => {
    getRouteRegistry()?.unregister()
    IframeRouteManager.getInstance().clear()

    const menuStore = useMenuStore()
    menuStore.removeAllDynamicRoutes()
    menuStore.setMenuList([])

    // 重置路由初始化状态，允许重新登录后再次初始化
    resetRouteInitState()
  }, delay)
}
