import type { AppRouteRecord } from '@art/app-utils'
import { useUserStore } from '../../store/modules/user'
import { useAppMode } from '../../hooks/core/useAppMode'
import { fetchGetMenuList } from '@art/app-api'
import {
  getAppCode,
  getAsyncRouteSource,
  getLayoutComponent,
  getRemoteRouteSources,
  isStandaloneApp,
  setRouteNameIndex
} from '../runtime'
import type { RouteNameIndex } from '../runtime'
import { RoutesAlias } from '@art/app-utils'
import { formatMenuTitle } from '../../utils/router'
import { MF_REMOTE_ALIAS_META_KEY, getRemoteRouteAlias } from '../preload'

// 本地 asyncRoutes + 远程 MF 路由源；backend 模式用于构建 routeNameIndex
async function collectRouteCandidates(): Promise<AppRouteRecord[]> {
  const candidates: AppRouteRecord[] = []

  candidates.push(...getAsyncRouteSource())

  const remoteSources = isStandaloneApp() ? [] : getRemoteRouteSources()
  const results = await Promise.allSettled(
    remoteSources.map(async (source) => {
      if (!source.load) return []
      return await source.load()
    })
  )
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      candidates.push(...((result.value || []) as AppRouteRecord[]))
    } else {
      console.error(`[MenuProcessor] 远程路由源加载失败: ${remoteSources[index]?.alias}`, result.reason)
    }
  })

  return candidates
}

// 路由 name 是跨应用组件解析锚点，冲突时保留先注册项
function buildRouteNameIndex(candidates: AppRouteRecord[]): RouteNameIndex {
  const index: RouteNameIndex = new Map()

  const walk = (routes: AppRouteRecord[]): void => {
    routes.forEach((route) => {
      const name = route.name ? String(route.name) : ''
      if (name) {
        if (index.has(name)) {
          console.warn(
            `[MenuProcessor] 路由名称索引重复（保留先注册项）: ${name}（${index.get(name)?.path} ← ${route.path}）`
          )
        } else {
          index.set(name, {
            name,
            path: route.path,
            component: route.component,
            remoteAlias: getRemoteRouteAlias(route)
          })
        }
      }

      if (route.children?.length) {
        walk(route.children)
      }
    })
  }

  walk(candidates)
  return index
}

export class MenuProcessor {
  async getMenuList(): Promise<AppRouteRecord[]> {
    const { isFrontendMode } = useAppMode()

    let menuList: AppRouteRecord[]
    // 独立运行（Standalone）时菜单只来自本应用 asyncRouteSource（systemRoutes），
    // 不消费后端全平台菜单，也不加载任何 host remote 路由源。
    if (isFrontendMode.value || isStandaloneApp()) {
      menuList = await this.processFrontendMenu()
    } else {
      menuList = await this.processBackendMenu()
    }

    this.validateMenuPaths(menuList)

    return this.normalizeMenuPaths(menuList)
  }

  private async processFrontendMenu(): Promise<AppRouteRecord[]> {
    const userStore = useUserStore()
    const roles = userStore.info?.roles

    const candidates = await collectRouteCandidates()

    // 名称索引是组件解析锚点，不是权限清单
    setRouteNameIndex(buildRouteNameIndex(candidates))

    let menuList = candidates
    if (roles && roles.length > 0) {
      menuList = this.filterMenuByRoles(menuList, roles)
    }

    return this.filterEmptyMenus(menuList)
  }

  // 后端菜单的 component 是路由 name：先用全量索引解析，未命中交给本地 glob 兜底
  private async processBackendMenu(): Promise<AppRouteRecord[]> {
    const candidates = await collectRouteCandidates()
    const index = buildRouteNameIndex(candidates)
    setRouteNameIndex(index)

    const rawList = await fetchGetMenuList()
    const appCode = getAppCode()
    const list =
      isStandaloneApp() && appCode ? this.filterMenusByAppCode(rawList, appCode) : rawList
    const resolved = this.resolveComponentsByName(list, index)

    return this.filterEmptyMenus(resolved)
  }

