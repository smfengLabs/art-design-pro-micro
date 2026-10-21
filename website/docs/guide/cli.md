---
title: CLI 脚手架使用
description: app:create / app:list / app:delete 三条命令管理微应用生命周期
---

# CLI 脚手架使用

仓库把微应用的生命周期收敛成三条命令，全部在**根目录**执行：

| 命令 | 作用 |
| --- | --- |
| `pnpm app:create --name <app> --port <port>` | 创建子应用并自动接入宿主 |
| `pnpm app:list` | 查看当前 workspace 应用列表 |
| `pnpm app:delete --name <app>` | 删除子应用并清理全部注册信息 |

它们等价于 `node scripts/<script>.mjs`，推荐用 `pnpm app:*` 形式。三条命令都只接受文档里列出的参数，未知参数会直接报错退出（`--help` / `-h` 打印用法）。

## 1. 创建子应用

```bash
pnpm app:create --name app-order --port 3102
```

| 参数 | 必填 | 说明 |
| --- | --- | --- |
| `--name` | 是 | 目录名与包名，必须匹配 `^app-[a-z][a-z0-9]*(-[a-z0-9]+)*$`，例如 `app-order` |
| `--port` | 是 | 独立运行端口，1-65535 的整数，且不能与现有应用冲突 |

生成结果：

```text
apps/app-order
├─ .env               # VITE_APP_CODE = app_order，VITE_PORT = 3102
├─ .env.production    # VITE_REMOTE_PUBLIC_PATH = https://app-order.qxiangkj.cn/
├─ package.json       # @art/app-order
├─ vite.config.ts     # createRemoteConfig({ base: '/', name: 'app-order' })
├─ tsconfig.json      # @/* 指向 apps/app-order/src
├─ index.html         # <title>Art Design Pro - Order</title>
└─ src
   ├─ main.ts         # 挂载公共 ArtUnifiedLogin，独立入口 homePath = /order/home
   ├─ routes.ts       # /order 布局根路由 + 唯一 home 子路由
   └─ views/home/index.vue   # 纯展示欢迎页
```

脚本内部依次完成这些事，任一步校验不过直接失败并回滚（删除已生成目录、还原两个注册表文件）：

1. 校验参数、复制源与目标目录，检查包名/别名/端口/`RouteName` 是否冲突。
2. 复制 `templates/app-template` → `apps/<name>`，跳过并清理 `node_modules`、`dist`、`.turbo`、`.mf`、`@mf-types`、`.vite` 等缓存目录。
3. 生成纯展示欢迎页，并守卫模板纯净度：不得残留应用级登录页、必须挂载公共 `ArtUnifiedLogin`、不得残留 `iconify` 生成脚本或 `@iconify-json/*` 依赖。
4. 替换应用身份：`templates/app-template` / `app-template` / `app_template` / `templateRoutes` / `AppTemplate` → 新应用名、编码、路由变量与组件名。
5. `package.json` 包名改为 `@art/<name>`，`.env` 写入 `VITE_PORT`，`index.html` 写入浏览器标题。
6. 重写 `src/routes.ts`（布局根路由 + 欢迎页），同步 `main.ts` 与开发态 404 回跳指向 `/order/home`。
7. 校验 `vite.config.ts` 的 MF `name` 与 `tsconfig.json` 路径别名是否随身份正确替换。
8. 向 `packages/app-utils/src/enums/routeName.ts` 追加 `ORDER` / `ORDER_HOME` 等枚举。
9. 向 `packages/app-config/src/vite/remotes.ts` 的 `SCAFFOLD_REMOTES_DEV` / `SCAFFOLD_REMOTES_PROD` 标记处各追加一条注册项。

命名映射规则：

| 输入 | 路由前缀 | RouteName 前缀 | 应用编码 | MF 名称 |
| --- | --- | --- | --- | --- |
| `app-order` | `/order` | `ORDER_*` | `app_order` | `app-order` |
| `app-order-center` | `/order-center` | `ORDER_CENTER_*` | `app_order_center` | `app-order-center` |

