import type { App, Directive, DirectiveBinding } from 'vue'

export interface RippleOptions {
  /** 水波纹颜色 */
  color?: string
}

export type RippleDirective = Directive<HTMLElement, RippleOptions>

const BASE_ANIMATION_TIME = 600
const DIAMETER_SCALE_FACTOR = 0.5
const RIPPLE_REMOVE_BUFFER = 500

const COLORED_BUTTON_CLASSES = ['primary', 'info', 'warning', 'danger', 'success'].map(
  (type) => `el-button--${type}`
)

const rippleHandlers = new WeakMap<HTMLElement, (e: MouseEvent) => void>()

export const vRipple: RippleDirective = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    const options: RippleOptions = binding.value || {}

    el.style.position = 'relative'
    el.style.overflow = 'hidden'

    const handler = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      const diameter = Math.max(el.clientWidth, el.clientHeight)
      const radius = diameter / 2
      // 直径越大扩散距离越长，按时长补偿避免大范围水波纹显得突兀
      const animationDuration = BASE_ANIMATION_TIME + diameter * DIAMETER_SCALE_FACTOR

      const ripple = document.createElement('div')
      ripple.style.width = ripple.style.height = `${diameter}px`
      ripple.style.left = `${e.clientX - rect.left - radius}px`
      ripple.style.top = `${e.clientY - rect.top - radius}px`
      ripple.style.position = 'absolute'
      ripple.style.borderRadius = '50%'
      ripple.style.pointerEvents = 'none'

      const isColoredButton = COLORED_BUTTON_CLASSES.some((type) => el.classList.contains(type))
      const defaultColor = isColoredButton
        ? 'rgba(255, 255, 255, 0.25)'
        : 'var(--el-color-primary-light-7)'

      ripple.style.backgroundColor = options.color || defaultColor
      ripple.style.transform = 'scale(0)'
      ripple.style.transition = `transform ${animationDuration}ms cubic-bezier(0.3, 0, 0.2, 1), opacity ${animationDuration}ms cubic-bezier(0.3, 0, 0.5, 1)`
      ripple.style.zIndex = '1'

      el.appendChild(ripple)

      requestAnimationFrame(() => {
        ripple.style.transform = 'scale(2)'
        ripple.style.opacity = '0'
      })

      setTimeout(() => ripple.remove(), animationDuration + RIPPLE_REMOVE_BUFFER)
    }

    rippleHandlers.set(el, handler)
    el.addEventListener('mousedown', handler)
  },

  unmounted(el: HTMLElement) {
    const handler = rippleHandlers.get(el)
    if (handler) {
      el.removeEventListener('mousedown', handler)
      rippleHandlers.delete(el)
    }
  }
}

export function setupRippleDirective(app: App) {
  app.directive('ripple', vRipple)
}
