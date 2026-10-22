import { getActiveRouter } from '../../router/runtime'
import { useUserStore } from '../../store/modules/user'
import { triggerErrorMessage } from '@art/app-api'
import { StorageConfig } from './storage-config'
import {
  getSystemStorage as readSystemStorage,
  getSystemVersion as readSystemVersion
} from './storage-legacy'

class StorageCompatibilityManager {
  getSystemVersion(): string | null {
    return readSystemVersion()
  }

  getSystemStorage(): any {
    return readSystemStorage()
  }

  private hasCurrentVersionStorage(): boolean {
    const storageKeys = Object.keys(localStorage)
    const currentVersionPattern = StorageConfig.createCurrentVersionPattern()

    return storageKeys.some(
      (key) => currentVersionPattern.test(key) && localStorage.getItem(key) !== null
    )
  }

  private hasAnyVersionStorage(): boolean {
    const storageKeys = Object.keys(localStorage)
    const versionPattern = StorageConfig.createVersionPattern()

    return storageKeys.some((key) => versionPattern.test(key) && localStorage.getItem(key) !== null)
  }

  private getLegacyStorageData(): Record<string, any> {
    try {
      const systemStorage = this.getSystemStorage()
      return systemStorage || {}
    } catch (error) {
      console.warn('[Storage] 解析旧格式存储数据失败:', error)
      return {}
    }
  }

  private showStorageError(): void {
    triggerErrorMessage('系统检测到本地数据异常，请重新登录系统恢复使用！')
  }

  private performSystemLogout(): void {
    setTimeout(() => {
      try {
        localStorage.clear()
        useUserStore().logOut()
        getActiveRouter().push({ name: 'Login' })
        console.info('[Storage] 已执行系统登出')
      } catch (error) {
        console.error('[Storage] 系统登出失败:', error)
      }
    }, StorageConfig.LOGOUT_DELAY)
  }

  private handleStorageError(): void {
    this.showStorageError()
    this.performSystemLogout()
  }

  validateStorageData(requireAuth: boolean = false): boolean {
    try {
      if (this.hasCurrentVersionStorage()) {
        return true
      }

      if (this.hasAnyVersionStorage()) {
        return true
      }

      const legacyData = this.getLegacyStorageData()
      if (Object.keys(legacyData).length === 0) {
        // 只有在需要验证登录状态时才执行登出操作
        if (requireAuth) {
          console.warn('[Storage] 未发现任何存储数据，需要重新登录')
          this.performSystemLogout()
          return false
        }
        // 首次访问或访问静态路由，不需要登出
        return true
      }

      return true
    } catch (error) {
      console.error('[Storage] 存储数据验证失败:', error)
      // 只有在需要验证登录状态时才处理错误
      if (requireAuth) {
        this.handleStorageError()
        return false
      }
      return true
    }
  }

  isStorageEmpty(): boolean {
    if (this.hasCurrentVersionStorage()) {
      return false
    }

    if (this.hasAnyVersionStorage()) {
      return false
    }

    const legacyData = this.getLegacyStorageData()
    return Object.keys(legacyData).length === 0
  }

  checkCompatibility(requireAuth: boolean = false): boolean {
    try {
      const isValid = this.validateStorageData(requireAuth)
      const isEmpty = this.isStorageEmpty()

      if (isValid || isEmpty) {
        return true
      }

      console.warn('[Storage] 存储兼容性检查失败')
      return false
    } catch (error) {
      console.error('[Storage] 兼容性检查异常:', error)
      return false
    }
  }
}

const storageManager = new StorageCompatibilityManager()

export function getSystemStorage(): any {
  return storageManager.getSystemStorage()
}

export function getSysVersion(): string | null {
  return storageManager.getSystemVersion()
}

export function validateStorageData(requireAuth: boolean = false): boolean {
  return storageManager.validateStorageData(requireAuth)
}

export function checkStorageCompatibility(requireAuth: boolean = false): boolean {
  return storageManager.checkCompatibility(requireAuth)
}
