/**
 * 框架无关的路由记录结构
 *
 * app-utils 是零 UI / 零框架依赖的基础层，不能直接引用 vue-router。
 * 该结构与 vue-router 的 RouteRecordRaw 保持必要字段兼容，供菜单、权限、
 * 远程路由源等纯数据场景使用；真正注册到 Router 时由 app-core 做类型收窄。
 */
export interface RouteRecordRaw {
  path: string
  name?: string | symbol
  component?: any
  components?: Record<string, any>
  redirect?: any
  alias?: string | string[]
  children?: RouteRecordRaw[]
  meta?: RouteMeta
  props?: boolean | Record<string, any> | ((to: any) => Record<string, any>)
  beforeEnter?: any
  [key: string]: any
}

/**
 * 路由元数据接口
 * 定义路由的各种配置属性
 */
export interface RouteMeta extends Record<string | number | symbol, unknown> {
  /** 路由标题 */
  title: string
  /** 路由图标 */
  icon?: string
  /** 是否显示徽章 */
  showBadge?: boolean
  /** 文本徽章 */
  showTextBadge?: string
  /** 是否在菜单中隐藏 */
  isHide?: boolean
  /** 是否在标签页中隐藏 */
  isHideTab?: boolean
  /** 外部链接 */
  link?: string
  /** 是否为iframe */
  isIframe?: boolean
  /** 是否缓存 */
  keepAlive?: boolean
  /** 操作权限 */
  authList?: Array<{
    title: string
    authMark: string
  }>
  /** 是否为一级菜单 */
  isFirstLevel?: boolean
  /** 仅有一个子菜单时是否在侧边栏折叠父级目录 */
  collapseSingleChild?: boolean
  /** 角色权限 */
  roles?: string[]
  /** 是否固定标签页 */
  fixedTab?: boolean
  /** 激活菜单路径 */
  activePath?: string
  /** 是否为全屏页面 */
  isFullPage?: boolean
  /** 是否为权限按钮行 */
  isAuthButton?: boolean
  /** 权限标识 */
  authMark?: string
  /** 父级路径 */
  parentPath?: string
}

/**
 * 应用路由记录接口
 * 扩展 Vue Router 的路由记录类型
 */
export interface AppRouteRecord extends Omit<RouteRecordRaw, 'meta' | 'children' | 'component'> {
  id?: number
  /** 菜单所属应用编码（后端菜单按应用隔离时使用） */
  appCode?: string
  meta: RouteMeta
  children?: AppRouteRecord[]
  component?: string | RouteRecordRaw['component'] | (() => Promise<any>)
}
