import type { AppRouteRecord } from '@art/app-utils'
import { getRemoteRouteSources } from './runtime'

/**
 * 远程路由来源标记
 *
 * 子应用路由在宿主侧加载后会被打上该标记，菜单悬停时据此识别
 * 当前菜单属于哪个 MF 子应用，并预加载其页面 chunk。
 */
export const MF_REMOTE_ALIAS_META_KEY = '__mfRemoteAlias'

/** 已发起过预加载的组件 loader，避免同一 chunk 被重复请求 */
const preloadedComponentLoaders = new WeakSet<() => Promise<unknown>>()

/** 空闲预加载是否已经调度（含执行中）/ 全部完成 */
let idlePreloadScheduled = false
let idlePreloadCompleted = false
/** 远端失败后的重试时间点，避免持续不可用时每次导航都触发请求 */
let idlePreloadRetryAt = 0

/** 空闲预加载失败后的重试间隔（ms） */
const IDLE_PRELOAD_RETRY_INTERVAL = 30_000

/**
 * 为远程路由追加来源标记（递归处理子路由）
 */
export function markRemoteRouteAlias(
  routes: AppRouteRecord[],
  alias: string
): AppRouteRecord[] {
  return routes.map((route) => {
    const marked: AppRouteRecord = {
      ...route,
      meta: {
        ...route.meta,
        [MF_REMOTE_ALIAS_META_KEY]: alias
      }
    }

    if (route.children?.length) {
      marked.children = markRemoteRouteAlias(route.children, alias)
    }

    return marked
  })
}

/**
 * 读取路由所属的远程应用别名
 */
export function getRemoteRouteAlias(route: AppRouteRecord): string | undefined {
  const alias = route.meta?.[MF_REMOTE_ALIAS_META_KEY]
  return typeof alias === 'string' && alias ? alias : undefined
}

/**
 * 收集路由树上的异步组件 loader
 */
function collectComponentLoaders(
  route: AppRouteRecord,
  loaders: Array<() => Promise<unknown>>
): void {
  if (typeof route.component === 'function') {
    loaders.push(route.component as () => Promise<unknown>)
  }

  if (route.components && typeof route.components === 'object') {
    for (const loader of Object.values(route.components)) {
      if (typeof loader === 'function') {
        loaders.push(loader as () => Promise<unknown>)
      }
    }
  }

  route.children?.forEach((child) => collectComponentLoaders(child, loaders))
}

/**
 * 菜单悬浮预加载
 *
 * 鼠标进入远程应用菜单时立即加载该菜单树下的页面 chunk。加载完成后
 * 浏览器与 Vite 模块缓存已持有模块，真正点击时路由可直接命中缓存。
 */
export function preloadRemoteRoute(route: AppRouteRecord): void {
  if (!getRemoteRouteAlias(route)) return

  const loaders: Array<() => Promise<unknown>> = []
  collectComponentLoaders(route, loaders)

  for (const loader of loaders) {
    if (preloadedComponentLoaders.has(loader)) continue
    preloadedComponentLoaders.add(loader)

    // 静默预加载：失败由真实导航兜底，不能影响当前页面与鼠标交互
    Promise.resolve()
      .then(() => loader())
      .catch((error) => {
        console.debug('[MF] 菜单悬浮预加载失败，已交由实际导航重试：', error)
      })
  }
}

/**
 * 调度远程应用空闲预加载
 *
 * 用户已进入认证后的主应用时调用。通过 requestIdleCallback 在所有子应用
 * 注册源上拉取 manifest / remoteEntry / routes，避开首屏关键路径。
 */
export function scheduleRemoteIdlePreload(): void {
  if (idlePreloadScheduled || idlePreloadCompleted) return
  if (Date.now() < idlePreloadRetryAt) return

  const sources = getRemoteRouteSources().filter(
    (source) => typeof source.preload === 'function'
  )
  if (sources.length === 0) return

  idlePreloadScheduled = true

  const run = (): void => {
    const tasks = sources.map((source) =>
      Promise.resolve()
        .then(() => source.preload?.())
        .then(() => true)
        .catch((error) => {
          console.debug(`[MF] 子应用空闲预加载失败（${source.alias}）：`, error)
          return false
        })
    )

    // 只有全部成功才视为完成；失败项保留后续导航重试的机会
    void Promise.all(tasks)
      .then((results) => {
        idlePreloadCompleted = results.every(Boolean)
        if (!idlePreloadCompleted) {
          idlePreloadRetryAt = Date.now() + IDLE_PRELOAD_RETRY_INTERVAL
        }
      })
      .finally(() => {
        idlePreloadScheduled = false
      })
  }

  const globalWindow = (globalThis as { window?: Window }).window
  if (globalWindow && 'requestIdleCallback' in globalWindow) {
    globalWindow.requestIdleCallback(run, { timeout: 2500 })
    return
  }

  // Safari / 旧版浏览器降级：延后到主线程空闲窗口
  setTimeout(run, 1200)
}
