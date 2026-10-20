/**
 * @art/app-api 公共入口
 *
 * DAG 层 1：允许依赖 @art/app-utils 与三方库；禁止依赖 @art/app-core/app-base 等上层与 apps/*。
 *
 * - 默认导出 / http：请求封装实例（含 setTokenProvider/onUnauthorized/setTranslator 注入点）
 * - framework-api：框架级接口（appCode 应用身份契约）
 *
 * @module @art/app-api
 */
export { default, default as http } from './http'
export { HttpError, isHttpError } from './http/error'
export {
  setTokenProvider,
  onUnauthorized,
  setTranslator,
  getToken,
  triggerUnauthorized,
  translate
} from './http/context'
export type { TokenProvider, UnauthorizedHandler, Translator } from './http/context'
export * from './framework-api'
