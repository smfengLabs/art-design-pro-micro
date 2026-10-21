---
title: 核心架构说明
description: Art Design Pro Micro 的分层、依赖边界、MF 装配与运行时约束
---

# 核心架构说明

Art Design Pro Micro 由 **Monorepo + Vite 7 + Module Federation 2.0** 构建。目标不是把页面拆成多个仓库，而是把「独立部署」和「统一体验」同时做成默认可用的能力，并让每一条边界都能被命令验证。

## 1. 分层拓扑

```text
        ┌──────────────────────────────────────────┐
        │  apps/app-main（唯一宿主）                │
        │  ├─ apps/app-system（remote · 系统管理）  │
        │  └─ apps/app-example（remote · 示例资产） │
        └───────────────┬──────────────────────────┘
                        │ 只用，不反填
   base ────────────────┴──────── 启动基座：bootstrapApp / 远程路由源
   components ─────────────────── 公共 UI、Layout 壳、错误边界
   core ───────────────────────── 路由内核、守卫、Pinia、预加载、错误处理
   api ────────────────────────── 统一 HTTP 层 + 全局 WebSocket 单例
   utils ──────────────────────── 纯工具 + RouteName 全局契约（禁止 UI 依赖）
```

| 单元 | 角色 | 关键职责 |
| --- | --- | --- |
| `apps/app-main` | Host | 登录、全局路由调度、仪表盘、异常兜底 |
| `apps/app-system` | Remote | 系统管理与权限，可独立运行 |
| `apps/app-example` | Remote | 组件库与业务模板示例，开源演示核心资产 |
| `templates/app-template` | 模板源 | 登录页 + 欢迎页 + 空路由，`app:create` 的唯一复制源 |
| `packages/app-core` | 核心 | 路由控制、全局守卫、Pinia、预加载、错误处理 |
| `packages/app-api` | 基础设施 | 统一 HTTP 请求层、全局 WebSocket 单例 |
| `packages/app-components` | 设计系统 | 跨应用共享 UI、Layout 壳、`ArtErrorBoundary` |
| `packages/app-utils` | 工具层 | 纯工具函数、枚举、全局 `RouteName` 契约 |
| `packages/app-base` | 启动基座 | 应用启动、远端加载与运行时装配 |
| `packages/app-config` | 构建配置 | Vite / Tailwind / Module Federation 统一配置 |

## 2. 依赖方向由规则裁决

依赖必须从高层流向低层，禁止反向依赖与跨应用源码引用：

```text
app-utils  ←  app-api  ←  app-core  ←  app-components  ←  app-base
```

`.dependency-cruiser.js` 把这句话变成了可执行的门禁，`pnpm depcruise` 在本地与双端 CI 中强制通过：

| 规则 | 拦截的行为 |
| --- | --- |
| `no-package-to-app` | 任何 `packages/*` 反向 import `apps/*` |
| `no-cross-app-from-main` / `no-cross-app-from-system` | 应用之间互相引用源码（分布式单体前兆） |
| `app-utils-no-framework-runtime-deps`(+`-pnpm`) | `app-utils` 引入 Vue / Element Plus / Pinia / axios 等运行时 |
| `app-utils-no-iconify-runtime-deps-pnpm` | `app-utils` 引入图标运行时依赖 |
| `app-api-no-ui-framework-deps`(+`-pnpm`) | `app-api` 引入 UI 框架 |
| `app-utils-no-internal-deps` / `app-api-only-utils` / `app-core-only-lower` / `app-components-only-lower` / `app-base-only-lower` | 层序穿透，强制单向依赖链 |
| `core-assembly-only-via-app-base` | 绕过基座直接引用 `bootstrap.ts` / `router/guards/` / `store/create.ts` 装配面 |
| `remote-exposes-no-assembly` | 子应用暴露面经中间模块**间接**触达装配面（`reachable: true`） |
| `app-config-buildtime-only` | 运行时代码 import 仅构建期可用的 `app-config` |
| `no-circular` | 任何循环依赖 |

::: warning 新增 remote 时
`no-cross-app-from-<app>` 按应用名逐个声明。脚手架生成的应用彼此不引用，通常无需改动；确实需要新约束时，请显式追加规则而不是放宽既有规则。`website/` 目录已被排除在拓扑检查之外，文档站不参与运行时依赖判定。
:::

## 3. Module Federation 2.0 装配

配置统一收敛在 `packages/app-config`：

