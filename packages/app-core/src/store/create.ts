/**
 * Pinia Store 实例模块（原 store/index.ts）
 *
 * 提供全局状态管理的初始化机制：
 *
 * - Pinia Store 实例创建
 * - 持久化插件配置（pinia-plugin-persistedstate）
 * - 版本化存储键管理，自动迁移（StorageKeyManager）
 * - LocalStorage 切换底座
 *
 * 持久化键格式：sys-v{version}-{storeId}
 *
 * @module store/create
 */
import type { App } from 'vue'
import { createPinia } from 'pinia'
import { createPersistedState } from 'pinia-plugin-persistedstate'
import { StorageKeyManager } from '../utils/storage/storage-key-manager'

export const store = createPinia()

// 创建存储键管理器实例
const storageKeyManager = new StorageKeyManager()

// 设置持久化插件
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
  app.use(store)
}
