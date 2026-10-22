/** 登录 UI 收集的表单数据（不包含任何业务字段或凭据预设） */
export interface LoginFormData {
  /** 用户名 */
  username: string
  /** 密码 */
  password: string
  rememberPassword: boolean
}
