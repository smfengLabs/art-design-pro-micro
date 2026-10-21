// 纯数据与纯函数入口：不执行任何运行时副作用，
// UI 初始化（图标注册、控制台信息等）由应用装配层负责。

// 常量（links）与全局约定（路由别名 / 接口状态码）
export * from './constants'
export * from './constants/routesAlias'
export * from './constants/status'

// 枚举
export * from './enums'

// 类型（含 ambient Api 命名空间引用）
export * from './types'

// 纯工具
export * from './form'
export * from './table'
export * from './ui'
export * from './sys'
