<!-- dev 工具页：404 兜底（standalone 运行） -->
<template>
  <div class="not-found">
    <div class="not-found-code">404</div>
    <p class="not-found-desc">页面不存在或未在 app-example 注册</p>
    <ElButton type="primary" @click="router.replace('/example/home')">回到首页</ElButton>
  </div>
</template>

<script setup lang="ts">
  import { useRouter } from 'vue-router'

  defineOptions({ name: 'ExampleNotFound' })

  const router = useRouter()
</script>

<style scoped>
  .not-found {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    gap: 12px;
  }

  .not-found-code {
    font-size: 72px;
    font-weight: 700;
    color: var(--art-gray-500);
  }

  .not-found-desc {
    color: var(--art-gray-600);
  }
</style>
