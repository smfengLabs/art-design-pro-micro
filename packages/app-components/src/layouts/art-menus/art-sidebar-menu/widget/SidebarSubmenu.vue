<template>
  <template v-for="(item, index) in filteredMenuItems" :key="getUniqueKey(item, index)">
    <ElSubMenu
      v-if="hasChildren(item)"
      :index="item.path || item.meta.title"
      :level="level"
      @mouseenter="preloadMenu(item)"
    >
      <template #title>
        <div class="menu-icon flex-cc">
          <ArtSvgIcon
            :icon="item.meta.icon"
            :color="theme?.iconColor"
            :style="{ color: theme.iconColor }"
          />
        </div>
        <span class="menu-name">
          {{ formatMenuTitle(item.meta.title) }}
        </span>
        <div v-if="item.meta.showBadge" class="art-badge" style="right: 10px" />
      </template>

      <SidebarSubmenu
        :list="item.children"
        :is-mobile="isMobile"
        :level="level + 1"
        :theme="theme"
        @close="closeMenu"
      />
    </ElSubMenu>

    <ElMenuItem
      v-else
      :index="isExternalLink(item) ? '' : item.path || item.meta.title"
      :level-item="level + 1"
      @mouseenter="preloadMenu(item)"
      @click="goPage(item)"
    >
      <div class="menu-icon flex-cc">
        <ArtSvgIcon
          :icon="item.meta.icon"
          :color="theme?.iconColor"
          :style="{ color: theme.iconColor }"
        />
      </div>
      <div
        v-show="item.meta.showBadge && level === 0 && !menuOpen"
        class="art-badge"
        style="right: 5px"
      />

      <template #title>
        <span class="menu-name">
          {{ formatMenuTitle(item.meta.title) }}
        </span>
        <div v-if="item.meta.showBadge" class="art-badge" />
        <div v-if="item.meta.showTextBadge && (level > 0 || menuOpen)" class="art-text-badge">
          {{ item.meta.showTextBadge }}
        </div>
      </template>
    </ElMenuItem>
  </template>
</template>

<script setup lang="ts">
  import { storeToRefs } from 'pinia'
  import ArtSvgIcon from '../../../../base/art-svg-icon/index.vue'
  import { computed } from 'vue'
  import type { AppRouteRecord } from '@art/app-utils'
  import { formatMenuTitle } from '@art/app-core'
  import { handleMenuJump, preloadRemoteRoute } from '@art/app-core'
  import { useSettingStore } from '@art/app-core'

  interface MenuTheme {
    iconColor?: string
  }

  interface Props {
    /** 菜单标题 */
    title?: string
    /** 菜单列表 */
    list?: AppRouteRecord[]
    /** 主题配置 */
    theme?: MenuTheme
    /** 是否为移动端模式 */
    isMobile?: boolean
    /** 菜单层级 */
    level?: number
  }

  interface Emits {
    /** 关闭菜单事件 */
    (e: 'close'): void
  }

  const props = withDefaults(defineProps<Props>(), {
    title: '',
    list: () => [],
    theme: () => ({}),
    isMobile: false,
    level: 0
  })

  const emit = defineEmits<Emits>()

  const settingStore = useSettingStore()

  const { menuOpen } = storeToRefs(settingStore)

  const filteredMenuItems = computed(() => {
    const items = filterRoutes(props.list)

    return items.flatMap((item) => {
      const children = item.children ?? []

      // 纯布局目录只有一个可见子菜单时，直接展示子菜单，避免出现“首页 / 首页”这类重复层级
      if (item.meta.collapseSingleChild && children.length === 1) {
        return [{ ...children[0], meta: { ...children[0].meta, isFirstLevel: true } }]
      }

      return [item]
    })
  })

  const preloadMenu = (item: AppRouteRecord): void => {
    preloadRemoteRoute(item)
  }

  const goPage = (item: AppRouteRecord): void => {
    closeMenu()
    handleMenuJump(item)
  }

  const closeMenu = (): void => {
    emit('close')
  }

  const isNavigableRoute = (item: AppRouteRecord): boolean => {
    return !!(
      !item.meta.isHide &&
      ((item.path && item.path.trim()) || item.meta.link || item.meta.isIframe === true) &&
      (item.component || item.meta.link || item.meta.isIframe === true)
    )
  }

  const filterRoutes = (items: AppRouteRecord[]): AppRouteRecord[] => {
    return items
      .filter((item) => {
        if (item.meta.isHide) {
          return false
        }

        if (item.children && item.children.length > 0) {
          const filteredChildren = filterRoutes(item.children)
          // 目录菜单必须有可见子菜单；子节点全部被过滤时，父级不得降级为可点击叶子
          return filteredChildren.length > 0
        }

        return isNavigableRoute(item)
      })
      .map((item) => ({
        ...item,
        children: item.children ? filterRoutes(item.children) : undefined
      }))
  }

  const hasChildren = (item: AppRouteRecord): boolean => {
    if (!item.children || item.children.length === 0) {
      return false
    }
    const filteredChildren = filterRoutes(item.children)
    return filteredChildren.length > 0
  }

  const isExternalLink = (item: AppRouteRecord): boolean => {
    return !!(item.meta.link && !item.meta.isIframe)
  }

  const getUniqueKey = (item: AppRouteRecord, index: number): string => {
    return `${item.path || item.meta.title || 'menu'}-${props.level}-${index}`
  }
</script>
