import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useSettingStore } from '../../store/modules/setting'
import { headerBarConfig } from '../../config/modules/headerBar'
import { HeaderBarFeatureConfig } from '@art/app-utils'

export function useHeaderBar() {
  const settingStore = useSettingStore()

  const headerBarConfigRef = computed<HeaderBarFeatureConfig>(() => headerBarConfig)

  const { showMenuButton, showFastEnter, showRefreshButton, showCrumbs, showLanguage } =
    storeToRefs(settingStore)

  const isFeatureEnabled = (feature: keyof HeaderBarFeatureConfig): boolean => {
    return headerBarConfigRef.value[feature]?.enabled ?? false
  }

  const getFeatureConfig = (feature: keyof HeaderBarFeatureConfig) => {
    return headerBarConfigRef.value[feature]
  }

  const shouldShowMenuButton = computed(() => {
    return isFeatureEnabled('menuButton') && showMenuButton.value
  })

  const shouldShowRefreshButton = computed(() => {
    return isFeatureEnabled('refreshButton') && showRefreshButton.value
  })

  const shouldShowFastEnter = computed(() => {
    return isFeatureEnabled('fastEnter') && showFastEnter.value
  })

  const shouldShowBreadcrumb = computed(() => {
    return isFeatureEnabled('breadcrumb') && showCrumbs.value
  })

  const shouldShowGlobalSearch = computed(() => {
    return isFeatureEnabled('globalSearch')
  })

  const shouldShowFullscreen = computed(() => {
    return isFeatureEnabled('fullscreen')
  })

  const shouldShowNotification = computed(() => {
    return isFeatureEnabled('notification')
  })

  const shouldShowChat = computed(() => {
    return isFeatureEnabled('chat')
  })

  const shouldShowLanguage = computed(() => {
    return isFeatureEnabled('language') && showLanguage.value
  })

  const shouldShowSettings = computed(() => {
    return isFeatureEnabled('settings')
  })

  const shouldShowThemeToggle = computed(() => {
    return isFeatureEnabled('themeToggle')
  })

  const fastEnterMinWidth = computed(() => {
    const config = getFeatureConfig('fastEnter')
    return (config as any)?.minWidth || 1200
  })

  const isFeatureActive = (feature: keyof HeaderBarFeatureConfig): boolean => {
    return isFeatureEnabled(feature)
  }

  const getFeatureInfo = (feature: keyof HeaderBarFeatureConfig) => {
    return getFeatureConfig(feature)
  }

  const getEnabledFeatures = (): (keyof HeaderBarFeatureConfig)[] => {
    return Object.keys(headerBarConfigRef.value).filter(
      (key) => headerBarConfigRef.value[key as keyof HeaderBarFeatureConfig]?.enabled
    ) as (keyof HeaderBarFeatureConfig)[]
  }

  const getDisabledFeatures = (): (keyof HeaderBarFeatureConfig)[] => {
    return Object.keys(headerBarConfigRef.value).filter(
      (key) => !headerBarConfigRef.value[key as keyof HeaderBarFeatureConfig]?.enabled
    ) as (keyof HeaderBarFeatureConfig)[]
  }

  const getActiveFeatures = () => {
    return getEnabledFeatures()
  }

  const getInactiveFeatures = () => {
    return getDisabledFeatures()
  }

  return {
    headerBarConfig: headerBarConfigRef,

    shouldShowMenuButton, // 是否显示菜单按钮
    shouldShowRefreshButton, // 是否显示刷新按钮
    shouldShowFastEnter, // 是否显示快速入口
    shouldShowBreadcrumb, // 是否显示面包屑
    shouldShowGlobalSearch, // 是否显示全局搜索
    shouldShowFullscreen, // 是否显示全屏按钮
    shouldShowNotification, // 是否显示通知中心
    shouldShowChat, // 是否显示聊天功能
    shouldShowLanguage, // 是否显示语言切换
    shouldShowSettings, // 是否显示设置面板
    shouldShowThemeToggle, // 是否显示主题切换

    fastEnterMinWidth, // 快速入口最小宽度

    isFeatureEnabled, // 检查功能是否启用
    isFeatureActive, // 检查功能是否启用（别名）
    getFeatureConfig, // 获取功能配置
    getFeatureInfo, // 获取功能配置（别名）
    getEnabledFeatures, // 获取所有启用的功能
    getDisabledFeatures, // 获取所有禁用的功能
    getActiveFeatures, // 获取所有启用的功能（别名）
    getInactiveFeatures // 获取所有禁用的功能（别名）
  }
}
