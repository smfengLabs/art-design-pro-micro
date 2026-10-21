import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useUserStore } from '../../store/modules/user'
import { useAppMode } from './useAppMode'
import type { AppRouteRecord } from '@art/app-utils'

type AuthItem = NonNullable<AppRouteRecord['meta']['authList']>[number]

export const useAuth = () => {
  // Store 必须在组合式函数/组件 setup 内获取，禁止模块顶层调用：
  // 模块求值可能早于 app.use(pinia)，此时 useStore() 会抛 `_s` 未定义。
  const userStore = useUserStore()
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
