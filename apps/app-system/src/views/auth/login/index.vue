<!-- app-system 独立登录页：登录编排统一由 useAuthLogin 处理 -->
<template>
  <AuthLogin :loading="loading" @submit="handleLogin" />
</template>

<script setup lang="ts">
  import { useAuthLogin } from '@art/app-core'
  import AuthLogin from '@art/app-components/auth/login'

  defineOptions({ name: 'AppSystemLogin' })

  const { loading, handleLogin } = useAuthLogin()
</script>
