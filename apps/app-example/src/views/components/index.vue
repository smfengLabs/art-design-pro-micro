<template>
  <div class="page-content">
    <ElCard class="mb-4" shadow="never">
      <h2 class="m-0 text-xl font-medium">组件示例</h2>
      <p class="mt-2 mb-0 text-sm text-g-600">
        覆盖编辑器、数据处理、交互反馈与可视化展示的常用业务组件。
      </p>
    </ElCard>

    <ElRow :gutter="16">
      <ElCol v-for="item in items" :key="item.path" :xs="24" :sm="12" :md="8" :xl="6">
        <ElCard class="mb-4 cursor-pointer" shadow="hover" @click="router.push(item.path)">
          <div class="flex items-center gap-3">
            <div class="flex-cc size-11 shrink-0 rounded-lg bg-[var(--el-color-primary-light-9)]">
              <ArtSvgIcon :icon="item.icon" class="text-xl text-theme" />
            </div>
            <div class="min-w-0">
              <div class="font-medium">{{ item.title }}</div>
              <div class="mt-1 text-xs text-g-500">{{ item.description }}</div>
            </div>
          </div>
        </ElCard>
      </ElCol>
    </ElRow>
  </div>
</template>

<script setup lang="ts">
  import { useRouter } from 'vue-router'

  defineOptions({ name: 'ExampleComponents' })

  const router = useRouter()

  const items = [
    {
      title: '富文本编辑器',
      description: 'WangEditor 集成与图片上传',
      path: '/example/components/wang-editor',
      icon: 'ri:t-box-line'
    },
    {
      title: 'Excel 导入导出',
      description: '基于 xlsx 的表格数据交换',
      path: '/example/components/excel',
      icon: 'ri:download-2-line'
    },
    {
      title: '拖拽排序',
      description: 'VueDraggable 列表拖拽',
      path: '/example/components/drag',
      icon: 'ri:drag-move-fill'
    },
    {
      title: '二维码',
      description: '参数可配置的二维码生成',
      path: '/example/components/qrcode',
      icon: 'ri:qr-code-line'
    },
    {
      title: '视频播放器',
      description: 'xgplayer 视频播放能力',
      path: '/example/components/video',
      icon: 'ri:vidicon-line'
    },
    {
      title: '图片裁剪',
      description: '上传前裁剪与预览',
      path: '/example/components/image-crop',
      icon: 'ri:screenshot-line'
    },
    {
      title: '水印',
      description: '文字与图片水印配置',
      path: '/example/components/watermark',
      icon: 'ri:water-flash-line'
    },
    {
      title: '数字滚动',
      description: '缓动数字动画',
      path: '/example/components/count-to',
      icon: 'ri:anthropic-line'
    },
    {
      title: '文字滚动',
      description: '多方向无缝滚动公告',
      path: '/example/components/text-scroll',
      icon: 'ri:input-method-line'
    },
    {
      title: '图标',
      description: 'Iconify 离线图标检索',
      path: '/example/components/icon',
      icon: 'ri:palette-line'
    },
    {
      title: '礼花效果',
      description: '全局事件驱动的庆祝动画',
      path: '/example/components/fireworks',
      icon: 'ri:magic-line'
    },
    {
      title: '右键菜单',
      description: '上下文菜单与操作项',
      path: '/example/components/context-menu',
      icon: 'ri:menu-2-line'
    }
  ]
</script>
