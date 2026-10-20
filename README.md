# Art Design Pro Micro

[![GitHub stars](https://img.shields.io/github/stars/smfeng355/art-design-pro-micro?style=social)](https://github.com/smfeng355/art-design-pro-micro)
[![Gitee stars](https://gitee.com/hefeng-network/art-design-pro-micro/badge/star.svg?theme=dark)](https://gitee.com/hefeng-network/art-design-pro-micro)

基于 **Vue 3 + TypeScript + Vite + Module Federation 2.0** 打造的现代化企业级微前端中后台架构底座。

本项目重构自优秀的单体中后台模板 [Art Design Pro](https://github.com/Daymychen/art-design-pro)。在保留原有优雅 UI 与完善业务组件的基础上，将其深度改造为支持**独立部署、独立单飞、跨应用聚合**的微前端架构。

## 🌟 核心特性

- **极细粒度 Monorepo**：`apps` + `packages` 架构，通过 `dependency-cruiser` 强约束依赖拓扑，拒绝分布式单体。
- **统一门户与独立单飞**：主应用（Host）聚合所有子应用；子应用（Remote）自带完整 Layout 壳与独立登录页，支持独立域名部署。
- **彻底的状态共享**：基于 MF 2.0 `shared: singleton`，全局唯一 `Vue` / `Pinia` / `Vue-Router` 实例，Token 与权限数据完美互通。
- **全链路防雷**：全面剔除 `@vueuse/core` 等易导致双实例的第三方 Hook，手写原生 `ResizeObserver`，解决微前端样式/高度计算断裂问题。
- **全局实时数据同步**：内建全局 WebSocket 单例与 `mitt` 事件总线，跨浏览器、跨微应用实现数据变更的自动刷新。
- **开箱即用**：已解决自动导入 `d.ts` 的 Fresh Clone 报错问题，拉取代码后直接可跑，零配置烦恼。

## 📦 架构说明

- `apps/app-main`：宿主应用（壳子、登录、仪表盘）。
- `apps/app-system`：第一个微应用（系统管理/权限管理）。
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

宿主主应用：http://localhost:3006

系统子应用：http://localhost:3101

📄 开源协议
基于 MIT 协议开源。

🤝 致谢
感谢 Art Design Pro 提供的优秀 UI 基础与组件生态。

