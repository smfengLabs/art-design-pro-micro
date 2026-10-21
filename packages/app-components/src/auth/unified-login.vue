<!-- 统一登录页：业务逻辑由 useAuthLogin 统一托管，UI 由 AuthLogin 负责 -->
<template>
  <AuthLogin :loading="loading" :title="title" @submit="handleLogin" />
</template>

<script setup lang="ts">
  import AuthLogin from './login/index.vue'
  import { useAuthLogin } from '@art/app-core'

  defineOptions({ name: 'ArtUnifiedLogin' })

  interface Props {
    /** 自定义登录标题；未传时使用公共 i18n 文案 */
    title?: string
  }

  withDefaults(defineProps<Props>(), {
    title: ''
  })

  const { loading, handleLogin } = useAuthLogin()
</script>
