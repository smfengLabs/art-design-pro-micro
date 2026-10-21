---
title: 快速上手
description: 在本地跑通 Art Design Pro Micro 微前端工作区
---

# 快速上手

本页带你在 10 分钟内跑通整套底座：安装依赖、并行启动全部应用、认识目录与命令，并知道下一步该读哪篇文档。

## 你将得到什么

- 一个**宿主应用**（`app-main`）负责登录、菜单聚合与全局调度。
- 若干**微应用**（`app-system`、`app-example`）既可独立部署到自己的域名，也能被宿主聚合渲染。
- 一套**不可回退的架构约束**：依赖拓扑、类型检查、构建在双端 PR 上强制通过。
- 一组**生命周期 CLI**：`app:create` / `app:list` / `app:delete`，新增与删除子应用零手工漏改。

## 环境要求

| 项目 | 要求 |
| --- | --- |
| Node.js | `>= 20.19.0` |
| pnpm | `>= 9.5.0`（仓库锁定 `pnpm@12.14.0`） |
| 浏览器 | 支持 ES2020+ 与现代 Module Federation 的浏览器 |

仓库使用 pnpm workspace + catalog 单版本锁，**不要**混用 npm / yarn 安装根依赖，否则共享内核版本会漂移并触发第二实例。

## 安装与启动

```bash
# 1. 克隆（GitHub 或 Gitee 任选，两端代码内容一致）
git clone https://github.com/smfengLabs/art-design-pro-micro.git
cd art-design-pro-micro

# 2. 安装依赖（含 website 文档站）
pnpm install

# 3. Turbo 并行拉起全部应用
pnpm dev
```

默认端口分配：

| 应用 | 端口 | 说明 |
| --- | --- | --- |
| `apps/app-main` | 3006 | 宿主：登录、仪表盘、聚合所有子应用 |
| `apps/app-system` | 3101 | 系统管理微应用（权限 / 系统设置） |
| `apps/app-example` | 3105 | 示例微应用（组件库与业务模板） |
| `templates/app-template` | 3100 | 纯模板工程，`app:create` 的复制源，不参与 `pnpm dev` |

::: tip 在线演示与登录账号
线上演示：<https://app-main.qxiangkj.cn>。本地演示账号 `Super` / `123456`，实际以 `.env` 的 `VITE_API_URL` 指向的后端或内置 mock 为准。子应用单独打开时同样带独立登录页。
:::

## 目录结构

```text
.
├─ apps/                 运行期应用（1 个宿主 + N 个微应用）
├─ packages/             共享内核，按 utils < api < core < components < base 分层
├─ templates/            脚手架模板（app-template）
├─ scripts/              CLI 与工程脚本（create/list/delete、auto-pr、audit-dist…）
├─ website/              本站（VitePress + Tailwind CSS）
├─ docs/                 仓库内 Markdown SOP（与本站文档同源）
├─ pnpm-workspace.yaml   workspace 与 catalog 单版本锁
├─ turbo.json            任务编排（build 依赖 typecheck）
└─ .dependency-cruiser.js 依赖方向裁决规则
```

## 常用命令

| 命令 | 作用 |
| --- | --- |
| `pnpm dev` | 并行启动所有应用 |
| `pnpm build` | Turbo 全量构建（`build` 依赖 `typecheck`） |
| `pnpm typecheck` | 全仓库 `vue-tsc` 类型检查 |
| `pnpm depcruise` | 依赖拓扑门禁，拦截反向依赖与跨应用引用 |
| `pnpm clean` | 清理各应用构建与缓存目录 |
| `pnpm app:create --name app-order --port 3102` | 新建微应用并自动接入宿主 |
| `pnpm app:list` | 查看当前应用列表与端口 |
| `pnpm app:delete --name app-order` | 删除微应用并清理注册表 |
| `pnpm pr:auto` | 推送分支并创建 PR（详见 CLI 文档） |
| `pnpm docs:dev` / `docs:build` | 本站预览与构建（等价于 `pnpm --filter website docs:dev`） |

提交代码前建议本地跑一遍门禁三件套：

```bash
pnpm typecheck && pnpm depcruise && pnpm build
```

## 第一次改代码从哪里入手

1. 打开对应子应用的 `src/views/`，改一处文案，热更新应立即生效。
2. 在 `src/routes.ts` 新增一条路由，注意保留 `RouteName.<PREFIX>_*` 命名契约。
3. 需要复用 UI 时优先从 `@art/app-components` 引入，公共 Layout 为 `@art/app-components/layouts`。
4. 菜单图标直接写字符串（如 `ri:dashboard-line`），构建期自动注入，无需任何生成脚本。

## 下一步

- 想系统地增删子应用：读 [CLI 脚手架使用](/docs/guide/cli)
- 想了解为什么这样分层：读 [核心架构说明](/docs/architecture/)
- 手上已有一个应用要接进来：读 [微应用接入指南](/docs/guide/micro-app)
- 跑不起来或对不上现象：查 [常见问题](/docs/faq)
