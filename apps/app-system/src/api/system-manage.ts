/**
 * system 域 API（迁移自 origin-code/src/api/system-manage.ts）
 *
 * 请求实例改为 @art/app-api 的 http：
 * - Token / 401 / i18n 翻译由 app-base 装配期注入（v2 B2）
 * - appCode 由请求拦截器对核心接口统一追加（应用身份契约）
 *
 * @module app-system/api/system-manage
 */
import { http } from '@art/app-api'

// 获取用户列表
export function fetchGetUserList(params: Api.SystemManage.UserSearchParams) {
  return http.get<Api.SystemManage.UserList>({
    url: '/api/user/list',
    params
  })
}

// 获取角色列表
export function fetchGetRoleList(params: Api.SystemManage.RoleSearchParams) {
  return http.get<Api.SystemManage.RoleList>({
    url: '/api/role/list',
    params
  })
}

// 获取菜单列表（框架级接口 fetchGetMenuList，与 MenuProcessor 后端模式同源复用）
export { fetchGetMenuList } from '@art/app-api'
