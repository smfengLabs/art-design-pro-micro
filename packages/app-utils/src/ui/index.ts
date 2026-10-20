/**
 * UI 工具统一导出
 *
 * 层 0（@art/app-utils）仅保留与业务无关的纯工具：
 * - tabs：标签页样式配置
 * - emojo：EmojiText 表情渲染组件（默认导出转具名，供根入口中转）
 *
 * 注：colors/loading/animation 依赖 AppConfig/Store，已归属 @art/app-core。
 *
 * @module app-utils/ui/index
 */
export * from './tabs'
export { default as EmojiText } from './emojo'
