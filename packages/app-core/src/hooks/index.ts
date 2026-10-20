/**
 * Hooks 统一导出（原 hooks/index.ts）
 *
 * 注：useChart 依赖 echarts 实例（宿主插件），已归属 apps/app-main/src/hooks/core/useChart.ts。
 *
 * @module hooks/index
 */
// 通用功能集成
export { useCommon } from './core/useCommon'

// 应用模式
export { useAppMode } from './core/useAppMode'

// 权限控制
export { useAuth } from './core/useAuth'

// 表格数据管理集成
export { useTable } from './core/useTable'

// 表格列配置管理
export { useTableColumns, getColumnKey } from './core/useTableColumns'

// 表格高度自动计算
export { useTableHeight, useTableAutoHeight } from './core/useTableHeight'

// 主题管理
export { useTheme, initializeTheme } from './core/useTheme'

// 彩带+烟花管理
export { useCeremony } from './core/useCeremony'

// 快捷导航管理
export { useFastEnter } from './core/useFastEnter'

// 顶栏功能管理
export { useHeaderBar } from './core/useHeaderBar'

// 页面高度
export { useLayoutHeight, useAutoLayoutHeight } from './core/useLayoutHeight'