  /**
   * 独立运行（Standalone）时只保留当前应用的菜单。
   * 后端可能返回全平台菜单；显式带 appCode 的节点必须与当前应用一致，
   * 父节点在子节点被过滤为空时一并剔除，避免渲染空目录。
   */
  private filterMenusByAppCode(menuList: AppRouteRecord[], appCode: string): AppRouteRecord[] {
    return menuList.reduce((acc: AppRouteRecord[], item) => {
      if (item.appCode && item.appCode !== appCode) {
        return acc
      }

      const hadChildren = Boolean(item.children?.length)
      const filtered: AppRouteRecord = { ...item }

      if (item.children?.length) {
        filtered.children = this.filterMenusByAppCode(item.children, appCode)
      }

      if (hadChildren && !filtered.children?.length) {
        return acc
      }

      acc.push(filtered)
      return acc
    }, [])
  }

  // 不补 children 键，保留“有 children = 目录”的判别语义
  private resolveComponentsByName(
    menuList: AppRouteRecord[],
    index: RouteNameIndex,
    depth = 0
  ): AppRouteRecord[] {
    return menuList.map((item) => {
      const component = this.resolveComponentByName(item, index)
      const sourceKey = this.getRouteSourceKey(item)
      const remoteAlias = sourceKey ? index.get(sourceKey)?.remoteAlias : undefined
      const resolved: AppRouteRecord = {
        ...item,
        component:
          depth === 0 && item.children?.length && !component
            ? // 顶级目录缺省组件：补应用布局壳（含 <router-view>），保证跨应用子路由正常渲染
              (getLayoutComponent() ?? RoutesAlias.Layout)
            : component,
        // backend 菜单的 meta 来自接口，需要把候选路由上的远程来源标记回填
        ...(remoteAlias
          ? { meta: { ...item.meta, [MF_REMOTE_ALIAS_META_KEY]: remoteAlias } }
          : {})
      }

      if (item.children?.length) {
        resolved.children = this.resolveComponentsByName(item.children, index, depth + 1)
      }

      return resolved
    })
  }

  private resolveComponentByName(
    route: AppRouteRecord,
    index: RouteNameIndex
  ): AppRouteRecord['component'] {
    const component = route.component

    if (component && typeof component !== 'string') {
      return component
    }

    const key = this.getRouteSourceKey(route)
    if (!key) {
      return component
    }

    const hit = index.get(key)
    return hit?.component || component
  }

  private getRouteSourceKey(route: AppRouteRecord): string {
    if (typeof route.component === 'string' && route.component) {
      return route.component
    }
    return route.name ? String(route.name) : ''
  }

  private filterMenuByRoles(menu: AppRouteRecord[], roles: string[]): AppRouteRecord[] {
    return menu.reduce((acc: AppRouteRecord[], item) => {
      const itemRoles = item.meta?.roles
      const hasPermission = !itemRoles || itemRoles.some((role) => roles?.includes(role))

      if (hasPermission) {
        const filteredItem = { ...item }
        if (filteredItem.children?.length) {
          const filteredChildren = this.filterMenuByRoles(filteredItem.children, roles)
          // 子节点全部被角色过滤时，父级目录一并剔除，避免遗留空父级
          if (filteredChildren.length === 0) {
            return acc
          }
          filteredItem.children = filteredChildren
        }
        acc.push(filteredItem)
      }

      return acc
    }, [])
  }

  private filterEmptyMenus(menuList: AppRouteRecord[]): AppRouteRecord[] {
    return menuList.reduce((acc: AppRouteRecord[], item) => {
      // 只有“原本有子节点的目录”才需要做空目录剪枝；
      // 后端叶子节点可能带 children: []，必须按页面节点处理，不能误删。
      const hadChildren = Boolean(item.children?.length)

      if (hadChildren) {
        const filteredChildren = this.filterEmptyMenus(item.children || [])

        // 子节点全部被权限/应用过滤后，父级目录一并删除，避免留下空目录或假可点击节点
        if (filteredChildren.length === 0) {
          return acc
        }

        acc.push({ ...item, children: filteredChildren })
        return acc
      }

      // 叶子节点：外链、iframe、真实页面组件才保留；纯 Layout 空壳直接移除
      if (item.meta?.isIframe === true || item.meta?.link) {
        acc.push(item)
        return acc
      }

      if (item.component && item.component !== '' && item.component !== RoutesAlias.Layout) {
        acc.push(item)
      }

      return acc
    }, [])
  }

