import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElNotification } from 'element-plus'
import { useI18n } from 'vue-i18n'
import request, { HttpError, triggerErrorMessage } from '@art/app-api'
import AppConfig from '../../config'
import { useUserStore } from '../../store/modules/user'
import { initSocket } from '../../utils/socket'

/** 登录表单提交给 Hook 的最小凭据结构 */
export interface AuthLoginCredentials {
  /** 用户名 */
  username: string
  /** 密码 */
  password: string
}

/** 登录接口响应 */
interface LoginResponse {
  token: string
  refreshToken?: string
}

export interface UseAuthLoginOptions {
  /** 登录接口地址，默认 /api/auth/login */
  loginUrl?: string
  /** 无 redirect 查询参数时的默认落点，默认 / */
  fallbackRedirect?: string
}

const DEFAULT_LOGIN_URL = '/api/auth/login'
const DEFAULT_REDIRECT = '/'

/**
 * 登录通用逻辑
 *
 * 统一处理登录请求、loading、Token 写入、WebSocket 初始化和登录后跳转。
 * 必须在组件 setup 或其它组合式函数中调用（内部依赖 pinia / router 上下文）。
 */
export function useAuthLogin(options: UseAuthLoginOptions = {}) {
  const { loginUrl = DEFAULT_LOGIN_URL, fallbackRedirect = DEFAULT_REDIRECT } = options
  const router = useRouter()
  const route = useRoute()
  const userStore = useUserStore()
  const { t } = useI18n()
  const loading = ref(false)

  /**
   * 执行登录
   *
   * 失败时由请求层统一提示；Hook 只负责关闭 loading 和记录非预期异常。
   */
  const handleLogin = async (credentials: AuthLoginCredentials): Promise<void> => {
    if (loading.value) return
    loading.value = true

    try {
      const { token, refreshToken } = await request.post<LoginResponse>({
        url: loginUrl,
        params: {
          userName: credentials.username,
          password: credentials.password
        }
      })

      if (!token) {
        triggerErrorMessage('登录失败：未获取到 Token')
        return
      }

      userStore.setToken(token, refreshToken)
      userStore.setLoginStatus(true)
      initSocket()

      ElNotification({
        title: t('login.success.title'),
        type: 'success',
        duration: 2500,
        zIndex: 10000,
        message: `${t('login.success.message')}, ${AppConfig.systemInfo.name}!`
      })

      const redirect =
        typeof route.query.redirect === 'string' ? route.query.redirect : fallbackRedirect
      await router.push(redirect || fallbackRedirect)
    } catch (error) {
      if (!(error instanceof HttpError)) {
        console.error('[useAuthLogin] Unexpected error:', error)
      }
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    handleLogin
  }
}
