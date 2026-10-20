// 控制台信息（原 src/main.ts 副作用迁移，随包首载执行一次）
import './sys/console'

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
