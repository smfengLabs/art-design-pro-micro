/**
 * 类型定义统一导出模块
 * 提供全局类型定义的统一导出入口
 *
 * @module types/index
 * @author Art Design Pro Team
 */

/// <reference path="./api/api.d.ts" />

/** 通用类型定义（基础类型、工具类型等） */
export * from './common/index'

/** 组件相关类型定义 */
export * from './component/index'

/** 状态管理相关类型定义 */
export * from './store/index'

/** 路由相关类型定义 */
export * from './router/index'

/** 配置相关类型定义 */
export * from './config/index'
