# 架构说明

本项目基于 Monorepo + Vite + Module Federation 2.0 构建，支持子应用独立部署、独立登录与全局状态单例。

## 包结构
- `apps/app-main`: 宿主应用（壳），提供登录、全局路由调度、仪表盘及异常兜底。
- `apps/app-system`: 系统管理微应用，具备独立运行调试与统一聚合的双重能力。
- `packages/app-core`: 核心内核（路由控制、全局守卫、Pinia 共享状态）。
- `packages/app-api`: HTTP 统一请求层与全局 WebSocket 单例。
- `packages/app-components`: 跨应用共享的 UI 组件与 Layout 壳。
- `packages/app-utils`: 纯工具函数及全局路由契约（RouteName）。
- `packages/app-base`: 微前端启动基座。
- `packages/app-config`: Vite/Tailwind/MF 的统一构建配置。

## 依赖拓扑检查
运行 `pnpm depcruise` 可校验依赖方向，确保没有跨应用污染。
