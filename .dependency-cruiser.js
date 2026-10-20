// .dependency-cruiser.js —— 包间方向约束（按真实 import 裁决；pnpm workspace 解析）
export default {
  forbidden: [
    // ── 1. 禁止环（含跨包环）──
    { name: 'no-circular', severity: 'error', from: {}, to: { circular: true } },

    // ── 2. packages 禁止依赖 apps（反向依赖总闸门）──
    {
      name: 'no-package-to-app',
      severity: 'error',
      from: { path: '^packages/app-(base|core|api|utils|components|config)/' },
      to: { path: '^apps/' }
    },

    // ── 3. apps 之间禁止互引（跨 app 只能走 MF expose）──
    // 负向先行断言排除自身；新增 remote 时按 app 名对称追加（或由 CI 脚本按 apps/ 目录生成）：
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

    // ── 4. 包间层序白名单（低层禁止 import 高层；白名单含自身以放行包内文件互引）──
    // 层 0: app-utils（不得 import 任何其他 @art/* 包）
    {
      name: 'app-utils-no-internal-deps',
      severity: 'error',
      from: { path: '^packages/app-utils/' },
      to: { path: '^packages/(?!app-utils/)' }
    },
    // 层 1: app-api（只许 app-utils）
    {
      name: 'app-api-only-utils',
      severity: 'error',
      from: { path: '^packages/app-api/' },
      to: { path: '^packages/(?!app-utils/|app-api/)' }
    },
    // 层 2: app-core（只许 app-utils + app-api）
    {
      name: 'app-core-only-lower',
      severity: 'error',
      from: { path: '^packages/app-core/' },
      to: { path: '^packages/(?!app-utils/|app-api/|app-core/)' }
    },
    // 层 2.5: app-components（只许 app-utils + app-api + app-core）
    {
      name: 'app-components-only-lower',
      severity: 'error',
      from: { path: '^packages/app-components/' },
      to: { path: '^packages/(?!app-utils/|app-api/|app-core/|app-components/)' }
    },
    // 层 3: app-base（只许 app-utils + app-api + app-core + app-components）
    {
      name: 'app-base-only-lower',
      severity: 'error',
      from: { path: '^packages/app-base/' },
      to: { path: '^packages/(?!app-utils/|app-api/|app-core/|app-components/|app-base/)' }
    },

    // ── 5. app-core 装配面（assembly）只能由 app-base 触达 ──
    //   assembly = bootstrap.ts（装配聚合出口）+ router/guards/（守卫注册）+ store/create.ts（pinia 实例创建）
    //   from = 除 app-base / app-core 自身外的所有代码（apps 与其余包都不得直接 import assembly）
    {
      name: 'core-assembly-only-via-app-base',
      severity: 'error',
      from: { path: '^(apps/|packages/app-(?!core/|base/)[^/]+/)' },
      to: { path: '^packages/app-core/src/(bootstrap[.]ts$|router/guards/|store/create[.]ts$)' }
    },

    // ── 6. remote 暴露面纯净性（守卫重复/双实例坑在包结构层的根治）──
    //   remote 的 exposes 相关目录（routes.ts/views/api/components）不得【传递可达】
    //   app-base（bootstrap 装配）与 app-core 装配面；reachable: true = 传递可达判定
    //   （防经中间模块间接引用装配面——这是守卫重复执行坑的机器化拦截）
    {
      name: 'remote-exposes-no-assembly',
      severity: 'error',
      from: { path: '^apps/app-system/src/(routes[.]ts$|views/|api/|components/)' },
      to: {
        path: '^(packages/app-base/|packages/app-core/src/(bootstrap[.]ts$|router/guards/|store/create[.]ts$))',
        reachable: true
      }
    },

    // ── 7. app-config 只允许构建期消费（各 app 的 vite.config.ts / 根脚本），源码不得 import ──
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
    // origin-code 为官方原版参考源码（不参与构建），docs/scripts 为预留目录
    exclude: { path: '(node_modules|dist|origin-code|docs|scripts)' }
  }
}