::: warning 生成后务必执行
```bash
pnpm install
```
让 pnpm 识别新的 workspace 包，否则 `pnpm dev` 与 `pnpm typecheck` 不会覆盖它。
:::

## 2. 查看应用列表

```bash
pnpm app:list
```

```text
ART Design Pro · 微应用列表

┌─────────────┬──────────────────┬──────┬────────┐
│ 应用名      │ 包名             │ 端口 │ 类型   │
├─────────────┼──────────────────┼──────┼────────┤
│ app-main    │ app-main         │ 3006 │ 基座   │
│ app-system  │ app-system       │ 3101 │ 子应用 │
│ app-example │ @art/app-example │ 3105 │ 子应用 │
└─────────────┴──────────────────┴──────┴────────┘

共 3 个应用：1 个基座，2 个子应用

模板工程: templates/app-template（包名 @art/app-template，端口 3100）
app:create 以该模板为复制源；app:delete 受防删守卫保护，禁止删除。
```

数据全部来自文件系统与配置：目录名、`package.json` 的 `name`、`.env` 的 `VITE_PORT`，`app-main` 判定为基座。

## 3. 删除子应用

```bash
pnpm app:delete --name app-order
```

执行顺序：

1. 校验应用名，并拒绝删除 `app-main`（唯一宿主）、`app-system`（系统业务应用）、`app-template`（模板源）。
2. 从 `remotes.ts` 的 **dev 与 prod** 两个数组中移除完整注册项。
3. 从 `routeName.ts` 中移除 `ORDER` / `ORDER_*` 枚举及脚手架注释。
4. 物理删除 `apps/<name>` 目录。
5. 输出清理结果并提示执行 `pnpm install`。

安全边界：

- 只接受 `app-<业务>` 名称，且只操作 `apps/` 直接子目录，杜绝路径穿越。
- 注册表存在同别名但格式无法识别的注册项时**中止且不删目录**。
- 注册表写入或目录删除失败时自动回滚两个注册表，不会出现「应用还在、注册信息已丢」的中间态。

删除后：

```bash
pnpm install
git diff   # 确认 remotes.ts 与 routeName.ts 无残留
```

若使用后端菜单模式，服务端菜单与 `appCode` 数据需另行清理；CLI 只负责前端 workspace 与注册表。

## 4. 新应用的验收清单

1. 独立运行：`http://localhost:3102` 出现独立登录页，登录后进入 `/#/order/home` 欢迎页，控制台无报错。
2. 宿主聚合：`http://localhost:3006` 登录后左侧菜单出现新应用，点击进入 `/#/order/home` 正常渲染。
3. 门禁：`pnpm typecheck && pnpm depcruise && pnpm build` 全绿。
4. 图标：菜单 `meta.icon` 字符串直接生效，无需任何生成脚本。

## 5. 相关命令

| 命令 | 说明 |
| --- | --- |
| `pnpm pr:auto` | 推送当前分支并创建 PR；Token 只从环境变量 `GITHUB_TOKEN` / `GITEE_TOKEN` 读取，绝不打印；无 Token 时降级输出手动创建链接 |
| `pnpm audit:dist` | 校验构建产物完整性 |
| `pnpm clean` | 清理各应用 `dist` 与缓存目录 |
| `pnpm changeset` + `pnpm release` | 基于 Changesets 的版本与变更记录 |
| `pnpm docs:dev` / `docs:build` / `docs:preview` | 本官网文档站的开发、构建与本地预览 |

## 延伸阅读

- [微应用接入指南](/docs/guide/micro-app)：脚本背后的注册表与 expose 契约
- [核心架构说明](/docs/architecture/)：为什么注册表与枚举必须集中维护
- [常见问题](/docs/faq)：菜单不出现、加载超时等现象的定位路径
