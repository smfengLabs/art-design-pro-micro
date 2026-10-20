---
title: 快速开始
description: 在本地启动 Art Design Pro Micro
---

# 快速开始

本页帮助你在本地启动完整的微前端工作区：一个宿主应用、一个系统子应用，以及它们共享的核心 packages。

## 环境要求

| 工具 | 版本 |
| --- | --- |
| Node.js | `>= 20.19.0` |
| pnpm | `>= 9.5.0` |
| 浏览器 | 支持 ES2022 与现代 Module Federation 的浏览器 |

项目使用 pnpm workspace 管理 `apps/*` 与 `packages/*`，建议不要混用 npm / yarn 安装根依赖。

## 安装

```bash
git clone https://github.com/smfengLabs/art-design-pro-micro.git
cd art-design-pro-micro
pnpm install
```

## 启动开发环境

```bash
pnpm dev
```

启动后可以访问：

| 应用 | 地址 | 角色 |
| --- | --- | --- |
| `app-main` | `http://localhost:3006` | Host / 宿主壳 |
| `app-system` | `http://localhost:3101` | Remote / 系统管理 |

`app-main` 会通过 Module Federation 加载 `app-system`。`app-system` 也可以直接打开，使用自己的 Layout 与登录页独立运行。

## 常用命令

```bash
pnpm dev          # 启动全部应用
pnpm build        # 构建全部应用
pnpm typecheck    # 类型检查
pnpm depcruise    # 校验包间依赖方向
pnpm clean        # 清理构建与缓存产物
```

## 目录速览

```text
art-design-pro-micro/
├─ apps/
│  ├─ app-main/       # 宿主壳
│  └─ app-system/     # 系统管理子应用
└─ packages/
   ├─ app-core/       # 路由、Pinia、守卫
   ├─ app-api/        # HTTP 与 WebSocket
   ├─ app-components/ # UI 与 Layout
   ├─ app-utils/      # 工具与 RouteName 契约
   ├─ app-base/       # 应用启动基座
   └─ app-config/     # Vite / MF 统一配置
```

## 下一步

- 阅读 [架构设计](../architecture/)，理解为什么这样拆分。
- 按 [微应用接入指南](./micro-app) 新增一个子应用。
- 遇到运行时问题，查看 [常见问题](../faq)。
