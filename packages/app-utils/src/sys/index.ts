/**
 * 系统级工具统一导出
 *
 * 层 0：仅 mittBus 事件总线（纯依赖 mitt）。
 * 注：systemUpgrade 依赖用户 Store，已归属宿主 apps/app-main/src/utils/sys/upgrade.ts。
 *
 * @module app-utils/sys/index
 */
export { default as mittBus } from './mittBus'
