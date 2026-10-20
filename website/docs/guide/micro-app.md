---
title: 微应用接入指南
description: 在 Art Design Pro Micro 中新增一个可独立部署的子应用
---

# 微应用接入指南

以下以新增 `app-analytics` 为例。目标不是“能加载”，而是同时满足：

- 可被 `app-main` 作为 Remote 聚合；
- 可用独立域名、独立 Layout、独立登录页单飞；
- 与宿主共享同一套 Vue、Pinia、Router 运行时；
- 通过依赖方向和路由 Name 契约通过 CI 校验。

## 1. 创建应用目录

从 `apps/app-system` 复制一份作为起点：

```bash
cp -r apps/app-system apps/app-analytics
```

修改 `apps/app-analytics/package.json` 中的 `name`，并确保依赖仍然使用 workspace 协议。`pnpm-workspace.yaml` 已包含 `apps/*`，不需要额外注册。

```json
{
  "name": "app-analytics"
}
```

## 2. 配置独立运行入口

子应用需要保留自己的 `src/main.ts`、`App.vue` 与登录路由。使用 `bootstrapApp` 装配：

```ts
bootstrapApp({
  appName: 'app-analytics',
  App,
  staticRoutes,
  homePath: '/analytics/overview',
  asyncRouteSource: analyticsRoutes,
  remoteRouteSources: [],
  dynamicRemotes: [],
  localComponents: {
    componentGlob: import.meta.glob('./views/**/*.vue'),
    layoutComponent: () => import('@art/app-components/layouts')
  }
})
```

`asyncRouteSource` 同时服务于独立运行与宿主聚合，避免维护两套路由。

## 3. 暴露 Remote 模块

`packages/app-config/src/vite/remote.ts` 当前以 `app-system` 为模板。新增应用时：

1. 把 `federation({ name: 'app-system' })` 改为新应用名。
2. 保留 `./routes` expose，宿主通过它获取路由。
3. 共享配置继续复用 `mfSharedConfig`，不要自行复制一份 shared 清单。

```ts
federation({
  name: 'app-analytics',
  exposes: {
    './routes': './src/routes.ts'
  },
  shared: mfSharedConfig,
  shareStrategy: 'loaded-first',
  manifest: true,
  dts: false,
  dev: { remoteHmr: true }
})
```

如果同时维护多个 Remote，建议把 `createRemoteConfig` 重构成 `createRemoteConfig({ name, exposes })`，让每个应用只传配置，不再复制工厂函数。

## 4. 注册 Remote

在 `packages/app-config/src/vite/remotes.ts` 中分别补充开发与生产地址：

```ts
export const remoteRegistry = {
  dev: [
    // ...
    {
      alias: 'app-analytics',
      manifestUrl: 'http://localhost:3102/mf-manifest.json',
      moduleId: 'app-analytics/routes'
    }
  ],
  prod: [
    // ...
    {
      alias: 'app-analytics',
      manifestUrl: '/remotes/app-analytics/mf-manifest.json',
      moduleId: 'app-analytics/routes'
    }
  ]
}
```

`alias` 必须与 federation 的 `name` 一致，`moduleId` 必须使用 `<name>/routes`。生产环境的 manifest 路径要与静态资源部署目录保持一致。

## 5. 定义路由 Name 契约

在 `packages/app-utils/src/enums/routeName.ts` 中增加全局唯一的 RouteName：

```ts
export enum RouteName {
  // ...
  ANALYTICS = 'Analytics',
  ANALYTICS_OVERVIEW = 'AnalyticsOverview'
}
```

规则：

- 路由 `name` 必须来自 `RouteName`，不要在页面里写字符串常量。
- 子应用内部路由使用自己的前缀，例如 `/analytics/*`。
- 登录、404、500 等公共路由继续复用 `RouteName.LOGIN`、`RouteName.EXCEPTION_404` 等值。

## 6. 权限与菜单

在路由 `meta` 中声明权限和菜单信息：

```ts
{
  path: 'overview',
  name: RouteName.ANALYTICS_OVERVIEW,
  component: () => import('./views/overview/index.vue'),
  meta: {
    title: 'menus.analytics.overview',
    icon: 'ri:bar-chart-line',
    roles: ['R_SUPER', 'R_ADMIN'],
    keepAlive: true,
    authList: [{ title: '导出', authMark: 'export' }]
  }
}
```

需要新增菜单文案时，在 `app-core` 的 locales 中补齐对应 key，避免运行时直接显示 i18n key。

## 7. 验证

```bash
pnpm dev
pnpm typecheck
pnpm build
pnpm depcruise
```

重点检查：

- 独立访问子应用端口，登录与 Layout 正常；
- 从宿主进入子应用，路由、Tab、主题、语言与权限正常；
- 宿主与子应用的 Vue / Pinia 实例一致；
- 没有新增反向依赖或跨 `apps` 源码引用。

## 下一步

架构分层与共享运行时的更多细节见 [架构设计](../architecture/)。接入过程中遇到问题，查看 [常见问题](../faq)。
