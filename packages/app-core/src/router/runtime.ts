import type { Router, RouteRecordRaw } from 'vue-router'
import type { AppRouteRecord } from '@art/app-utils'

/**
 * 路由注册器最小结构化接口
 *
 * 不引入 core/RouteRegistry 实体类型：runtime 是零内部依赖叶子模块，
 * 而 RouteRegistry → ComponentLoader → runtime 已构成单向链，
 * 反向类型引用会形成环（depcruise no-circular）。
 */
export interface RouteRegistryLike {
  isRegistered(): boolean
  register(menuList: AppRouteRecord[]): void
  getRemoveRouteFns(): (() => void)[]
  unregister(): void
}

/** 本地视图 glob 类型（import.meta.glob 产物） */
export type ComponentGlob = Record<string, () => Promise<any>>

/** 远程路由源（manifest 声明，按需加载） */
export interface RemoteRouteSource {
  alias: string
  load?: () => Promise<AppRouteRecord[]>
}

// 跨应用共享的路由运行时；remote 不直接引用宿主 router 单例
let activeRouter: Router | null = null
let staticRoutes: Array<RouteRecordRaw | AppRouteRecord> = []
let asyncRouteSource: Array<RouteRecordRaw | AppRouteRecord> = []
let remoteRouteSources: RemoteRouteSource[] = []
let routeRegistry: RouteRegistryLike | null = null
let routeInitFailed = false
let routeInitInProgress = false
let componentGlob: ComponentGlob = {}
let layoutComponent: (() => Promise<any>) | undefined
let iframeComponent: (() => Promise<any>) | undefined
let appCode = ''
let standaloneApp = false

/** 注入当前应用身份与运行形态（bootstrapApp 装配期调用） */
export function setAppScope(code: string, standalone: boolean): void {
  appCode = code || ''
  standaloneApp = standalone === true
}

/** 当前应用编码（VITE_APP_CODE 或 bootstrapApp 显式配置） */
export function getAppCode(): string {
  return appCode
}

/** 是否为子应用独立运行（Standalone）模式 */
export function isStandaloneApp(): boolean {
  return standaloneApp
}

/**
 * 首页路径（登录后默认重定向的落点）
 *
 * 由 bootstrapApp 按应用注入：宿主 app-main 注入 '/dashboard/console'、
 * 子应用 app-system 注入 '/system/user'；未注入（空串）时回退「菜单第一个有效路径」动态推导
 * （见 store/modules/menu 的 setMenuList）。
 */
let homePagePath = ''

/** 注入应用首页路径（bootstrapApp 装配期调用） */
export function setHomePagePath(path: string): void {
  homePagePath = path || ''
}

/** 读取应用首页路径（返回 '' 表示未配置，消费方回退菜单推导） */
export function getHomePagePath(): string {
  return homePagePath
}

export function setActiveRouter(router: Router): void {
  activeRouter = router
}

export function getActiveRouter(): Router {
  if (!activeRouter) {
    throw new Error('[app-core] 路由尚未初始化：请在 bootstrapApp 中先调用 createHostRouter()')
  }
  return activeRouter
}

export function setStaticRoutes(routes: Array<RouteRecordRaw | AppRouteRecord>): void {
  staticRoutes = routes || []
}

export function getStaticRoutes(): Array<RouteRecordRaw | AppRouteRecord> {
  return staticRoutes
}

export function setAsyncRouteSource(source: Array<RouteRecordRaw | AppRouteRecord>): void {
  asyncRouteSource = source || []
}

export function getAsyncRouteSource(): AppRouteRecord[] {
  // 运行时记录同构：MenuProcessor 按 AppRouteRecord 消费（E1 契约下 remote 数组为 RouteRecordRaw）
  return asyncRouteSource as AppRouteRecord[]
}

export function setRemoteRouteSources(sources: RemoteRouteSource[]): void {
  remoteRouteSources = sources || []
}

export function getRemoteRouteSources(): RemoteRouteSource[] {
  return remoteRouteSources
}


/**
 * 路由名称索引条目
 *
 * 摘取自候选路由（本地 asyncRoutes ∪ 各 remote ./routes）的关键字段：
 * backend 模式下后端菜单的 component 字段 = 路由 name，凭本索引导出真实组件
 * （remote 路由组件已内联为加载函数，等价 () => import('远端组件')）。
 */
export interface RouteNameIndexEntry {
  name: string
  path?: string
  component?: AppRouteRecord['component']
}

/** 全局路由名称索引：name → 路由摘要（MenuProcessor 装配菜单前全量替换） */
export type RouteNameIndex = Map<string, RouteNameIndexEntry>

let routeNameIndex: RouteNameIndex = new Map()

/** 写入全局路由名称索引（MenuProcessor 每次装配菜单前全量替换，不做增量合并） */
export function setRouteNameIndex(index: RouteNameIndex): void {
  routeNameIndex = index || new Map()
}

/** 读取全局路由名称索引（跨应用嵌套挂载解析的公共读面） */
export function getRouteNameIndex(): RouteNameIndex {
  return routeNameIndex
}

export function setRouteRegistry(registry: RouteRegistryLike): void {
  routeRegistry = registry
}

export function getRouteRegistry(): RouteRegistryLike | null {
  return routeRegistry
}

export function isRouteInitFailed(): boolean {
  return routeInitFailed
}

export function markRouteInitFailed(): void {
  routeInitFailed = true
  routeInitInProgress = false
}

export function isRouteInitInProgress(): boolean {
  return routeInitInProgress
}

export function setRouteInitInProgress(value: boolean): void {
  routeInitInProgress = value
}

export function resetRouteInitState(): void {
  routeInitFailed = false
  routeInitInProgress = false
}

export function setComponentGlob(glob: ComponentGlob): void {
  componentGlob = glob || {}
}

export function getComponentGlob(): ComponentGlob {
  return componentGlob
}

export function setLayoutComponent(loader: () => Promise<any>): void {
  layoutComponent = loader
}

export function getLayoutComponent(): (() => Promise<any>) | undefined {
  return layoutComponent
}

export function setIframeComponent(loader: () => Promise<any>): void {
  iframeComponent = loader
}

export function getIframeComponent(): (() => Promise<any>) | undefined {
  return iframeComponent
}
