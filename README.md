# Art Design Pro Micro

[![官方文档](https://img.shields.io/badge/docs-doc.qxiangkj.cn-635bff?style=social)](https://doc.qxiangkj.cn)
[![GitHub stars](https://img.shields.io/github/stars/smfengLabs/art-design-pro-micro?style=social)](https://github.com/smfengLabs/art-design-pro-micro)
[![Gitee stars](https://gitee.com/smfengLabs/art-design-pro-micro/badge/star.svg?theme=dark)](https://gitee.com/smfengLabs/art-design-pro-micro)

基于 **Vue 3 + TypeScript + Vite + Module Federation 2.0** 打造的现代化企业级微前端中后台架构底座。

本项目重构自优秀的单体中后台模板 [Art Design Pro](https://github.com/Daymychen/art-design-pro)。在保留原有优雅 UI 与完善业务组件的基础上，将其深度改造为支持**独立部署、独立单飞、跨应用聚合**的微前端架构。

## 🔗 快速入口

统一对外入口为官方网站 **[https://doc.qxiangkj.cn](https://doc.qxiangkj.cn)**，文档、架构说明、CLI 手册与三端演示矩阵都在那里：

| 入口 | 链接 | 说明 |
| --- | --- | --- |
| 官方文档 · 在线演示 | <https://doc.qxiangkj.cn> | 主入口。首页的「体验微前端独立单飞」矩阵聚合下面三个演示环境 |
| 快速上手 | <https://doc.qxiangkj.cn/docs/guide/getting-started> | 环境要求、目录结构、命令表 |
| 核心架构说明 | <https://doc.qxiangkj.cn/docs/architecture/> | 分层拓扑、MF 装配、预加载与错误隔离 |
| 宿主主应用（直接体验） | <https://app-main.qxiangkj.cn> | 备用直链 · Host 极薄基座，统一登录与路由调度 |
| 系统子应用（直接体验） | <https://app-system.qxiangkj.cn> | 备用直链 · Remote 权限管理微应用，可独立运行 |
| 示例子应用（直接体验） | <https://app-example.qxiangkj.cn> | 备用直链 · Remote 高级表格、编辑器与模板库 |

演示账号 `Super` / `123456`。

## 🌟 核心特性

- **极细粒度 Monorepo**：`apps` + `packages` 架构，通过 `dependency-cruiser` 强约束依赖拓扑，拒绝分布式单体。
- **统一门户与独立单飞**：主应用（Host）聚合所有子应用；子应用（Remote）自带完整 Layout 壳与独立登录页，支持独立域名部署。
- **彻底的状态共享**：基于 MF 2.0 `shared: singleton`，全局唯一 `Vue` / `Pinia` / `Vue-Router` 实例，Token 与权限数据完美互通。
- **全链路防雷**：`@vueuse/core` 不剔除，改为 pnpm catalog 锁版本 + MF `shared: singleton`，杜绝远端各打一份 Hook 出现双实例；高度计算等关键路径仍手写原生 `ResizeObserver`（见 `packages/app-core/src/hooks/core/useLayoutHeight.ts`），解决微前端样式/高度计算断裂问题。
- **全局实时数据同步**：内建全局 WebSocket 单例与 `mitt` 事件总线，跨浏览器、跨微应用实现数据变更的自动刷新。
- **开箱即用**：已解决自动导入 `d.ts` 的 Fresh Clone 报错问题，拉取代码后直接可跑，零配置烦恼。

## 📦 架构说明

- `apps/app-main`：宿主应用（壳子、登录、仪表盘）。
- `apps/app-system`：系统管理微应用（权限管理/系统设置）。
- `apps/app-example`：示例微应用，展示组件库与高可用业务模板。
- `templates/app-template`：纯空壳脚手架模板，`app:create` 的唯一复制源。
- `packages/app-core`：全局核心（路由、Pinia、权限控制、守卫）。
- `packages/app-api`：统一 HTTP 层与全局 WebSocket。
- `packages/app-components`：公共 UI 组件及 Layout 壳。
- `packages/app-utils`：工具库与路由 Name 契约。
- `packages/app-base`：应用启动基座。
- `packages/app-config`：Vite/MF 统一配置。

## 🚀 快速开始

```bash
# 安装依赖 (推荐使用 pnpm)
pnpm install

# 启动所有应用
pnpm dev
```

启动后，本地可以访问：

- 宿主主应用：<http://localhost:3006>
- 系统子应用：<http://localhost:3101>
- 示例子应用：<http://localhost:3105>

更多用法（脚手架建应用、依赖门禁、独立部署与发布顺序）见官方文档：<https://doc.qxiangkj.cn/docs/guide/getting-started>。

## 🛡️ 安全声明

> ⚠️ **安全提示**：示例应用 `app-example` 中的 `xlsx` 依赖仅用于本地数据演示，不涉及处理生产环境不可信数据，请勿直接将其用于真实用户的上传解析。构建链中的 `vite`/`vitepress` 漏洞仅影响本地文档构建，不影响生产环境产物。

## 📄 开源协议

基于 MIT 协议开源。

## 🤝 致谢

感谢 [Art Design Pro](https://github.com/Daymychen/art-design-pro) 提供的优秀 UI 基础与组件生态。

<!-- test gitee ci -->
