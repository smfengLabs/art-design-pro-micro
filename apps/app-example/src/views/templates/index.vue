<template>
  <div class="page-content">
    <ElCard class="mb-4" shadow="never">
      <h2 class="m-0 text-xl font-medium">模板页面</h2>
      <p class="mt-2 mb-0 text-sm text-g-600">
        面向中后台常见场景的高可用页面模板，可直接作为业务开发起点。
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

  defineOptions({ name: 'ExampleTemplates' })

  const router = useRouter()

  const items = [
    {
      title: '复杂表单',
      description: '栅格表单、校验与自定义控件',
      path: '/example/templates/examples/forms',
      icon: 'ri:table-view'
    },
    {
      title: '高级表格',
      description: '搜索、缓存、列配置与分页',
      path: '/example/templates/examples/tables',
      icon: 'ri:table-3'
    },
    {
      title: '基础表格',
      description: '最小化表格接入示例',
      path: '/example/templates/examples/tables/basic',
      icon: 'ri:layout-grid-line'
    },
    {
      title: '树形表格',
      description: '树形数据结构与搜索联动',
      path: '/example/templates/examples/tables/tree',
      icon: 'ri:layout-2-line'
    },
    {
      title: '权限示例',
      description: '角色切换与按钮级权限控制',
      path: '/example/templates/examples/permission/switch-role',
      icon: 'ri:fingerprint-line'
    },
    {
      title: '图表模板',
      description: '常用 ECharts 图表组合',
      path: '/example/templates/pages/charts',
      icon: 'ri:bar-chart-box-line'
    },
    {
      title: '聊天模板',
      description: '联系人列表与消息会话',
      path: '/example/templates/pages/chat',
      icon: 'ri:message-3-line'
    },
    {
      title: '日历模板',
      description: '日程事件增删改查',
      path: '/example/templates/pages/calendar',
      icon: 'ri:calendar-2-line'
    }
  ]
</script>