  validateMenuList(menuList: AppRouteRecord[]): boolean {
    return Array.isArray(menuList) && menuList.length > 0
  }

  private normalizeMenuPaths(menuList: AppRouteRecord[], parentPath = ''): AppRouteRecord[] {
    return menuList.map((item) => {
      const fullPath = this.buildFullPath(item.path || '', parentPath)

      const children = item.children?.length
        ? this.normalizeMenuPaths(item.children, fullPath)
        : item.children

      const redirect = item.redirect || this.resolveDefaultRedirect(children)

      return {
        ...item,
        path: fullPath,
        redirect,
        children
      }
    })
  }

  private resolveDefaultRedirect(children?: AppRouteRecord[]): string | undefined {
    if (!children?.length) {
      return undefined
    }

    for (const child of children) {
      if (this.isNavigableRoute(child)) {
        return child.path
      }

      const nestedRedirect = this.resolveDefaultRedirect(child.children)
      if (nestedRedirect) {
        return nestedRedirect
      }
    }

    return undefined
  }

  private isNavigableRoute(route: AppRouteRecord): boolean {
    return Boolean(
      route.path &&
        route.path !== '/' &&
        !route.meta?.link &&
        route.meta?.isIframe !== true &&
        route.component &&
        route.component !== ''
    )
  }

  // 非一级菜单 path 不能以 / 开头；外链、iframe 和规范化嵌套路径例外
  private validateMenuPaths(menuList: AppRouteRecord[], parentPath = '', level = 1): void {
    menuList.forEach((route) => {
      const fullPath = this.buildFullPath(route.path || '', parentPath)

      if (!route.children?.length) return

      const parentName = String(route.name || route.path || '未知路由')
      const basePath = fullPath.replace(/\/+$/, '')

      route.children.forEach((child) => {
        const childPath = child.path || ''

        if (this.isValidAbsolutePath(childPath)) return
        if (basePath && childPath.startsWith(`${basePath}/`)) return

        if (childPath.startsWith('/')) {
          this.logPathError(child, childPath, parentName, level)
        }
      })

      this.validateMenuPaths(route.children, fullPath, level + 1)
    })
  }

  private isValidAbsolutePath(path: string): boolean {
    return (
      path.startsWith('http://') ||
      path.startsWith('https://') ||
      path.startsWith('/outside/iframe/')
    )
  }

  private logPathError(
    route: AppRouteRecord,
    path: string,
    parentName: string,
    level: number
  ): void {
    const routeName = String(route.name || path || '未知路由')
    const menuTitle = route.meta?.title || routeName
    const suggestedPath = path.split('/').pop() || path.slice(1)

    console.error(
      `[路由配置错误] 菜单 "${formatMenuTitle(menuTitle)}" (name: ${routeName}, path: ${path}) 配置错误\n` +
        `  位置: ${parentName} > ${routeName}\n` +
        `  问题: ${level + 1}级菜单的 path 不能以 / 开头\n` +
        `  当前配置: path: '${path}'\n` +
        `  应该改为: path: '${suggestedPath}'`
    )
  }

  private buildFullPath(path: string, parentPath: string): string {
    if (!path) return ''

    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path
    }

    if (path.startsWith('/')) {
      return path
    }

    if (parentPath) {
      const cleanParent = parentPath.replace(/\/$/, '')
      const cleanChild = path.replace(/^\//, '')
      return `${cleanParent}/${cleanChild}`
    }

    return `/${path}`
  }
}
