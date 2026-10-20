import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useUserStore } from '../../store/modules/user'
import { useAppMode } from './useAppMode'
import type { AppRouteRecord } from '@art/app-utils'

type AuthItem = NonNullable<AppRouteRecord['meta']['authList']>[number]

const userStore = useUserStore()

export const useAuth = () => {
  const route = useRoute()
  const { isFrontendMode } = useAppMode()
  const { info } = storeToRefs(userStore)

  // 前端按钮权限（例如：['add', 'edit']）
  const frontendAuthList = info.value?.buttons ?? []

  // 后端路由 meta 配置的权限列表（例如：[{ authMark: 'add' }]）
  const backendAuthList: AuthItem[] = Array.isArray(route.meta.authList)
    ? (route.meta.authList as AuthItem[])
    : []

  /**
   * 检查是否拥有某权限标识（前后端模式通用）
   * @param auth 权限标识
   * @returns 是否有权限
   */
  const hasAuth = (auth: string): boolean => {
    if (isFrontendMode.value) {
      return frontendAuthList.includes(auth)
    }

    return backendAuthList.some((item) => item?.authMark === auth)
  }

  return {
    hasAuth
  }
}
