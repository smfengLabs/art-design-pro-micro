import type { Directive } from 'vue'

/**
 * 全局指令类型增强
 *
 * 指令由 app-core 注册，因此类型声明归属 app-core；
 * app-utils 不再承担任何 Vue 类型依赖。
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
  }
}
