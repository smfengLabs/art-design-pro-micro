import { loadRemoteFromManifest } from 'vite-plugin-federation/runtime'
import type { AppRouteRecord } from '@art/app-utils'
import type { RemoteRouteSource } from '@art/app-core'

// dev server 重预构建时远端请求可能挂起；超时 + 一次重试，避免守卫 loading 无限等待
/** 单个远程加载（模块/chunk）的超时阈值（ms） */
const REMOTE_LOAD_TIMEOUT = 3000
/** 路由源加载超时后的重试次数（覆盖 dev server 重优化窗口的瞬态阻塞） */
const REMOTE_SOURCE_RETRIES = 1
/** 重试等待间隔（ms） */
const REMOTE_RETRY_DELAY = 600

/** 构建期 __MF_REMOTE_REGISTRY__ 的元素形态 */
export interface RemoteRegistryEntry {
  alias: string
  manifestUrl: string
  moduleId?: string
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 为异步任务追加超时保护
 *
 * 超时拒绝并携带上下文（remote alias + 触发点），而不是让调用方无限等待；
 * 任务本身仍在后台执行，其后续结算不影响已结算的外层 Promise。
 */
function withTimeout<T>(
  task: () => Promise<T>,
  label: string,
  timeout = REMOTE_LOAD_TIMEOUT
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new Error(
          `${label} 超时（>${timeout}ms）：远端应用不可达或 dev server 正在重新预构建依赖；` +
            '本次加载已中止（可刷新页面重试）'
        )
      )
    }, timeout)

    task().then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      }
    )
  })
}

/**
 * 包装远端路由的组件加载函数（含命名视图与子路由递归）
 *
 * 远端路由组件的 () => import(...) 由远端 dev server 供给，chunk 请求挂起时
 * vue-router 的导航 Promise 永不结算 → afterEach 不触发 → 全屏 loading 残留。
 * 包装后超时即拒绝，导航中止并进入 router.onError 兜底链路。
 */
function wrapRouteComponents(routes: AppRouteRecord[], alias: string): AppRouteRecord[] {
  return routes.map((route) => {
    const wrapped = { ...route } as AppRouteRecord & {
      components?: Record<string, unknown>
    }

    if (typeof wrapped.component === 'function') {
      const loader = wrapped.component as unknown as () => Promise<unknown>
      wrapped.component = () =>
        withTimeout(loader, `[MF] ${alias} 路由组件加载（${String(wrapped.path ?? '')}）`)
    }

    if (wrapped.components && typeof wrapped.components === 'object') {
      const components: Record<string, unknown> = { ...wrapped.components }
      for (const name of Object.keys(components)) {
        const loader = components[name]
        if (typeof loader === 'function') {
          components[name] = () =>
            withTimeout(
              loader as () => Promise<unknown>,
              `[MF] ${alias} 路由组件加载（${String(wrapped.path ?? '')}#${name}）`
            )
        }
      }
      wrapped.components = components as unknown as typeof wrapped.components
    }

    if (wrapped.children?.length) {
      wrapped.children = wrapRouteComponents(wrapped.children, alias)
    }

    return wrapped
  })
}

/**
 * 将远程注册表转为路由源
 *
 * load 失败（网络/manifest 404/超时）由 MenuProcessor 侧 Promise.allSettled 隔离，不阻断宿主。
 */
export function createRemoteRouteSources(registry: RemoteRegistryEntry[]): RemoteRouteSource[] {
  return (registry || []).map((entry) => ({
    alias: entry.alias,
    load: async (): Promise<AppRouteRecord[]> => {
      const moduleId = entry.moduleId ?? `${entry.alias}/routes`
      const label = `[MF] 远程路由源加载（${entry.alias} ← ${entry.manifestUrl}）`

      let lastError: unknown
      for (let attempt = 0; attempt <= REMOTE_SOURCE_RETRIES; attempt++) {
        try {
          const remoteModule = await withTimeout(
            () => loadRemoteFromManifest(moduleId, entry.manifestUrl, { cacheTtl: 30_000 }),
            label
          )
          // 兼容「expose 默认导出」与「直接返回值」两种形态
          const routes = ((remoteModule as any)?.default ?? remoteModule) as AppRouteRecord[]
          return Array.isArray(routes) ? wrapRouteComponents(routes, entry.alias) : routes
        } catch (error) {
          lastError = error
          if (attempt < REMOTE_SOURCE_RETRIES) {
            console.warn(`${label} 第 ${attempt + 1} 次失败，${REMOTE_RETRY_DELAY}ms 后重试：`, error)
            await delay(REMOTE_RETRY_DELAY)
          }
        }
      }

      throw lastError instanceof Error ? lastError : new Error(String(lastError))
    }
  }))
}
