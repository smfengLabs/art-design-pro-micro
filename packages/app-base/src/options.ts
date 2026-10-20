/**
 * bootstrapApp 装配参数（v2 G2）
 *
 * @module app-base/options
 */
import type { Component } from 'vue'
import type { RouteRecordRaw } from 'vue-router'
import type { AppRouteRecord } from '@art/app-utils'
import type { ComponentGlob, RemoteRouteSource } from '@art/app-core'
import type { DynamicRemote } from './remote-hmr'

/** 宿主本地组件装载（ComponentLoader 数据源） */
export interface LocalComponents {
  /** 视图 glob：import.meta.glob('./views/**\/*.vue') */
  componentGlob?: ComponentGlob
  /** 布局组件（菜单路由字符串组件解析时的兜底容器，对应 origin '@/views/index/index.vue'） */
  layoutComponent?: () => Promise<any>
  /** iframe 容器组件（对应 origin '@/views/outside/Iframe.vue'） */
  iframeComponent?: () => Promise<any>
}

export interface AppBootstrapOptions {
  /** 应用名（日志与错误提示） */
  appName?: string
  /** 根组件 */
  App: Component
  /** 静态路由（createHostRouter 初始路由表，兼容 origin 风格 AppRouteRecord 与 vue-router RouteRecordRaw） */
  staticRoutes: Array<RouteRecordRaw | AppRouteRecord>
  /** 应用首页路径（登录后默认重定向落点；为空时回退菜单第一个有效路径） */
  homePath?: string
  /** 本地异步路由源（frontend 权限模式；兼容 origin AppRouteRecord 与 vue-router RouteRecordRaw，v2 G2） */
  asyncRouteSource?: Array<RouteRecordRaw | AppRouteRecord>
  /** 远程 MF 路由源（静态 remote，manifest 按需加载） */
  remoteRouteSources?: RemoteRouteSource[]
  /** 动态 remote 清单（dev 有效：注册 + 运行时 HMR 连接，v2 D3） */
  dynamicRemotes?: DynamicRemote[]
  /** 本地组件装载 */
  localComponents?: LocalComponents
}
