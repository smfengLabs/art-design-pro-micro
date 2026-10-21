<!-- 图标组件 -->
<template>
  <Icon v-if="icon" :icon="icon" v-bind="bindAttrs" class="art-svg-icon inline" />
</template>

<script setup lang="ts">
  import { useAttrs, computed } from 'vue'
  import { Icon } from '@iconify/vue/offline'
  // 组件级兜底注册：无论该组件被宿主直接加载，还是随远端 chunk 注入宿主，
  // 都保证当前运行时里的 offline 注册表包含项目所需的全部图标。
  import '../../ui/iconify-loader'

  defineOptions({ name: 'ArtSvgIcon', inheritAttrs: false })

  interface Props {
    /** Iconify icon name */
    icon?: string
  }

  defineProps<Props>()

  const attrs = useAttrs()

  const bindAttrs = computed<{ class: string; style: string }>(() => ({
    class: (attrs.class as string) || '',
    style: (attrs.style as string) || ''
  }))
</script>
