import { StorageConfig } from './storage-config'

// 独立读取旧版存储，避免 locales 与 storage 的循环依赖
export function getSystemVersion(): string | null {
  return localStorage.getItem(StorageConfig.VERSION_KEY)
}

export function getSystemStorage(): any {
  const version = getSystemVersion() || StorageConfig.CURRENT_VERSION
  const legacyKey = StorageConfig.generateLegacyKey(version)
  const data = localStorage.getItem(legacyKey)
  return data ? JSON.parse(data) : null
}
