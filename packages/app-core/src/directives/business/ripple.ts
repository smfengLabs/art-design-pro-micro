import type { App, Directive, DirectiveBinding } from 'vue'

export interface RippleOptions {
  /** 水波纹颜色 */
  color?: string
}

export type RippleDirective = Directive<HTMLElement, RippleOptions>

export const vRipple: RippleDirective = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    const options: RippleOptions = binding.value || {}

    el.style.position = 'relative'
    el.style.overflow = 'hidden'

    // 点击事件处理
    el.addEventListener('mousedown', (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      const left = e.clientX - rect.left
      const top = e.clientY - rect.top

      const ripple = document.createElement('div')
      const diameter = Math.max(el.clientWidth, el.clientHeight)
      const radius = diameter / 2

      // 根据直径计算动画时间（直径越大，动画时间越长）
      const baseTime = 600 // 基础动画时间（毫秒）
      const scaleFactor = 0.5 // 缩放因子
      const animationDuration = baseTime + diameter * scaleFactor

      ripple.style.width = ripple.style.height = `${diameter}px`
      ripple.style.left = `${left - radius}px`
      ripple.style.top = `${top - radius}px`
      ripple.style.position = 'absolute'
      ripple.style.borderRadius = '50%'
      ripple.style.pointerEvents = 'none'

      const buttonTypes = ['primary', 'info', 'warning', 'danger', 'success'].map(
        (type) => `el-button--${type}`
      )
      const isColoredButton = buttonTypes.some((type) => el.classList.contains(type))
      const defaultColor = isColoredButton
        ? 'rgba(255, 255, 255, 0.25)' // 有色按钮使用白色水波纹
        : 'var(--el-color-primary-light-7)' // 默认按钮使用主题色水波纹

      ripple.style.backgroundColor = options.color || defaultColor
      ripple.style.transform = 'scale(0)'
      ripple.style.transition = `transform ${animationDuration}ms cubic-bezier(0.3, 0, 0.2, 1), opacity ${animationDuration}ms cubic-bezier(0.3, 0, 0.5, 1)`
      ripple.style.zIndex = '1'

      el.appendChild(ripple)

      requestAnimationFrame(() => {
        ripple.style.transform = 'scale(2)'
        ripple.style.opacity = '0'
      })

      setTimeout(() => {
        ripple.remove()
      }, animationDuration + 500) // 增加500ms缓冲时间
    })
  }
}

export function setupRippleDirective(app: App) {
  app.directive('ripple', vRipple)
}
