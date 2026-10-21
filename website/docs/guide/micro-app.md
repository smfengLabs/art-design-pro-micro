---
title: 微应用接入指南
description: 把一个微应用接进宿主，同时保留独立单飞能力
---

# 微应用接入指南

本页把 [核心架构说明](/docs/architecture/) 里的契约落到「一个子应用如何接进宿主」这件事上。推荐用脚手架；已有一个应用要迁移进来时，按下面的手工清单逐项对齐。

## 1. 两条路径

| 场景 | 做法 |
| --- | --- |
| 全新业务应用 | `pnpm app:create --name app-order --port 3102`（全自动，见 [CLI 脚手架使用](/docs/guide/cli)） |
| 已有应用迁入 | 以 `templates/app-template` 为参照，逐项对齐 expose / 注册表 / 身份配置 / 启动参数 |

`templates/app-template` 是**唯一模板源**：登录页复用公共组件、欢迎页与空路由，不含业务代码。请不要在模板上开发业务，也不要在生成的应用里保留应用级登录页（登录统一由公共包 `ArtUnifiedLogin` 提供，脚手架对此有守卫）。

## 2. 子应用的对外契约

一个子应用只向宿主暴露**路由**这一个入口：

```ts
// packages/app-config/src/vite/remote.ts
exposes: {
  './routes': './src/routes.ts'
}
```

`src/routes.ts` 导出的是标准 `RouteRecordRaw[]`（默认导出与具名导出皆可，宿主侧做了兼容）：

```ts
import type { RouteRecordRaw } from 'vue-router'
import { RouteName } from '@art/app-utils'

export const orderRoutes: RouteRecordRaw[] = [
  {
    path: '/order',
    name: RouteName.ORDER,
    component: () => import('@art/app-components/layouts'),
    redirect: '/order/home',
    meta: { title: 'Order', icon: 'ri:home-4-line', collapseSingleChild: true },
    children: [
      {
        path: 'home',
        name: RouteName.ORDER_HOME,
        component: () => import('./views/home/index.vue'),
        meta: { title: 'menus.home.title', icon: 'ri:home-4-line', keepAlive: true }
      }
    ]
  }
]

export default orderRoutes
```

三条硬约束：

1. **根路径前缀**与 `RouteName` 前缀由应用名推导（`app-order` → `/order` → `ORDER_*`），枚举集中在 `packages/app-utils/src/enums/routeName.ts`。
2. 路由里的 `component` 一律用异步 `() => import(...)`，宿主的悬停预加载与超时保护都建立在 loader 上。
3. 布局壳固定引用 `@art/app-components/layouts`，菜单图标写 `ri:xxx` 字符串即可（构建期自动注入）。

## 3. 宿主如何发现它

`packages/app-config/src/vite/remotes.ts` 是唯一清单，dev / prod 各一条：

```ts
dev:  [{ alias: 'app-order', manifestUrl: 'http://localhost:3102/mf-manifest.json', moduleId: 'app-order/routes' }]
prod: [{ alias: 'app-order', manifestUrl: 'https://app-order.qxiangkj.cn/mf-manifest.json', moduleId: 'app-order/routes' }]
```

- `alias` 必须与 `vite.config.ts` 的 MF `name` 一致，`moduleId` 必须是 `<alias>/routes`。
- 生产 `manifestUrl` 必须是绝对地址，否则 `resolveRemoteEntries()` 直接抛错。
- 宿主 `apps/app-main/src/main.ts` 只写 `remoteRouteSources: createRemoteRouteSources(__MF_REMOTE_REGISTRY__)`，**不需要**为每个新应用改宿主代码。

::: tip 改了 remotes.ts 之后
`define` 注入发生在构建期，主应用 dev server 需要重启才能读到新注册表；同时别忘了 `pnpm install`，让 workspace 认识新包。
:::

## 4. 独立单飞：启动参数

子应用自己的 `src/main.ts` 用 `standalone: true` 起一份完整壳，脱离宿主也能登录、渲染 Layout：

