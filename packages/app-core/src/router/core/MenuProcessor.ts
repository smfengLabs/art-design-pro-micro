/**
 * 菜单处理器
 *
 * 负责菜单数据的获取、过滤和处理
 *
 * @module router/core/MenuProcessor
 * @author Art Design Pro Team
 */

import type { AppRouteRecord } from '@art/app-utils'
import { useUserStore } from '../../store/modules/user'
import { useAppMode } from '../../hooks/core/useAppMode'
import { fetchGetMenuList } from '@art/app-api'
import {
  getAsyncRouteSource,
  getLayoutComponent,
  getRemoteRouteSources,
  setRouteNameIndex
} from '../runtime'
import type { RouteNameIndex } from '../runtime'
import { RoutesAlias } from '@art/app-utils'
import { formatMenuTitle } from '../../utils/router'

/**
 * 采集候选路由（E2）：
 * - 本地 asyncRoutes 源（host 注入）
 * - 远程 MF 路由源（manifest 按需加载，单域失败仅告警隔离）
 *
 * frontend 模式：候选路由经角色过滤后直接生成菜单；
 * backend 模式：候选路由用于构建 routeNameIndex（后端菜单组件解析锚点，见 processBackendMenu）。
 */
async function collectRouteCandidates(): Promise<AppRouteRecord[]> {
  const candidates: AppRouteRecord[] = []

  // 本地异步路由源（host 装配期注入，含 app 自有与后续远程并入的静态路由）
  candidates.push(...getAsyncRouteSource())

  const remoteSources = getRemoteRouteSources()
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

/**
 * 构建全局路由名称索引（E3 契约：路由 name 是全链路唯一锚点）
 *
 * 索引 = 本地 asyncRoutes 的 name 表 ∪ 各 remote ./routes 的 name 表（整树扁平化）。
 * backend 模式据此把后端菜单的 component 字符串（= 路由 name）解析为真实组件：
 * - 远端路由：加载函数已随 MF 模块内联（等价 () => import('远端组件')），跨应用直接可挂载；
 * - 本地路由：字符串组件路径原样带回，由 ComponentLoader 本地 glob 解析。
 *
 * 命名冲突保留先注册项（本地源在远端源之前），并告警提示契约违规。
 */
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
          index.set(name, { name, path: route.path, component: route.component })
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
  /**
   * 获取菜单数据
   */
  async getMenuList(): Promise<AppRouteRecord[]> {
    const { isFrontendMode } = useAppMode()

    let menuList: AppRouteRecord[]
    if (isFrontendMode.value) {
      menuList = await this.processFrontendMenu()
    } else {
      menuList = await this.processBackendMenu()
    }

    // 在规范化路径之前，验证原始路径配置
    this.validateMenuPaths(menuList)

    // 规范化路径（将相对路径转换为完整路径）
    return this.normalizeMenuPaths(menuList)
  }

  /**
   * 处理前端控制模式的菜单
   */
  private async processFrontendMenu(): Promise<AppRouteRecord[]> {
    const userStore = useUserStore()
    const roles = userStore.info?.roles

    const candidates = await collectRouteCandidates()

    // 装配全局路由名称索引（本地 + 远端，未过滤全量）：
    // 索引是组件解析锚点而非权限清单，与权限模式无关（backend 分支及后续消费统一复用）
    setRouteNameIndex(buildRouteNameIndex(candidates))

    // 根据角色过滤菜单
    let menuList = candidates
    if (roles && roles.length > 0) {
      menuList = this.filterMenuByRoles(menuList, roles)
    }

    return this.filterEmptyMenus(menuList)
  }

  /**
   * 处理后端控制模式的菜单
   *
   * 跨应用嵌套挂载契约（E2/E3）：
   * 1. 主动拉取全部已注册路由源（本地 asyncRoutes ∪ 各 remote ./routes），
   *    构建全局 routeNameIndex（不预先假定菜单属于哪个应用）；
   * 2. 后端菜单 component 字段为字符串（= 路由 name）时按索引解析：
   *    命中远端路由 → 用内联组件加载函数替换（跨应用跨级嵌套亦可直接挂载）；
   *    未命中 → 保留原值，交由 ComponentLoader 本地 glob 兜底（仍失败渲染占位组件，链路不崩）；
   * 3. 树形结构完全尊重后端下发（如 /dashboard 下挂 app-article 的 ArticleStats 子路由），
   *    路径归一化与路由注册由 normalizeMenuPaths / RouteRegistry 后续完成。
   */
  private async processBackendMenu(): Promise<AppRouteRecord[]> {
    // 1. 采集候选路由（本地 + 远程）并写入全局名称索引
    const candidates = await collectRouteCandidates()
    const index = buildRouteNameIndex(candidates)
    setRouteNameIndex(index)

    // 2. 拉取后端菜单树（appCode 由请求拦截器注入：独立端只拿到本应用局部菜单）
    const list = await fetchGetMenuList()

    // 3. 按名称索引解析组件（含跨应用嵌套节点）
    const resolved = this.resolveComponentsByName(list, index)

    return this.filterEmptyMenus(resolved)
  }

  /**
   * 递归解析后端菜单树的组件字段
   *
   * 保持原对象键集：不显式为叶节点补 children 键，
   * 避免破坏 filterEmptyMenus 对「带 children 键 = 目录菜单」的判别语义。
   */
  private resolveComponentsByName(
    menuList: AppRouteRecord[],
    index: RouteNameIndex,
    depth = 0
  ): AppRouteRecord[] {
    return menuList.map((item) => {
      const component = this.resolveComponentByName(item, index)
      const resolved: AppRouteRecord = {
        ...item,
        component:
          depth === 0 && item.children?.length && !component
            ? // 顶级目录缺省组件：补应用布局壳（含 <router-view>），保证跨应用子路由正常渲染
              (getLayoutComponent() ?? RoutesAlias.Layout)
            : component
      }

      if (item.children?.length) {
        resolved.children = this.resolveComponentsByName(item.children, index, depth + 1)
      }

      return resolved
    })
  }

  /**
   * 解析单个节点的组件字段（E3：后端 component 字符串 = 路由 name）
   *
   * - 命中索引且索引项带组件 → 用其替换（远端 = 内联加载函数 / 本地 = 组件路径字符串）
   * - component 缺省但有 name 的节点同样按 name 解析（backend 精简目录/叶节点常见形态）
   * - 已是非字符串组件或未命中 → 原样保留（ComponentLoader 本地 glob 兜底）
   */
  private resolveComponentByName(
    route: AppRouteRecord,
    index: RouteNameIndex
  ): AppRouteRecord['component'] {
    const component = route.component

    // 已是组件对象/加载函数（非后端 JSON 形态）→ 原样保留
    if (component && typeof component !== 'string') {
      return component
    }

    const key =
      typeof component === 'string' && component
        ? component
        : route.name
          ? String(route.name)
          : ''

    if (!key) {
      return component
    }

    const hit = index.get(key)
    return hit?.component || component
  }

  /**
   * 根据角色过滤菜单
   */
  private filterMenuByRoles(menu: AppRouteRecord[], roles: string[]): AppRouteRecord[] {
    return menu.reduce((acc: AppRouteRecord[], item) => {
      const itemRoles = item.meta?.roles
      const hasPermission = !itemRoles || itemRoles.some((role) => roles?.includes(role))

      if (hasPermission) {
        const filteredItem = { ...item }
        if (filteredItem.children?.length) {
          filteredItem.children = this.filterMenuByRoles(filteredItem.children, roles)
        }
        acc.push(filteredItem)
      }

      return acc
    }, [])
  }

  /**
   * 递归过滤空菜单项
   */
  private filterEmptyMenus(menuList: AppRouteRecord[]): AppRouteRecord[] {
    return menuList
      .map((item) => {
        // 如果有子菜单，先递归过滤子菜单
        if (item.children && item.children.length > 0) {
          const filteredChildren = this.filterEmptyMenus(item.children)
          return {
            ...item,
            children: filteredChildren
          }
        }
        return item
      })
      .filter((item) => {
        // 如果定义了 children 属性（即使是空数组），说明这是一个目录菜单，应该保留
        if ('children' in item) {
          return true
        }

        // 如果有外链或 iframe，保留
        if (item.meta?.isIframe === true || item.meta?.link) {
          return true
        }

        // 如果有有效的 component，保留
        if (item.component && item.component !== '' && item.component !== RoutesAlias.Layout) {
          return true
        }

        // 其他情况过滤掉
        return false
      })
  }

  /**
   * 验证菜单列表是否有效
   */
  validateMenuList(menuList: AppRouteRecord[]): boolean {
    return Array.isArray(menuList) && menuList.length > 0
  }

  /**
   * 规范化菜单路径
   * 将相对路径转换为完整路径，确保菜单跳转正确
   */
  private normalizeMenuPaths(menuList: AppRouteRecord[], parentPath = ''): AppRouteRecord[] {
    return menuList.map((item) => {
      // 构建完整路径
      const fullPath = this.buildFullPath(item.path || '', parentPath)

      // 递归处理子菜单
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

  /**
   * 为目录型菜单推导默认跳转地址
   */
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

  /**
   * 判断子路由是否可以作为默认落点
   */
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

  /**
   * 验证菜单路径配置
   *
   * 规则：非一级菜单的 path 不允许以 / 开头，以下情形豁免：
   * - 外部链接 / iframe 路由（历史豁免）
   * - 规范化后的完整嵌套路径（backend 契约：父 /dashboard、子 /dashboard/article-stats）：
   *   子路径以父完整路径为前缀，vue-router 视其为 root path 但组件仍嵌套渲染
   */
  private validateMenuPaths(menuList: AppRouteRecord[], parentPath = '', level = 1): void {
    menuList.forEach((route) => {
      const fullPath = this.buildFullPath(route.path || '', parentPath)

      if (!route.children?.length) return

      const parentName = String(route.name || route.path || '未知路由')
      const basePath = fullPath.replace(/\/+$/, '')

      route.children.forEach((child) => {
        const childPath = child.path || ''

        // 跳过合法的绝对路径：外部链接 / iframe / 规范化嵌套路径
        if (this.isValidAbsolutePath(childPath)) return
        if (basePath && childPath.startsWith(`${basePath}/`)) return

        // 检测非法的绝对路径
        if (childPath.startsWith('/')) {
          this.logPathError(child, childPath, parentName, level)
        }
      })

      // 递归检查更深层级的子路由
      this.validateMenuPaths(route.children, fullPath, level + 1)
    })
  }

  /**
   * 判断是否为合法的绝对路径
   */
  private isValidAbsolutePath(path: string): boolean {
    return (
      path.startsWith('http://') ||
      path.startsWith('https://') ||
      path.startsWith('/outside/iframe/')
    )
  }

  /**
   * 输出路径配置错误日志
   */
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

  /**
   * 构建完整路径
   */
  private buildFullPath(path: string, parentPath: string): string {
    if (!path) return ''

    // 外部链接直接返回
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path
    }

    // 如果已经是绝对路径，直接返回
    if (path.startsWith('/')) {
      return path
    }

    // 拼接父路径和当前路径
    if (parentPath) {
      // 移除父路径末尾的斜杠，移除子路径开头的斜杠，然后拼接
      const cleanParent = parentPath.replace(/\/$/, '')
      const cleanChild = path.replace(/^\//, '')
      return `${cleanParent}/${cleanChild}`
    }

    // 没有父路径，添加前导斜杠
    return `/${path}`
  }
}
