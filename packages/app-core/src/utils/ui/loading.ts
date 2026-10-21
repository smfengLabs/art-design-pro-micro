import { fourDotsSpinnerSvg } from '../../assets/svg/loading'

/**
 * 获取当前主题对应的 loading 背景色
 * @returns 背景色字符串
 */
const getLoadingBackground = (): string => {
  const isDark = document.documentElement.classList.contains('dark')
  return isDark ? 'rgba(7, 7, 7, 0.85)' : '#fff'
}

let loadingElement: HTMLDivElement | null = null
let previousBodyOverflow = ''

/** 创建无 UI 库依赖的全屏 loading 遮罩 */
function createLoadingElement(): HTMLDivElement {
  const element = document.createElement('div')
  element.className = 'art-global-loading'
  element.setAttribute('role', 'status')
  element.setAttribute('aria-busy', 'true')

  Object.assign(element.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '3000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: getLoadingBackground(),
    transition: 'background-color 0.2s ease'
  })

  const spinner = document.createElement('div')
  spinner.innerHTML = fourDotsSpinnerSvg
  Object.assign(spinner.style, {
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  })

  element.appendChild(spinner)
  return element
}

export const loadingService = {
  /**
   * 显示 loading
   * @returns 关闭 loading 的函数
   */
  showLoading(): () => void {
    if (!loadingElement) {
      loadingElement = createLoadingElement()
      previousBodyOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      document.body.appendChild(loadingElement)
    }
    return () => this.hideLoading()
  },

  /**
   * 隐藏 loading
   */
  hideLoading(): void {
    if (loadingElement) {
      loadingElement.remove()
      loadingElement = null
      document.body.style.overflow = previousBodyOverflow
    }
  }
}
