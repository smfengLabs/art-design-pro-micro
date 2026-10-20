// 包间依赖方向约束：按真实 import 裁决，拦截反向依赖、跨应用引用与装配面穿透
export default {
  forbidden: [
    { name: 'no-circular', severity: 'error', from: {}, to: { circular: true } },

    {
      name: 'no-package-to-app',
      severity: 'error',
      from: { path: '^packages/app-(base|core|api|utils|components|config)/' },
      to: { path: '^apps/' }
    },

    // 排除自身；新增 remote 时按 app 名追加
    {
      name: 'no-cross-app-from-main',
      severity: 'error',
      from: { path: '^apps/app-main/' },
      to: { path: '^apps/(?!app-main/)' }
    },
    {
      name: 'no-cross-app-from-system',
      severity: 'error',
      from: { path: '^apps/app-system/' },
      to: { path: '^apps/(?!app-system/)' }
    },

    // 层序：utils < api < core < components < base
    {
      name: 'app-utils-no-internal-deps',
      severity: 'error',
      from: { path: '^packages/app-utils/' },
      to: { path: '^packages/(?!app-utils/)' }
    },
    {
      name: 'app-api-only-utils',
      severity: 'error',
      from: { path: '^packages/app-api/' },
      to: { path: '^packages/(?!app-utils/|app-api/)' }
    },
    {
      name: 'app-core-only-lower',
      severity: 'error',
      from: { path: '^packages/app-core/' },
      to: { path: '^packages/(?!app-utils/|app-api/|app-core/)' }
    },
    {
      name: 'app-components-only-lower',
      severity: 'error',
      from: { path: '^packages/app-components/' },
      to: { path: '^packages/(?!app-utils/|app-api/|app-core/|app-components/)' }
    },
    {
      name: 'app-base-only-lower',
      severity: 'error',
      from: { path: '^packages/app-base/' },
      to: { path: '^packages/(?!app-utils/|app-api/|app-core/|app-components/|app-base/)' }
    },

    // assembly 仅允许 app-base 触达
    {
      name: 'core-assembly-only-via-app-base',
      severity: 'error',
      from: { path: '^(apps/|packages/app-(?!core/|base/)[^/]+/)' },
      to: { path: '^packages/app-core/src/(bootstrap[.]ts$|router/guards/|store/create[.]ts$)' }
    },

    // reachable: true 拦截经中间模块间接引用 assembly
    {
      name: 'remote-exposes-no-assembly',
      severity: 'error',
      from: { path: '^apps/app-system/src/(routes[.]ts$|views/|api/|components/)' },
      to: {
        path: '^(packages/app-base/|packages/app-core/src/(bootstrap[.]ts$|router/guards/|store/create[.]ts$))',
        reachable: true
      }
    },

    {
      name: 'app-config-buildtime-only',
      severity: 'error',
      from: { path: '^(apps/[^/]+/src/|packages/app-(?!config/)[^/]+/src/)' },
      to: { path: '^packages/app-config/' }
    }
  ],
  options: {
    tsConfig: { fileName: 'tsconfig.base.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default']
    },
    doNotFollow: { path: 'node_modules' },
    // origin-code 为参考源码，不参与构建
    exclude: { path: '(node_modules|dist|origin-code|docs|scripts)' }
  }
}
