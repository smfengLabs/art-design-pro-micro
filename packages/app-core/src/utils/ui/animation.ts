import { useCommon } from '../../hooks/core/useCommon'
import { useTheme } from '../../hooks/core/useTheme'
import { SystemThemeEnum } from '@art/app-utils'
import { useSettingStore } from '../../store/modules/setting'
const { LIGHT, DARK } = SystemThemeEnum

/**
 * 主题切换动画
 * @param e 鼠标点击事件
 */
export const themeAnimation = (e: any) => {
  const x = e.clientX
  const y = e.clientY
  const endRadius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))

  document.documentElement.style.setProperty('--x', x + 'px')
  document.documentElement.style.setProperty('--y', y + 'px')
  document.documentElement.style.setProperty('--r', endRadius + 'px')

  if (document.startViewTransition) {
    document.startViewTransition(() => toggleTheme())
  } else {
    toggleTheme()
  }
}

const toggleTheme = () => {
  useTheme().switchThemeStyles(useSettingStore().systemThemeType === LIGHT ? DARK : LIGHT)
  useCommon().refresh()
}

export const toggleTransition = (enable: boolean) => {
  const body = document.body

  if (enable) {
    body.classList.add('theme-change')
  } else {
    setTimeout(() => {
      body.classList.remove('theme-change')
    }, 300)
  }
}
