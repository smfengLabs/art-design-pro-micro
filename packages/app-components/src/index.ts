/**
 * @art/app-components 公共入口
 *
 * DAG 层 2.5：允许依赖 app-utils / app-api / app-core（本阶段仅骨架）；
 * 禁止依赖 app-base / app-config 与 apps/*。
 *
 * @module @art/app-components
 *
 * 布局壳（真实 UI）：export { default } from './layouts/art-layout/index.vue'
 */
export { default as ArtLayout } from './layouts'
