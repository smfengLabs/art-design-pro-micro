import type { App } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { createPersistedState } from 'pinia-plugin-persistedstate'
import { StorageKeyManager } from '../utils/storage/storage-key-manager'

/**
 * 全仓库唯一的 Pinia 实例。
 *
 * 约束：`createPinia()` 只允许在此处调用一次；apps / packages 一律经
 * `@art/app-core/bootstrap` 取 `pinia`，不得自行创建。多实例或未安装时，
 * 组件/守卫中的 `useStore()` 会拿到 undefined 的 pinia，生产环境直接抛
 * `Cannot read properties of undefined (reading '_s')`。
 */
export const pinia = createPinia()

/** 兼容旧命名：与 pinia 为同一实例，禁止据此再创建新实例 */
export const store = pinia

const storageKeyManager = new StorageKeyManager()

store.use(
  createPersistedState({
    key: (storeId: string) => storageKeyManager.getStorageKey(storeId),
    storage: localStorage,
    serializer: {
      serialize: JSON.stringify,
      deserialize: JSON.parse
    }
  })
)

/**
 * 初始化 Store
 */
export function initStore(app: App<Element>): void {
  app.use(pinia)
  // app.use 内部已设置 activePinia；此处显式兜底，保证路由守卫、HTTP 回调等
  // 非组件上下文调用 useStore() 时同样能命中唯一实例。
  setActivePinia(pinia)
}
