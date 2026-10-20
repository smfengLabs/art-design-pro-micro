/**
 * 系统存储读取（纯逻辑，零 store/router 依赖）
 *
 * 从 utils/storage/storage.ts 拆出：
 * locales 初始化需要读取旧版系统存储中的语言偏好，而 storage.ts 内含
 * 登出逻辑（依赖 user store → utils/router → locales），直连会构成
 * 循环引用（depcruise no-circular）。
 *
 * @module utils/storage/storage-legacy
 */
import { StorageConfig } from './storage-config'

/**
 * 获取系统版本号
 */
export function getSystemVersion(): string | null {
  return localStorage.getItem(StorageConfig.VERSION_KEY)
}

/**
 * 获取系统存储数据（兼容旧格式）
 */
export function getSystemStorage(): any {
  const version = getSystemVersion() || StorageConfig.CURRENT_VERSION
  const legacyKey = StorageConfig.generateLegacyKey(version)
  const data = localStorage.getItem(legacyKey)
  return data ? JSON.parse(data) : null
}
