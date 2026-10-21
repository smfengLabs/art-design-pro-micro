interface UpgradeLog {
  version: string // 版本号
  title: string // 更新标题
  date: string // 更新日期
  detail?: string[] // 更新内容
  requireReLogin?: boolean // 是否需要重新登录
  remark?: string // 备注
}

export const upgradeLogList = ref<UpgradeLog[]>([
  {
    version: 'v1.4.0',
    title: '核心固本与全自动工作流',
    date: '2026-10-21',
    detail: [
      '新增：独立示例微应用 app-example，集中展示组件库与高可用业务模板',
      '重构：脚手架复制源切换为 templates/app-template 纯模板，系统业务与模板彻底隔离',
      '新增：pr:auto 全自动 PR 脚本，一键推送 GitHub/Gitee 并创建、尝试合并 PR',
      '加固：app-main / app-system / app-template 防删守卫，禁止物理删除核心支柱',
      '优化：移除冗余测试应用 app-article，精简 workspace 与 MF 注册表'
    ]
  },
  {
    version: 'v1.3.0',
    title: '版本管理与质量门禁',
    date: '2026-10-21',
    detail: [
      '新增：Changesets 版本变更管理，规范记录每次迭代的版本影响',
      '新增：GitHub Actions CI 门禁，PR 自动执行类型检查、架构校验与生产构建'
    ]
  },
  {
    version: 'v1.2.0',
    title: '微应用预加载与路由秒开体验',
    date: '2026-10-21',
    detail: ['新增：微应用预加载能力，实现路由秒开']
  },
  {
    version: 'v1.1.0',
    title: '健壮性提升与微前端错误隔离',
    date: '2026-10-21',
    detail: [
      '新增：全局 ErrorBoundary 组件，隔离子应用运行时错误，防止主应用白屏',
      '优化：版本号规范化管理'
    ]
  },
  {
    version: 'v1.0.0',
    title: '微前端架构开源首发',
    date: '2026-10-20',
    detail: [
      '重构：基于 Monorepo + Vite + Module Federation 2.0 的底层架构',
      '新增：主应用与子应用独立登录、独立部署能力',
      '新增：全局 WebSocket 单例与跨端数据实时同步',
      '优化：移除核心依赖 vueuse，重写原生 ResizeObserver 解决微前端高度计算断裂问题',
      '优化：解决微前端下 ArtTable 高度计算失效与分页遮挡问题',
      '优化：废除 mf:// 字符串协议，实现标准 RouteRecordRaw[] 路由契约',
      '构建：内建 dependency-cruiser 依赖门禁与产物审计脚本，彻底杜绝双实例'
    ]
  }
])
