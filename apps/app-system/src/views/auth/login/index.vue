<!-- app-system 独立登录页：只在本应用内完成登录业务编排 -->
<template>
  <AuthLogin :loading="loading" @submit="handleLogin" />
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { ElNotification } from 'element-plus'
  import request, { HttpError, triggerErrorMessage } from '@art/app-api'
  import { AppConfig, initSocket, useUserStore } from '@art/app-core'
  import AuthLogin from '@art/app-components/auth/login'
  import type { LoginFormData } from '@art/app-components'
  import { useI18n } from 'vue-i18n'

  defineOptions({ name: 'AppSystemLogin' })

  interface LoginResponse {
    token: string
    refreshToken: string
  }

  const router = useRouter()
  const route = useRoute()
  const userStore = useUserStore()
  const { t } = useI18n()
  const loading = ref(false)

  /** 子应用自己的登录接口：独立运行时仍由 appCode 注入链路隔离数据域 */
  const fetchLogin = (params: { userName: string; password: string }) =>
    request.post<LoginResponse>({
      url: '/api/auth/login',
      params
    })

  const handleLogin = async (formData: LoginFormData): Promise<void> => {
    if (loading.value) return
    loading.value = true

    try {
      const { token, refreshToken } = await fetchLogin({
        userName: formData.username,
        password: formData.password
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

      const redirect = route.query.redirect as string
      router.push(redirect || '/')
    } catch (error) {
      // HttpError 已由请求层统一提示，这里只记录未预期异常
      if (!(error instanceof HttpError)) {
        console.error('[app-system/login] Unexpected error:', error)
      }
    } finally {
      loading.value = false
    }
  }
</script>
