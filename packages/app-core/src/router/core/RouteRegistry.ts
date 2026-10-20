import type { Router, RouteRecordRaw } from 'vue-router'
import type { AppRouteRecord } from '@art/app-utils'
import { ComponentLoader } from './ComponentLoader'
import { RouteValidator } from './RouteValidator'
import { RouteTransformer } from './RouteTransformer'

export class RouteRegistry {
  private router: Router
  private componentLoader: ComponentLoader
  private validator: RouteValidator
  private transformer: RouteTransformer
  private removeRouteFns: (() => void)[] = []
  private registered = false

  constructor(router: Router) {
    this.router = router
    this.componentLoader = new ComponentLoader()
    this.validator = new RouteValidator()
    this.transformer = new RouteTransformer(this.componentLoader)
  }

  /**
   * 注册动态路由
   *
   * 支持跨应用嵌套挂载（backend 模式）：
   * - 顶级路由未注册 → addRoute 整棵合并后的树（子节点可含远端组件，原样消化）；
   * - 顶级路由已存在（本地先注册 / 增量装配场景）→ 其 children 增量挂载为已注册父级的子路由
   *   （router.addRoute(parentName, child)，深层递归合并），移除函数统一纳入 removeRouteFns。
   */
  register(menuList: AppRouteRecord[]): void {
    if (this.registered) {
      console.warn('[RouteRegistry] 路由已注册，跳过重复注册')
      return
    }

    const validationResult = this.validator.validate(menuList)
    if (!validationResult.valid) {
      throw new Error(`路由配置验证失败: ${validationResult.errors.join(', ')}`)
    }

    const removeRouteFns: (() => void)[] = []

    menuList.forEach((route) => {
      const routeName = route.name ? String(route.name) : ''

      // 匿名顶级路由无法去重与被引用，保持原行为：跳过
      if (!routeName) return

      if (this.router.hasRoute(routeName)) {
        // 父路由已注册：子路由作为 children 动态追加（跨应用嵌套挂载 / 增量装配）
        this.appendChildren(route.children || [], routeName, removeRouteFns)
        return
      }

      const routeConfig = this.transformer.transform(route)
      const removeRouteFn = this.router.addRoute(routeConfig as RouteRecordRaw)
      removeRouteFns.push(removeRouteFn)
    })

    this.removeRouteFns = removeRouteFns
    this.registered = true
  }

  /**
   * 将子路由树增量挂载到已注册的父路由下
   *
   * - 子路由未注册 → transform（depth >= 1，不做 Layout 包裹）后 addRoute(parentName, cfg)；
   * - 子路由已注册 → 跳过该节点、继续向更深层合并（幂等：重复装配不产生重复路由）。
   */
  private appendChildren(
    children: AppRouteRecord[],
    parentName: string,
    removeRouteFns: (() => void)[]
  ): void {
    children.forEach((child) => {
      const childName = child.name ? String(child.name) : ''

      if (childName && this.router.hasRoute(childName)) {
        this.appendChildren(child.children || [], childName, removeRouteFns)
        return
      }

      const childConfig = this.transformer.transform(child, 1)
      const removeRouteFn = this.router.addRoute(parentName, childConfig as RouteRecordRaw)
      removeRouteFns.push(removeRouteFn)
    })
  }

  /**
   * 移除所有动态路由
   */
  unregister(): void {
    this.removeRouteFns.forEach((fn) => fn())
    this.removeRouteFns = []
    this.registered = false
  }

  /**
   * 检查是否已注册
   */
  isRegistered(): boolean {
    return this.registered
  }

  /**
   * 获取移除函数列表（用于 store 管理）
   */
  getRemoveRouteFns(): (() => void)[] {
    return this.removeRouteFns
  }

  /**
   * 标记为已注册（用于错误处理场景，避免重复请求）
   */
  markAsRegistered(): void {
    this.registered = true
  }
}
