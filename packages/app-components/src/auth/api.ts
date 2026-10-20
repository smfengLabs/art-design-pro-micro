/**
 * 登录接口（auth 域）
 *
 * 使用 `@art/app-api` 共享 http 实例：请求拦截器自动追加应用身份
 * `appCode`（构建期 VITE_APP_CODE，B2/G6 契约），standalone 会话下
 * 即 `appCode=app_system`，接口按域返回数据。
 *
 * @module app-components/auth/api
 */
import request from '@art/app-api'

/**
 * 登录
 * @param params 登录参数
 * @returns 登录响应
 */
export function fetchLogin(params: Api.Auth.LoginParams) {
  return request.post<Api.Auth.LoginResponse>({
    url: '/api/auth/login',
    params
  })
}