- `createMainConfig()`（宿主）：`name: 'app-main'`、`remotes: createRemotes(isDev, env)`、`shared: mfSharedConfig`、`shareStrategy: 'loaded-first'`、`manifest: true`、`dts: false`。
- `createRemoteConfig({ name, base })`（子应用）：`exposes: { './routes': './src/routes.ts' }`、同一份 `shared`、`publicPath` 取子应用自身域名（`VITE_REMOTE_PUBLIC_PATH`）、`dev.remoteHmr: true`。
- 之所以用 `loaded-first`：插件默认的 `version-first` 会在宿主 `initializeSharing` 阶段对全部 remote 执行 `initRemoteModule`，启动期就拉取远端 entry 并执行远端整图（双运行时风险）。`loaded-first` 下共享解析优先命中已加载的 provider（宿主），remotes 惰性加载。

`mfSharedConfig` 的内核单例清单：

```ts
vue / 'vue/' / vue-router / pinia / pinia-plugin-persistedstate /
vue-i18n / element-plus / axios /
'@iconify/vue/offline' / 'vue-draggable-plus' /
'@art/app-utils' / '@art/app-api' / '@art/app-core' / '@art/app-base' / '@art/app-components'
```

::: tip 为什么把 @iconify/vue/offline 与 vue-draggable-plus 也列为 singleton
它们运行时强耦合渲染期的 `currentInstance` / `onMounted` / `ref` 归一化。若被远端 dev 预打包成独立副本，会带进第二个 Vue 运行时，表现为拖拽 Sortable 初始化失败、图标数据更新失效。
:::

`requiredVersion` 不手写：`getCatalogVersion()` 直接读取 `pnpm-workspace.yaml` 的 `catalog` 段，缺失即 fail-fast，确保「锁版本表」与「MF 共享清单」永远同源。

## 4. 远程注册表与路由聚合

唯一的 remote 清单在 `packages/app-config/src/vite/remotes.ts`：

```ts
export const remoteRegistry = {
  dev: [
    { alias: 'app-system', manifestUrl: 'http://localhost:3101/mf-manifest.json', moduleId: 'app-system/routes' },
    { alias: 'app-example', manifestUrl: 'http://localhost:3105/mf-manifest.json', moduleId: 'app-example/routes' }
    // SCAFFOLD_REMOTES_DEV
  ],
  prod: [
    { alias: 'app-system', manifestUrl: 'https://app-system.qxiangkj.cn/mf-manifest.json', moduleId: 'app-system/routes' },
    { alias: 'app-example', manifestUrl: 'https://app-example.qxiangkj.cn/mf-manifest.json', moduleId: 'app-example/routes' }
    // SCAFFOLD_REMOTES_PROD
  ]
}
```

- `resolveRemoteEntries()` 在生产环境强制绝对地址，否则抛错；`app-system` 允许宿主侧 `VITE_REMOTE_APP_SYSTEM_URL` 覆盖。
- 构建期由 `define` 注入 `__MF_REMOTE_REGISTRY__`（同批注入 `__APP_VERSION__`，取自仓库根 `VERSION`）。
- 宿主只消费一行注册表，新增子应用不必改 `main.ts`：

```ts
bootstrapApp({
  remoteRouteSources: createRemoteRouteSources(__MF_REMOTE_REGISTRY__)
  // …
})
```

`createRemoteRouteSources()`（`packages/app-base/src/remotes.ts`）为每个注册项生成 `load` / `preload`：

- `load` 走 `loadRemoteFromManifest(moduleId, manifestUrl, { cacheTtl: 30_000 })`，**3s 超时 + 1 次重试（间隔 600ms）**，兼容「expose 默认导出」与「直接返回值」两种形态。
- 递归为远端路由的组件 loader 包一层超时：远端 chunk 挂起时 vue-router 的导航 Promise 永不结算，会留下全屏 loading；超时拒绝后进入 `router.onError` 兜底链路。
- 递归打上 `__mfRemoteAlias` 来源标记（与 `app-core` 的 `MF_REMOTE_ALIAS_META_KEY` 同一字面量；内联实现是为了避免 `app-base → app-core` 跨 MF 边界的运行时循环依赖）。
- 单个 remote 加载失败由 `MenuProcessor` 侧 `Promise.allSettled` 隔离，不阻断宿主启动。

## 5. 秒开：两级预加载

