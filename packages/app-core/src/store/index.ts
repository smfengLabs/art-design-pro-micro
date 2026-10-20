/**
 * Store 统一导出（原 store/index.ts 拆分为 create.ts + 本文件）
 *
 * @module store/index
 */
// 注意：pinia 实例与装配（create.ts）属于装配面，经 '@art/app-core/bootstrap' 暴露；
// 本文件仅聚合 store 模块（remote 可达闭包安全，DAG 规则 6）。
export * from './modules/menu'
export * from './modules/setting'
export * from './modules/table'
export * from './modules/user'
export * from './modules/worktab'
