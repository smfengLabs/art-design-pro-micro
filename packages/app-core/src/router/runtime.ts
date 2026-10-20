/**
 * 路由运行时容器（单例桥）
 *
 * 设计动机（v2 B3 规则 6）：remote（app-system）的可达闭包不得触达宿主路由单例文件
 * （router/index.ts）与守卫装配文件，否则 remote 只要 import @art/app-core
 * 就会把宿主路由装配依赖一并拉进依赖图，破坏跨应用独立性。
 *
 * 因此：
 * - 所有路由单例状态集中在 runtime（零内部依赖的叶子模块）
 * - 宿主在 bootstrapApp 中调用 createHostRouter() 完成注册
 * - 跨层消费统一 getActiveRouter() / getStaticRoutes() 等访问器
 *
 * @module app-core/router/runtime
 */
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

// ── 路由单例 ──
export function setActiveRouter(router: Router): void {
  activeRouter = router
}

export function getActiveRouter(): Router {
  if (!activeRouter) {
    throw new Error('[app-core] 路由尚未初始化：请在 bootstrapApp 中先调用 createHostRouter()')
  }
  return activeRouter
}

// ── 静态路由 ──
export function setStaticRoutes(routes: Array<RouteRecordRaw | AppRouteRecord>): void {
  staticRoutes = routes || []
}

export function getStaticRoutes(): Array<RouteRecordRaw | AppRouteRecord> {
  return staticRoutes
}

// ── 异步路由源（本地） ──
export function setAsyncRouteSource(source: Array<RouteRecordRaw | AppRouteRecord>): void {
  asyncRouteSource = source || []
}

export function getAsyncRouteSource(): AppRouteRecord[] {
  // 运行时记录同构：MenuProcessor 按 AppRouteRecord 消费（E1 契约下 remote 数组为 RouteRecordRaw）
  return asyncRouteSource as AppRouteRecord[]
}

// ── 远程路由源（MF） ──
export function setRemoteRouteSources(sources: RemoteRouteSource[]): void {
  remoteRouteSources = sources || []
}

export function getRemoteRouteSources(): RemoteRouteSource[] {
  return remoteRouteSources
}

// ── 路由名称索引（backend 模式跨应用组件解析锚点） ──

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

// ── 路由注册器 ──
export function setRouteRegistry(registry: RouteRegistryLike): void {
  routeRegistry = registry
}

export function getRouteRegistry(): RouteRegistryLike | null {
  return routeRegistry
}

// ── 路由初始化状态标记 ──
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

// ── 组件加载器注入（host 本地视图） ──
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
