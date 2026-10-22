import { useSettingStore } from '../../store/modules/setting'
import { SystemThemeEnum } from '@art/app-utils'
import AppConfig from '../../config/index'
import { SystemThemeTypes } from '@art/app-utils'
import { getDarkColor, getLightColor, setElementThemeColor } from '../../utils/ui/colors'
import { getCurrentScope, onScopeDispose, ref, watch } from 'vue'

/**
 * 系统深色偏好检测（原生 matchMedia 实现）
 *
 * 替代 @vueuse/core 的 usePreferredDark：微前端下 vueuse 实例可能与组件 vue 实例
 * 不同源，其内部 watch 无法追踪组件创建的 ref；matchMedia 只依赖浏览器原生能力，
 * 零跨实例风险。change 监听随调用方 effect scope 销毁自动清理。
 */
function usePrefersDark() {
  const query =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)')
      : null

  const prefersDark = ref(query ? query.matches : false)

  if (query) {
    const handleChange = (event: MediaQueryListEvent) => {
      prefersDark.value = event.matches
    }
    query.addEventListener('change', handleChange)
    if (getCurrentScope()) {
      onScopeDispose(() => query.removeEventListener('change', handleChange))
    }
  }

  return prefersDark
}

export function useTheme() {
  const settingStore = useSettingStore()

  const disableTransitions = () => {
    const style = document.createElement('style')
    style.setAttribute('id', 'disable-transitions')
    style.textContent = '* { transition: none !important; }'
    document.head.appendChild(style)
  }

  const enableTransitions = () => {
    const style = document.getElementById('disable-transitions')
    if (style) {
      style.remove()
    }
  }

  const setSystemTheme = (theme: SystemThemeEnum, themeMode?: SystemThemeEnum) => {
    // 临时禁用过渡效果
    disableTransitions()

    const el = document.getElementsByTagName('html')[0]
    const isDark = theme === SystemThemeEnum.DARK

    if (!themeMode) {
      themeMode = theme
    }

    const currentTheme = AppConfig.systemThemeStyles[theme as keyof SystemThemeTypes]

    if (currentTheme) {
      el.setAttribute('class', currentTheme.className)
    }

    const primary = settingStore.systemThemeColor

    for (let i = 1; i <= 9; i++) {
      document.documentElement.style.setProperty(
        `--el-color-primary-light-${i}`,
        isDark ? `${getDarkColor(primary, i / 10)}` : `${getLightColor(primary, i / 10)}`
      )
    }

    settingStore.setGlopTheme(theme, themeMode)

    // 使用 requestAnimationFrame 确保在下一帧恢复过渡效果
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        enableTransitions()
      })
    })
  }

  // 检测系统主题偏好（原生 matchMedia 实现，替代 VueUse usePreferredDark）
  const prefersDark = usePrefersDark()

  const setSystemAutoTheme = () => {
    const theme = prefersDark.value ? SystemThemeEnum.DARK : SystemThemeEnum.LIGHT
    setSystemTheme(theme, SystemThemeEnum.AUTO)
  }

  const switchThemeStyles = (theme: SystemThemeEnum) => {
    if (theme === SystemThemeEnum.AUTO) {
      setSystemAutoTheme()
    } else {
      setSystemTheme(theme)
    }
  }

  return {
    setSystemTheme,
    setSystemAutoTheme,
    switchThemeStyles,
    prefersDark
  }
}

export function initializeTheme() {
  const settingStore = useSettingStore()
  const prefersDark = usePrefersDark()

  const applyThemeByMode = () => {
    const el = document.getElementsByTagName('html')[0]
    let actualTheme = settingStore.systemThemeType

    if (settingStore.systemThemeMode === SystemThemeEnum.AUTO) {
      actualTheme = prefersDark.value ? SystemThemeEnum.DARK : SystemThemeEnum.LIGHT
      settingStore.systemThemeType = actualTheme
    }

    const currentTheme = AppConfig.systemThemeStyles[actualTheme as keyof SystemThemeTypes]
    if (currentTheme) {
      el.setAttribute('class', currentTheme.className)
    }

    setElementThemeColor(settingStore.systemThemeColor, settingStore.isDark)

    document.documentElement.style.setProperty('--custom-radius', `${settingStore.customRadius}rem`)
  }

  applyThemeByMode()

  // 如果是 AUTO 模式，监听系统主题变化（原生 matchMedia change 事件驱动）
  if (settingStore.systemThemeMode === SystemThemeEnum.AUTO) {
    watch(
      prefersDark,
      () => {
        // 只有在 AUTO 模式下才响应系统主题变化
        if (settingStore.systemThemeMode === SystemThemeEnum.AUTO) {
          applyThemeByMode()
        }
      },
      { immediate: false }
    )
  }
}
