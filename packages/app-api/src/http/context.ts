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

/** 全局消息提供者 */
export type MessageHandler = (message: string) => void

let errorMessageHandler: MessageHandler | null = null
let successMessageHandler: MessageHandler | null = null

export function onErrorMessage(handler: MessageHandler): void {
  errorMessageHandler = handler
}

export function onSuccessMessage(handler: MessageHandler): void {
  successMessageHandler = handler
}

export function triggerErrorMessage(message: string): void {
  if (errorMessageHandler) errorMessageHandler(message)
}

export function triggerSuccessMessage(message: string): void {
  if (successMessageHandler) successMessageHandler(message)
}
