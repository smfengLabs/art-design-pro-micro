# 一键生成子应用（SOP）

本文适用于 v1.1.0 及以上版本。新增子应用统一以 `apps/app-system` 为模板，通过脚本完成复制、重命名、MF 注册和宿主路由接入，避免手工漏改。

## 1. 前置条件

- 在仓库根目录执行命令。
- Node.js >= 20.19.0，pnpm >= 9.5.0。
- `apps/app-system` 是脚手架模板，请不要直接在模板上开发新业务。
- 新应用名必须以 `app-` 开头，例如 `app-article`、`app-order-center`。

## 2. 生成子应用

```bash
node scripts/create-app.mjs --name app-article --port 3102
```

参数说明：

| 参数     | 必填 | 说明                                                     |
| -------- | ---- | -------------------------------------------------------- |
| `--name` | 是   | 子应用目录名和包名，格式为 `app-<业务>`                 |
| `--port` | 是   | 独立运行端口，不能与现有应用（3006/3101 等）冲突        |
| `--help` | 否   | 查看帮助                                                 |

生成结果示例：

```text
apps/app-article
├── .env                 # VITE_APP_CODE = app_article，VITE_PORT = 3102
├── .env.production      # VITE_REMOTE_PUBLIC_PATH = https://app-article.qxiangkj.cn/
├── package.json         # @art/app-article
├── vite.config.ts       # MF name: app-article
├── tsconfig.json        # @/* 指向 apps/app-article/src
└── src
    ├── main.ts          # appName/appCode/独立登录/首页路径
    └── routes.ts        # /article 与 RouteName.ARTICLE_*
```

脚本会自动完成以下操作：

1. 复制 `apps/app-system` 到 `apps/<name>`，跳过并清理 `node_modules`、`dist`、`.turbo`、`.mf`、`@mf-types` 等缓存。
2. 更新 `package.json` 包名为 `@art/<name>`。
3. 更新 `.env` 的 `VITE_APP_CODE`（`app_article`）和 `VITE_PORT`。
4. 更新 `.env.production` 的子应用部署域名及 `vite.config.ts` 的 MF name。
5. 更新 `src/routes.ts`：根路径 `/system` → `/article`，`RouteName.SYSTEM_*` → `RouteName.ARTICLE_*`，路由变量 `systemRoutes` → `articleRoutes`。
6. 更新 `src/main.ts` 的 `appName`、`appCode`、`homePath`、`asyncRouteSource`。
7. 更新 `tsconfig.json` 路径别名和 `index.html` 标题。
8. 向 `packages/app-utils/src/enums/routeName.ts` 追加 `<APP>_*` 枚举。
9. 向 `packages/app-config/src/vite/remotes.ts` 追加 dev/prod MF 注册项。

命名映射规则：

| 输入                        | 路由前缀     | RouteName 前缀 | 应用编码           | MF 名称        |
| --------------------------- | ------------ | -------------- | ------------------ | -------------- |
| `app-article`               | `/article`   | `ARTICLE_*`    | `app_article`      | `app-article`  |
| `app-order-center`          | `/order-center` | `ORDER_CENTER_*` | `app_order_center` | `app-order-center` |

如果目标目录已存在、包名与其他 workspace 包冲突、端口被占用、应用名不合法或 RouteName 冲突，脚本会直接失败，不会覆盖已有应用。

## 3. 安装依赖并启动

```bash
pnpm install
pnpm dev
```

启动后：

- 主应用：<http://localhost:3006>
- 新子应用：<http://localhost:3102>
- 原有系统应用：<http://localhost:3101>

首次生成后务必执行 `pnpm install`，让 pnpm 识别新的 workspace 包。

## 4. 验收新应用

### 4.1 子应用独立运行

1. 打开 <http://localhost:3102>。
2. 应显示独立登录页。
3. 使用测试账号 `Super` / `123456` 登录。
4. 登录后应跳转到 `http://localhost:3102/#/article/user`，用户管理页面正常渲染。
5. 浏览器控制台不应出现运行时错误。

### 4.2 主应用聚合

1. 打开 <http://localhost:3006> 并登录。
2. 左侧菜单应出现新应用对应的菜单（模板阶段会显示为“系统管理”）。
3. 点击新应用下的“用户管理”，地址应变为 `http://localhost:3006/#/article/user`，页面正常渲染。

主应用 `apps/app-main/src/main.ts` 使用下面的方式消费注册表：

```ts
remoteRouteSources: createRemoteRouteSources(__MF_REMOTE_REGISTRY__)
```

因此脚本只需要追加 `remotes.ts` 注册项，**不需要在 main.ts 里逐个维护路由源**。新增子应用后如果主应用已启动，建议刷新或重启主应用 dev server。

## 5. 上线前检查

脚本按现有约定生成生产地址：

- 子应用 publicPath：`https://<app-name>.qxiangkj.cn/`
- 宿主生产 manifest：`https://<app-name>.qxiangkj.cn/mf-manifest.json`

如果实际部署域名不同，请同步修改：

1. `apps/<app-name>/.env.production` 的 `VITE_REMOTE_PUBLIC_PATH`。
2. `packages/app-config/src/vite/remotes.ts` 中该应用的 `prod.manifestUrl`。

生产构建：

```bash
pnpm --filter @art/<app-name> build
```

将 `apps/<app-name>/dist` 部署到对应域名后，再构建并部署主应用，使主应用产物包含最新 `remotes` 注册表。

## 6. 常见问题

### 3006 左侧菜单没有新应用

- 确认已执行 `pnpm install`。
- 确认 `packages/app-config/src/vite/remotes.ts` 中存在该应用的 dev 注册项。
- 重启主应用 dev server，确保 Vite 重新读取注册表。

### 3006 打开子应用页面报错或超时

- 确认子应用 dev server 已启动，且 `http://localhost:<port>/mf-manifest.json` 可访问。
- 确认 `vite.config.ts` 的 MF name 与 `remotes.ts` 的 `moduleId` 前缀一致。
- 点击刷新重试；如果仍失败，执行 `pnpm clean`，并删除 `apps/<app-name>/node_modules/.vite` 与 `.vite-temp` 后重启所有应用。
- 如果控制台出现 `getActivePinia()` 相关错误，检查 `vite-plugin-federation` 补丁是否生效（仓库已通过 `patches/` 锁定该行为）。

### 子应用独立登录后接口返回 401/403

- 检查 `.env` 的 `VITE_APP_CODE` 与 `src/main.ts` 的 `appCode` 是否一致。
- 后端若按 appCode 隔离数据，需要在后端注册新的应用编码。

### 端口冲突

脚本启动前会检查现有应用的 `.env` 端口。直接更换 `--port` 重新生成即可；不要手工修改生成应用的端口后忘记同步 `remotes.ts`。

## 7. 后续开发建议

生成应用默认复用 `app-system` 的用户/角色/菜单示例页面。正式开发时：

1. 删除不需要的示例页面和路由。
2. 将 `src/views/system` 重命名为业务目录，并同步 `src/routes.ts` 的组件导入。
3. 保留 `routes.ts` 的 `/article` 根路径和 `RouteName.ARTICLE_*` 命名约定。
4. 在子应用内独立调试通过后，再回到主应用验证聚合效果。
