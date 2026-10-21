import { RouteLocationNormalized, RouteRecordRaw } from 'vue-router'
import AppConfig from '../config/index'
import i18n, { $t } from '../locales/index'

/** 扩展的路由配置类型 */
export type AppRouteRecordRaw = RouteRecordRaw & {
  hidden?: boolean
}

/** 顶部进度条 DOM（纯原生实现，不引入第三方进度条库） */
let progressElement: HTMLDivElement | null = null
let progressTimer: ReturnType<typeof setInterval> | null = null
let progressRemoveTimer: ReturnType<typeof setTimeout> | null = null

function ensureProgressElement(): HTMLDivElement {
  if (!progressElement) {
    progressElement = document.createElement('div')
    progressElement.className = 'art-route-progress'
    Object.assign(progressElement.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '0',
      height: '2px',
      zIndex: '9999',
      pointerEvents: 'none',
      background: 'var(--el-color-primary, var(--main-color, #409eff))',
      transition: 'width 0.2s ease, opacity 0.3s ease',
      opacity: '1'
    })
    document.body.appendChild(progressElement)
  }
  return progressElement
}

/** 开始顶部路由进度条 */
export function startProgress(): void {
  if (progressRemoveTimer) {
    clearTimeout(progressRemoveTimer)
    progressRemoveTimer = null
  }
  const element = ensureProgressElement()
  element.style.opacity = '1'
  element.style.width = '8%'

  if (progressTimer) clearInterval(progressTimer)
  progressTimer = setInterval(() => {
    if (!progressElement) return
    const current = Number.parseFloat(progressElement.style.width) || 0
    if (current < 90) {
      progressElement.style.width = `${Math.min(current + Math.max(1, (90 - current) * 0.08), 90)}%`
    }
  }, 300)
}

/** 完成顶部路由进度条 */
export function doneProgress(): void {
  if (progressTimer) {
    clearInterval(progressTimer)
    progressTimer = null
  }
  if (!progressElement) return

  progressElement.style.width = '100%'
  progressElement.style.opacity = '0'
  progressRemoveTimer = setTimeout(() => {
    removeProgress()
  }, 350)
}

/** 立即移除顶部路由进度条 */
export function removeProgress(): void {
  if (progressTimer) {
    clearInterval(progressTimer)
    progressTimer = null
  }
  if (progressRemoveTimer) {
    clearTimeout(progressRemoveTimer)
    progressRemoveTimer = null
  }
  progressElement?.remove()
  progressElement = null
}

/**
 * 设置页面标题，根据路由元信息和系统信息拼接标题
 * @param to 当前路由对象
 */
export const setPageTitle = (to: RouteLocationNormalized): void => {
  const { title } = to.meta
  if (title) {
    setTimeout(() => {
      document.title = `${formatMenuTitle(String(title))} - ${AppConfig.systemInfo.name}`
    }, 150)
  }
}

/**
 * 格式化菜单标题
 * @param title 菜单标题，可以是 i18n 的 key，也可以是字符串
 * @returns 格式化后的菜单标题
 */
export const formatMenuTitle = (title: string): string => {
  if (title) {
    if (title.startsWith('menus.')) {
      // 使用 te() 方法检查翻译键值是否存在，避免控制台警告
      if (i18n.global.te(title)) {
        return $t(title)
      } else {
        // 如果翻译不存在，返回键值的最后部分作为fallback
        return title.split('.').pop() || title
      }
    }
    return title
  }
  return ''
}
