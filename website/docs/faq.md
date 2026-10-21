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

运行时强耦合的 UI 包也需要纳入共享清单，例如 `@iconify/vue/offline` 与 `vue-draggable-plus`。`vite-plugin-federation` 已通过 `patches/` 锁定 `getActivePinia()` 相关行为，不要私自升级该插件版本。

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

如果新功能确实需要跨应用复用，请把能力下沉到合适的 `packages/*`，或通过 Module Federation 暴露模块，而不是绕过依赖规则。完整规则清单见 [核心架构说明](/docs/architecture/) 第 2 节。

## 独立登录成功，但接口 401 / 403？

后端按 `appCode` 隔离数据与权限。检查 `apps/<app>/.env` 的 `VITE_APP_CODE` 与 `src/main.ts` 里 `bootstrapApp({ appCode })` 是否一致，以及该 `appCode` 是否已在服务端注册。脚手架生成时会同步这两处，手工迁移最容易漏。

## 菜单图标不显示？

图标已由构建期自动注入（`art:auto-iconify` 插件扫描全部 workspace 源码并生成 `virtual:art-iconify`），不需要任何生成脚本。若图标缺失：

1. 确认写的是标准 Iconify 字符串（如 `ri:dashboard-line`），前缀在 `@iconify/json` 中存在；
2. 确认应用引入了 `@art/app-components/iconify`（宿主与各子应用的 `main.ts` 都需要）；
3. dev 阶段新增图标名后等待一次 full-reload，或手动刷新页面。

## `pnpm app:create` 直接失败，什么都没生成？

这是设计如此：脚本在任何校验不通过时中止，并回滚已写入的注册表与已创建的目录，避免留下「应用还在、注册信息已丢」的中间态。常见原因：目录或包名已存在、`remotes.ts` 已有同别名注册项、端口被 `apps/*` 或 `templates/*` 占用、`RouteName` 键或值冲突、使用了保留名 `app-main` / `app-template`。逐条对照 [CLI 脚手架使用](/docs/guide/cli) 的内置校验清单。

## PR 为什么合不进去？

双端各有一套门禁，且都必须绿：

- **GitHub**：`main` 受分支保护，PR 需要 **Quality Gate** 状态检查通过（typecheck → depcruise → build）。管理员直接 push 会看到 bypass 提示。
- **Gitee**：PR 需要 **审查** 与 **测试** 两项审批各 1/1 才能解锁合并。
- 两端 `main` 历史不做 force push；若两端分叉，先 `merge`（必要时 `merge -s ours`）对齐内容再快进推送，并用 `git diff --stat origin/main gitee/main` 确认树一致。

`pnpm pr:auto` 会把当前分支推送到双端并创建 PR；Token 只从环境变量读取，绝不打印。

## 仓库里怎么多了个 `FETCH_HEAD`？

那是 `git fetch` 的元数据文件，曾被误提交。现在已从版本库移除，并在根 `.gitignore` 中忽略 `FETCH_HEAD` 与 `**/FETCH_HEAD`；可用 `git check-ignore -v FETCH_HEAD` 验证。若它再次出现在工作区，属于未跟踪的正常文件，不要提交。

## 官网与文档如何本地预览？

`website` 是 pnpm workspace 成员，直接在仓库根执行：

```bash
pnpm install          # 一次装齐全部 workspace
pnpm docs:dev         # 本地预览（等价于 pnpm --filter website docs:dev）
pnpm docs:build       # 静态产物构建
pnpm docs:preview     # 预览构建产物
```

文档站使用 VitePress 默认主题 + Tailwind CSS（`darkMode: 'class'`，与 VitePress 的暗黑切换共用同一个 `.dark` 类）。新增页面后记得在 `.vitepress/config.mts` 的 `nav` / `sidebar` 中登记，并确认 `tailwind.config.cjs` 的 `content` 覆盖到新的 Markdown 路径。

