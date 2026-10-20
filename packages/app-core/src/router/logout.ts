import { getRouteRegistry, resetRouteInitState } from './runtime'
import { IframeRouteManager } from './core/IframeRouteManager'
import { useMenuStore } from '../store/modules/menu'

// 从守卫中拆出，避免 user store 反向依赖路由装配面
export function resetRouterState(delay: number): void {
  setTimeout(() => {
    getRouteRegistry()?.unregister()
    IframeRouteManager.getInstance().clear()

    const menuStore = useMenuStore()
    menuStore.removeAllDynamicRoutes()
    menuStore.setMenuList([])

    resetRouteInitState()
  }, delay)
}