```ts
import 'element-plus/dist/index.css'      // 共享组件的样式必须最先全量引入一次
import '@art/app-components/iconify'      // 离线图标集注册（子路径，避免拉整个组件库）
import '@styles/core/tailwind.css'
import '@styles/index.scss'

bootstrapApp({
  appName: 'app-order',
  appCode: 'app_order',
  standalone: true,
  App,
  staticRoutes: standaloneStaticRoutes,   // /、/login、/auth/*、404 等仅独立运行需要的路由
  homePath: '/order/home',
  asyncRouteSource: orderRoutes,
  remoteRouteSources: [],                 // 子应用不聚合别的 remote
  dynamicRemotes: [],
  localComponents: {
    componentGlob: import.meta.glob('./views/**/*.vue'),
    layoutComponent: () => import('@art/app-components/layouts')
  }
})
```

宿主侧**不加载**子应用的 `main.ts`，只消费它的 `./routes`。因此 `main.ts` 是「独立运行入口」，`routes.ts` 是「被聚合的对外契约」，两者职责不要混。

`appCode` 必须与 `.env` 的 `VITE_APP_CODE` 一致：后端按 `appCode` 隔离数据与权限，不一致会表现为独立登录后接口 401 / 403。

## 5. 构建与部署配置

| 配置 | 位置 | 说明 |
| --- | --- | --- |
| MF name | `apps/<app>/vite.config.ts` | `createRemoteConfig({ base: '/', name: 'app-order' })` |
| 资源根路径 | `apps/<app>/.env.production` | `VITE_REMOTE_PUBLIC_PATH = https://app-order.qxiangkj.cn/`，子应用资源必须从自身域名根路径解析，否则宿主里 chunk 404 |
| 端口 | `apps/<app>/.env` | `VITE_PORT`，脚手架会检查是否与现有应用冲突 |
| 应用编码 | `apps/<app>/.env` | `VITE_APP_CODE`，与 `main.ts` 的 `appCode` 同步 |
| 别名 | `apps/<app>/tsconfig.json` | `@/*` 指向本应用 `src`，`@art/app-*` 指向 workspace 源码 |

构建与发布顺序（很重要）：

```bash
pnpm --filter @art/app-order build   # 1. 先出子应用产物并部署到其域名
# 2. 确认 https://app-order.qxiangkj.cn/mf-manifest.json 可访问
pnpm --filter app-main build         # 3. 再构建宿主，让产物包含最新注册表
```

若实际域名与约定不同，同时改 `.env.production` 的 `VITE_REMOTE_PUBLIC_PATH` 与 `remotes.ts` 的 `prod.manifestUrl`；`app-system` 还可通过宿主侧 `VITE_REMOTE_APP_SYSTEM_URL` 临时覆盖。

## 6. 接入自检清单

```bash
pnpm install
pnpm typecheck && pnpm depcruise && pnpm build
```

- [ ] 独立运行：`http://localhost:3102` 出现登录页，登录后进入 `/#/order/home`。
- [ ] 宿主聚合：`http://localhost:3006` 登录后左侧菜单出现 Order，点击进入 `/#/order/home`。
- [ ] 控制台无 `[MF] …` 超时或加载失败日志。
- [ ] 菜单图标正常（无需任何生成脚本）。
- [ ] `depcruise` 无 `no-cross-app-*` / `no-package-to-app` 违规。
- [ ] `pnpm app:list` 能看到新应用且端口正确。

## 7. 接入期常见现象

| 现象 | 先查 |
| --- | --- |
| 宿主菜单里没有它 | 是否 `pnpm install`；`remotes.ts` 是否有 dev 注册项；宿主 dev server 是否重启 |
| 点击菜单卡在全屏 loading | 远端 chunk 挂起，看 `[MF] …路由组件加载（超时）`；确认子应用 dev server 与 `mf-manifest.json` 可达 |
| 页面渲染失败但宿主不白屏 | `ArtErrorBoundary` 已兜底，看子应用侧真实报错 |
| 子应用样式 / 图标丢失 | `main.ts` 是否最先引入 `element-plus/dist/index.css` 与 `@art/app-components/iconify` |
| 独立登录 401 / 403 | `VITE_APP_CODE` 与 `main.ts` 的 `appCode` 是否一致，后端是否注册该 `appCode` |
| 出现第二个 Vue / Pinia 实例 | 是否新增了未进 `mfSharedConfig` 的强耦合依赖，或绕开 catalog 手写版本 |

完整排查见 [常见问题](/docs/faq)。
