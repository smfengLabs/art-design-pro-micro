---
title: 文档
description: Art Design Pro Micro 官方文档
---

# 文档

Art Design Pro Micro 是一套基于 Vue 3、TypeScript、Vite 与 Module Federation 2.0 的企业级微前端架构底座。这里提供从本地启动、架构理解到子应用接入的完整路径。

<div class="doc-landing">
  <a class="doc-card" href="./guide/getting-started">
    <span class="doc-card__eyebrow">START</span>
    <strong>快速开始</strong>
    <span>安装依赖、启动宿主与子应用，确认本地开发环境。</span>
  </a>
  <a class="doc-card" href="./architecture/">
    <span class="doc-card__eyebrow">ARCHITECTURE</span>
    <strong>架构设计</strong>
    <span>理解 apps / packages 分层、依赖边界与共享运行时。</span>
  </a>
  <a class="doc-card" href="./guide/micro-app">
    <span class="doc-card__eyebrow">INTEGRATION</span>
    <strong>微应用接入</strong>
    <span>从零接入一个新子应用，并保持独立部署与宿主聚合。</span>
  </a>
  <a class="doc-card" href="./faq">
    <span class="doc-card__eyebrow">SUPPORT</span>
    <strong>常见问题</strong>
    <span>双实例、远程加载、状态共享与路由冲突的排查入口。</span>
  </a>
</div>

## 设计目标

- **边界可执行**：目录结构不只是约定，依赖方向由 `dependency-cruiser` 守住。
- **应用可单飞**：子应用既能作为 Remote 被宿主聚合，也能独立域名部署与独立登录。
- **运行时单实例**：Vue、Pinia、Vue Router、Element Plus 等核心依赖通过 MF 2.0 共享。
- **数据可同步**：全局 WebSocket 单例与 `mitt` 事件总线覆盖跨应用、跨窗口的数据刷新。
- **工程可维护**：统一构建配置、路由 Name 契约、类型检查与依赖审计。

## 继续阅读

推荐按 **快速开始 → 架构设计 → 微应用接入** 的顺序阅读。如果你正在排查运行时问题，可以直接查看 [常见问题](./faq)。
