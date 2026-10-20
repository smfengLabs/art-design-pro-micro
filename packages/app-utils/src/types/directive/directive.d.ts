import type { Directive } from 'vue'

/**
 * 全局指令类型增强（层 0 自包含：与 app-core 指令实现结构保持一致，
 * 但 app-utils 不得 import 其他 @art 包，故此处以 Vue Directive 泛型直陈）
 */
export interface RippleOptions {
  /** 水波纹颜色 */
  color?: string
}

declare module 'vue' {
  export interface GlobalDirectives {
    vAuth: Directive<HTMLElement, string>
    vRoles: Directive<HTMLElement, string | string[]>
    vRipple: Directive<HTMLElement, RippleOptions>
    vHighlight: Directive<HTMLElement>
  }
}
