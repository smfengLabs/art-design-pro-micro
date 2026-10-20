---
title: 常见问题
description: Art Design Pro Micro 的运行时与工程问题排查
---

# 常见问题

## 为什么子应用要支持独立单飞？

微前端不应该以“必须依赖宿主”为代价。`app-system` 自带 Layout、登录页与权限守卫，可以独立域名部署，也可以被宿主聚合。这样发布节奏、故障域与业务边界都更清晰。

独立运行入口位于 `apps/app-system/src/main.ts`，宿主只消费 `./routes` 与组件，不加载这个入口。

## 页面出现两套 Vue / 两套 Pinia 会有什么表现？

常见症状包括：

- 组件事件失效、拖拽初始化失败；
- `provide/inject` 拿不到宿主上下文；
- Pinia 状态在宿主与子应用之间不同步；
- Element Plus 弹层、国际化或主题行为异常。

优先检查 `packages/app-config/src/vite/federation.ts`：

- Vue、Pinia、Vue Router、Element Plus 是否仍是 `singleton: true`；
- 子应用是否自行复制了 shared 清单；
- 是否引入了会携带第二份 Vue 运行时的依赖。

运行时强耦合的 UI 包也需要纳入共享清单，例如 `@iconify/vue` 与 `vue-draggable-plus`。

## 为什么高度观测不直接用第三方 Hook？

核心布局高度观测使用原生 `ResizeObserver`，直接观测表头与分页器元素。这样可以避免第三方 Hook 在微前端异步挂载场景下出现观测失效、跨实例依赖或重复初始化的问题。

相关实现位于 `packages/app-core/src/hooks/core/useObservedElementHeight.ts` 与 `useTableHeight.ts`。

## 开发时远端一直 loading 或首次访问白屏？

开发服务器重预构建时，远端请求可能短暂挂起。`packages/app-base/src/remotes.ts` 对远端加载设置了超时与一次重试，避免路由守卫一直停留在 loading 状态。

如果仍然失败，依次检查：

1. `app-system` 是否已启动并监听 `3101`；
2. 浏览器能否直接访问 `http://localhost:3101/mf-manifest.json`；
3. `remotes.ts` 中的 `alias` 与 federation `name` 是否一致；
4. 子应用 expose 是否为 `./routes`。

## 新增 Remote 后宿主访问 404？

重点核对四处配置：

- `createRemoteConfig()` 中的 federation `name`；
- `remoteRegistry` 的 `alias`；
- `moduleId` 是否为 `<alias>/routes`；
- 生产环境 manifest 路径是否与部署目录一致。

不要只修改一处。宿主通过注册表找 manifest，再通过 moduleId 加载路由，三者必须同名。

## Fresh Clone 后自动导入类型报错？

项目已经处理自动导入 `d.ts` 的首次生成问题，正常执行 `pnpm install && pnpm dev` 即可。如果编辑器仍然报找不到自动导入 API：

- 先启动一次开发服务器，让 unplugin 生成类型文件；
- 检查 `auto-imports.d.ts` / `components.d.ts` 是否被错误忽略；
- 重启 TypeScript Server。

不要手动复制其他应用的 `d.ts` 到当前应用，类型路径和自动导入配置可能不同。

## 子应用独立运行正常，聚合后路由异常？

通常是 RouteName 或路径契约不一致。检查：

- 子应用路由 `name` 是否来自 `RouteName`；
- 宿主与子应用是否对同一路径使用了不同 name；
- `homePath`、`redirect` 是否指向存在的子路由；
- 子应用是否错误地硬编码了宿主前缀。

## 为什么 `pnpm depcruise` 会拦截我的 import？

这是架构约束生效，不是误报。`packages` 不允许依赖 `apps`，`apps` 之间不允许源码互引，核心层也不能反向依赖 UI 层。

如果新功能确实需要跨应用复用，请把能力下沉到合适的 `packages/*`，或通过 Module Federation 暴露模块，而不是绕过依赖规则。

## 官网与文档如何本地预览？

```bash
cd website
pnpm install
pnpm docs:dev
```

生产构建：

```bash
pnpm docs:build
pnpm docs:preview
```
