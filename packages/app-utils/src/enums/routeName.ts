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
  SYSTEM_NESTED_MENU3_2_1 = 'NestedMenu3-2-1',
  /** app-article：业务路由（脚手架生成） */
  ARTICLE = 'Article',
  ARTICLE_USER = 'ArticleUser',
  ARTICLE_ROLE = 'ArticleRole',
  ARTICLE_USER_CENTER = 'ArticleUserCenter',
  ARTICLE_MENU = 'ArticleMenu'
}