| 级别 | 触发时机 | 行为 |
| --- | --- | --- |
| 空闲预热 | 用户进入认证后的主应用 | `requestIdleCallback(run, { timeout: 2500 })`（Safari / 旧浏览器降级 `setTimeout 1200ms`）依次拉取各 remote 的 manifest / remoteEntry / routes 并写入 MF 运行时缓存；in-flight 去重 |
| 悬停预热 | 鼠标进入远程应用菜单 | 递归收集该菜单树的异步组件 loader 并静默加载，`WeakSet` 去重，失败只 `console.debug`，交由真实导航兜底 |

只有全部成功才标记完成；任一失败保留后续导航重试的机会，并设置 30s 退避窗口，避免远端持续不可达时每次导航都打请求。

## 6. 韧性与故障隔离

- **渲染层**：`ArtErrorBoundary` 用 `onErrorCaptured` 捕获子组件渲染/执行异常并返回 `false` 阻止继续冒泡，展示「模块加载失败 / 刷新重试」而不是整页白屏。
- **全局层**：`packages/app-core/src/error-handle.ts` 注册 Vue 运行时错误、脚本错误、`unhandledrejection` 与资源加载错误处理，并过滤无排查价值的噪声（`ResizeObserver loop …`、扩展注入的跨域 `Script error.`）。
- **导航层**：远端组件 loader 超时保护 + 路由错误兜底，子应用不可达只影响它自己的菜单项。
- **状态层**：Pinia / Token / 权限经 singleton 共享，跨应用无需二次登录；全局 WebSocket 单例 + `mitt` 事件总线驱动跨微应用的数据刷新，消费端只刷新不再二次广播，避免回流死循环。
- **观测层**：布局高度观测使用原生 `ResizeObserver` 直接观测表头与分页器元素，不依赖容易产生跨实例问题的第三方 Hook，适配微前端异步挂载。

## 7. 图标全自动注入

历史上图标依赖手动脚本生成离线 JSON，忘记执行就会线上白屏。现在改为构建期自动提取：

```text
扫描 apps/ + packages/ + templates/ 源码
   ↓ 正则提取 `prefix:name` 字符串（ri:dashboard-line 等）
   ↓ 从 @iconify/json 按需取 icons/aliases（补齐 alias 父图标）
   ↓ 生成虚拟模块 virtual:art-iconify
   ↓ @art/app-components/iconify 调 addCollection 注册到运行时
```

- 插件 `art:auto-iconify`（`packages/app-config/src/vite/iconify-auto.ts`，`enforce: 'pre'`）与 `unplugin-icons` 并存：后者服务静态 `~icons/*` 组件导入，前者服务无法被静态分析的动态字符串。
- dev 阶段监听各 workspace 包的 `src`（不监听 `dist`，避免构建写产物触发全量刷新），图标集合指纹变化时失效虚拟模块并 `full-reload`。
- 扫描范围覆盖**所有**应用，因此宿主也能渲染远端菜单图标；新子应用零配置，`scripts/create-app.mjs` 会拒绝把 `iconify` 脚本或 `@iconify-json/*` 依赖带进生成的应用。

## 8. 工程约定

| 约定 | 位置 | 目的 |
| --- | --- | --- |
| catalog 单版本锁 | `pnpm-workspace.yaml` | 内核依赖全仓库唯一版本，与 MF `requiredVersion` 同源 |
| 依赖补丁 | `patches/vite-plugin-federation@1.0.2.patch` | 锁定 `getActivePinia()` 相关行为，避免远端实例解析退化 |
| 生成类型随源码提交 | `apps/*/src/types/import/`、`templates/*/src/types/import/` | fresh clone 首次 `typecheck` / `build` 无需先启动 Vite |
| `VERSION` 单一来源 | 仓库根 `VERSION` → `__APP_VERSION__` | 运行时版本展示与发版一致 |
| Turbo 任务编排 | `turbo.json` | `build` 依赖 `typecheck`，`globalDependencies` 含 `VERSION` 与 `tsconfig.base.json` |
| 双端 CI | `.github/workflows/ci.yml`（Quality Gate：typecheck → depcruise → build）与 Gitee Go 流水线 | GitHub 与 Gitee 的 PR 必须过同一道门禁 |
| 文档站隔离 | `website/`（本目录） | 排除在依赖拓扑与构建任务之外，`pnpm docs:build` 单独校验 |

## 延伸阅读

- [快速上手](/docs/guide/getting-started)
- [CLI 脚手架使用](/docs/guide/cli)
- [微应用接入指南](/docs/guide/micro-app)：把上述契约落到一个新应用
- [常见问题](/docs/faq)：门禁报错与运行期现象的定位
