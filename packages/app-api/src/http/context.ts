/**
 * HTTP 运行时注入上下文
 *
 * 解耦设计（v2 B2/D3）：@art/app-api（层 1）不得依赖应用层与 @art/app-core，
 * token 读取、401 处理与 i18n 翻译均由宿主装配期注入：
 *
 * - setTokenProvider：读取本地 token（宿主 storage 策略）
 * - onUnauthorized：401 统一处理（宿主登出/跳转登录）
 * - setTranslator：i18n 翻译器（未注入时回退输出 key）
 *
 * @module app-api/http/context
 */

/** token 提供者 */
export type TokenProvider = () => string
/** 401 回调 */
export type UnauthorizedHandler = () => void
/** 翻译器（对应 $t 调用签名的宽松形态） */
export type Translator = (key: string, ...args: any[]) => string

let tokenProvider: TokenProvider = () => ''

let unauthorizedHandler: UnauthorizedHandler | null = null

let translator: Translator = (key: string) => key

export function setTokenProvider(provider: TokenProvider): void {
  tokenProvider = provider
}

export function getToken(): string {
  return tokenProvider()
}

export function onUnauthorized(handler: UnauthorizedHandler): void {
  unauthorizedHandler = handler
}

export function triggerUnauthorized(): void {
  if (unauthorizedHandler) {
    unauthorizedHandler()
  }
}

export function setTranslator(translate: Translator): void {
  translator = translate
}

export function translate(key: string, ...args: any[]): string {
  return translator(key, ...args)
}
