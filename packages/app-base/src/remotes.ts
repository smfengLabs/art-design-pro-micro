/**
 * 静态远程路由源工厂
 *
 * 与 @art/app-config/vite/remotes.ts 注册表同源（构建期经 define 注入 __MF_REMOTE_REGISTRY__）；
 * 运行期将 { alias, manifestUrl, moduleId } 转为 app-core 可消费的 RemoteRouteSource。
 *
 * 稳定性契约（dev 抖动防护）：
 * - 路由源加载：3s 超时 + 1 次重试。远端 dev server 重新预构建依赖期间请求可能长时间
 *   挂起（不 settle），此处转为明确错误，经 MenuProcessor 的 Promise.allSettled 降级隔离，
 *   不会让路由守卫的全屏 loading 无限等待；
 * - 远端路由组件加载函数：包装同阈值超时。chunk 挂起时中止导航并走 router.onError 兜底
 *   （app-core 侧重置 loading / NProgress），避免「转圈卡死」。
 *
 * @module app-base/remotes
 */
import { loadRemoteFromManifest } from 'vite-plugin-federation/runtime'
import type { AppRouteRecord } from '@art/app-utils'
import type { RemoteRouteSource } from '@art/app-core'

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

/** 延时工具 */
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
