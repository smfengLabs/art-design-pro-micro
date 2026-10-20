/**
 * @art/app-components/layouts —— host/remote 共用布局壳
 *
 * origin `src/views/index/index.vue`（真实 UI：侧边栏菜单 / 顶栏 / 标签页 / 内容区）
 * 物理迁入包内；内部组件（菜单、设置面板、锁屏等）同包 `layouts/**`，
 * 基础件（ArtLogo/ArtSvgIcon）在 `base/**`、其他在 `widget/**`、`others/**`、`text-effect/**`。
 *
 * 消费方（v2 E1 / G2）：
 * - host（app-main）：localComponents.layoutComponent 注入（ComponentLoader.loadLayout）
 * - remote（app-system）：routes.ts 一级路由 component: () => import('@art/app-components/layouts')
 *
 * @module app-components/layouts
 */
export { default } from './art-layout/index.vue'
