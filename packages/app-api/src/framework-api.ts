/// <reference path="../../app-utils/src/types/api/api.d.ts" />
/**
 * 框架级接口（应用身份契约 v2 B2/G6）
 *
 * 供 @art/app-core（守卫、菜单处理器）跨层消费；
 * 核心接口由请求拦截器统一追加 appCode（见 http/index.ts APP_CODE_ENDPOINTS）。
 *
 * @module app-api/framework-api
 */
import http from './http'
import type { AppRouteRecord } from '@art/app-utils'

/** 获取当前用户信息（GET /api/user/info） */
export function fetchGetUserInfo() {
  return http.get<Api.Auth.UserInfo>({
    url: '/api/user/info'
  })
}

/** 获取当前应用的菜单（GET /api/v3/system/menus，appCode 由拦截器注入） */
export function fetchGetMenuList() {
  return http.get<AppRouteRecord[]>({
    url: '/api/v3/system/menus'
  })
}
