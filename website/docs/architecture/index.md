---
title: 架构设计
description: Art Design Pro Micro 的分层、依赖与运行时设计
---

# 架构设计

Art Design Pro Micro 由 **Monorepo + Vite + Module Federation 2.0** 构建。目标不是把页面拆成多个仓库，而是把“独立部署”和“统一体验”同时做成默认可用的能力。

## 两个维度：部署单元与共享能力

```text
apps/      可独立部署的应用单元
packages/  被应用复用的核心能力
```

| 包 | 角色 | 关键职责 |
| --- | --- | --- |
| `apps/app-main` | Host | 登录、全局路由调度、仪表盘、异常兜底 |
| `apps/app-system` | Remote | 系统管理、权限管理，可独立运行 |
| `packages/app-core` | 核心 | 路由控制、全局守卫、Pinia、权限 |
| `packages/app-api` | 基础设施 | 统一 HTTP 请求层、全局 WebSocket 单例 |
| `packages/app-components` | 设计系统 | 跨应用共享的 UI 组件与 Layout 壳 |
| `packages/app-utils` | 工具层 | 工具函数、枚举、全局 RouteName 契约 |
| `packages/app-base` | 启动基座 | 应用启动、远端加载与运行时装配 |
| `packages/app-config` | 构建配置 | Vite、Tailwind、Module Federation 统一配置 |

## 依赖方向

依赖必须从高层流向低层，禁止反向依赖与跨应用源码引用：

```text
app-utils  ←  app-api  ←  app-core  ←  app-components
                                  ↖
                                   app-base
```

- `packages` 不能依赖 `apps`。
- `apps` 之间不能互相 import，只能通过 Module Federation 暴露的模块通信。
- `app-core` 不反向依赖 `app-components`，核心逻辑与 UI 壳保持解耦。
- 依赖方向通过 `dependency-cruiser` 在本地与 CI 中强制校验。

```bash
pnpm depcruise
```

依赖图可以在 `docs/dependency-graph.dot` 中生成与查看。

## Module Federation 2.0 共享运行时

`packages/app-config/src/vite/federation.ts` 维护统一的共享清单，并读取 `pnpm-workspace.yaml` 中的 catalog 版本：

- `vue`、`vue-router`、`pinia`、`pinia-plugin-persistedstate`
- `vue-i18n`、`@vue/reactivity`、`@vue/runtime-core`、`@vue/runtime-dom`
- `element-plus`、`@iconify/vue`、`vue-draggable-plus`、`axios`
- `@art/app-utils`、`@art/app-api`、`@art/app-core`、`@art/app-base`、`@art/app-components`

所有核心包以 `singleton: true` 共享。这样宿主与子应用拿到的是同一个 Vue 运行时、同一个 Pinia 实例与同一套路由上下文，Token、用户信息和权限状态天然互通。

> 共享清单与 catalog 版本绑定。缺少版本时构建会直接失败，避免 shared 清单和锁版脱节。

## 独立单飞与宿主聚合

`app-system` 同时具备两种运行形态：

```bash
# 作为 Host 聚合的 Remote
pnpm dev

# 直接打开子应用
http://localhost:3101
```

子应用自带 Layout、登录页与权限守卫，不依赖宿主的页面壳。这样既可以在统一门户中聚合，也可以单独部署到独立域名，服务不同业务线或不同发布节奏。

## 全局数据同步

数据同步链路由两层组成：

1. **WebSocket 单例**：由 `app-api` 统一建立连接，避免每个应用各连一条。
2. **mitt 事件总线**：数据变更通过全局事件广播，页面订阅后自动刷新。

当某个页面修改了数据，其他页面、其他微应用甚至其他浏览器窗口都可以收到刷新信号。事件消费端只处理数据刷新，不再二次广播，避免回流死循环。

## 防双实例与高度观测

微前端中的“样式错乱、表格高度异常、拖拽失效”经常不是组件本身的问题，而是运行时出现了第二个 Vue 或第二个响应式上下文。

本项目在关键链路上做了两层防护：

- **共享依赖 singleton**：Vue、Pinia、Router、Element Plus 及运行时强耦合 UI 包统一走 `loadShare`。
- **原生 ResizeObserver**：布局高度观测不依赖容易产生跨实例问题的第三方 Hook，直接观测表头与分页器元素，适配微前端异步挂载。

远端加载还设置了超时与重试，避免开发服务器重预构建时守卫一直停留在 loading 状态。

## 延伸阅读

- [快速开始](../guide/getting-started)
- [微应用接入指南](../guide/micro-app)
- [常见问题](../faq)
