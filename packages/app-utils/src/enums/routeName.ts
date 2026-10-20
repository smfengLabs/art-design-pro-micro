/**
 * 路由名称枚举（微应用公共契约）
 *
 * - 框架路由：宿主与远程通用（与 origin staticRoutes 的 name 值保持一致）
 * - 系统模块路由：app-system 业务路由命名（阶段二起经远程注册）
 *
 * 注：system 域成员值对齐 origin 路由/组件名（User/Role/Menus/…）——
 * worktab 的 KeepAlive exclude 以组件名匹配缓存（defineOptions name 与路由 name 一致），
 * 值随 origin 保持不变，关闭标签页清理缓存行为与改造前逐一致
 * （v2 E3 示例中的 "SystemUser" 措辞按此落地：枚举成员名 SYSTEM_* 即唯一锚点，值 = origin 名）。
 *
 * @module app-utils/enums/routeName
 */
export enum RouteName {
  /** 登录 */
  LOGIN = 'Login',
  /** 注册 */
  REGISTER = 'Register',
  /** 忘记密码 */
  FORGET_PASSWORD = 'ForgetPassword',
  /** 403 无权限 */
  EXCEPTION_403 = 'Exception403',
  /** 404 未找到 */
  EXCEPTION_404 = 'Exception404',
  /** 500 服务异常 */
  EXCEPTION_500 = 'Exception500',

  /** app-system：系统模块（布局路由） */
  SYSTEM = 'System',
  /** app-system：系统首页（阶段一演示保留） */
  SYSTEM_HELLO = 'SystemHello',
  /** app-system：用户管理 */
  SYSTEM_USER = 'User',
  /** app-system：角色管理 */
  SYSTEM_ROLE = 'Role',
  /** app-system：菜单管理 */
  SYSTEM_MENU = 'Menus',
  /** app-system：个人中心（隐藏页） */
  SYSTEM_USER_CENTER = 'UserCenter',
  /** app-system：嵌套菜单（目录） */
  SYSTEM_NESTED = 'Nested',
  /** app-system：嵌套菜单-1 */
  SYSTEM_NESTED_MENU1 = 'NestedMenu1',
  /** app-system：嵌套菜单-2（目录） */
  SYSTEM_NESTED_MENU2 = 'NestedMenu2',
  /** app-system：嵌套菜单-2-1 */
  SYSTEM_NESTED_MENU2_1 = 'NestedMenu2-1',
  /** app-system：嵌套菜单-3（目录） */
  SYSTEM_NESTED_MENU3 = 'NestedMenu3',
  /** app-system：嵌套菜单-3-1 */
  SYSTEM_NESTED_MENU3_1 = 'NestedMenu3-1',
  /** app-system：嵌套菜单-3-2（目录） */
  SYSTEM_NESTED_MENU3_2 = 'NestedMenu3-2',
  /** app-system：嵌套菜单-3-2-1 */
  SYSTEM_NESTED_MENU3_2_1 = 'NestedMenu3-2-1'
}
