<!-- 全局错误边界：捕获子组件渲染/执行异常，避免页面崩溃导致整页白屏 -->
<template>
  <slot v-if="!hasError" />

  <div v-else class="art-error-boundary" role="alert" aria-live="assertive">
    <div class="art-error-boundary__panel">
      <ArtSvgIcon icon="ri:close-circle-line" class="art-error-boundary__icon" />
      <h2 class="art-error-boundary__title">模块加载失败</h2>
      <p class="art-error-boundary__desc">抱歉，该模块加载或运行失败，请刷新重试</p>
      <ElButton type="primary" size="large" @click="handleRefresh">
        <ArtSvgIcon icon="ri:refresh-line" class="art-error-boundary__refresh-icon" />
        刷新重试
      </ElButton>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { onErrorCaptured, ref } from 'vue'
  import { ElButton } from 'element-plus'
  import ArtSvgIcon from '../base/art-svg-icon/index.vue'

  defineOptions({ name: 'ArtErrorBoundary' })

  const hasError = ref(false)

  onErrorCaptured(() => {
    hasError.value = true
    // 返回 false 阻止错误继续向上冒泡，避免触发全局未捕获异常导致白屏
    return false
  })

  const handleRefresh = () => {
    window.location.reload()
  }
</script>

<style scoped>
  .art-error-boundary {
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: 100%;
    min-height: 100vh;
    padding: 24px;
    background: var(--default-bg-color, #fafbfc);
  }

  .art-error-boundary__panel {
    box-sizing: border-box;
    width: 100%;
    max-width: 480px;
    padding: 40px 32px;
    text-align: center;
    background: var(--default-box-color, #fff);
    border-radius: calc(var(--custom-radius, 8px) + 4px);
    box-shadow: 0 12px 40px rgb(0 0 0 / 8%);
  }

  .art-error-boundary__icon {
    display: block;
    margin: 0 auto 20px;
    font-size: 56px;
    color: var(--art-danger, #f56c6c);
  }

  .art-error-boundary__title {
    margin: 0 0 12px;
    font-size: 20px;
    font-weight: 600;
    color: var(--art-gray-900, #323251);
  }

  .art-error-boundary__desc {
    margin: 0 0 24px;
    font-size: 14px;
    line-height: 1.7;
    color: var(--art-gray-600, #7987a1);
  }

  .art-error-boundary__refresh-icon {
    margin-right: 6px;
  }
</style>
