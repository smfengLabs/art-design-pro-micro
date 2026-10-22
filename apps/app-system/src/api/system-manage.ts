import { http } from '@art/app-api'

export function fetchGetUserList(params: Api.SystemManage.UserSearchParams) {
  return http.get<Api.SystemManage.UserList>({
    url: '/api/user/list',
    params
  })
}

export function fetchGetRoleList(params: Api.SystemManage.RoleSearchParams) {
  return http.get<Api.SystemManage.RoleList>({
    url: '/api/role/list',
    params
  })
}

// 获取菜单列表（框架级接口 fetchGetMenuList，与 MenuProcessor 后端模式同源复用）
export { fetchGetMenuList } from '@art/app-api'
