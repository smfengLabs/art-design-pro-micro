import { http } from '@art/app-api'

export { fetchGetUserInfo } from '@art/app-api'

export function fetchLogin(params: Api.Auth.LoginParams) {
  return http.post<Api.Auth.LoginResponse>({
    url: '/api/auth/login',
    params
  })
}
