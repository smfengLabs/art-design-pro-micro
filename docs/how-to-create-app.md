# 微应用生命周期管理（SOP）

本文适用于已内置 `app:create` / `app:list` / `app:delete` 生命周期命令的版本。新增、查看、删除子应用统一通过脚本完成，避免手工漏改 MF 注册表与路由枚举。

## 1. 前置条件

- 在仓库根目录执行命令。
- Node.js >= 20.19.0，pnpm >= 9.5.0。
- `templates/app-template` 是纯空壳脚手架模板（登录页 + 欢迎页 + 空路由），请不要在模板上开发业务。
- `apps/app-system` 是系统管理业务应用，可正常修改其内部代码，但受防删守卫保护。
- 新应用名必须以 `app-` 开头，例如 `app-order`、`app-order-center`。
- `apps/app-main` 是唯一宿主（基座），不允许删除。

## 2. 命令总览

| 命令                                             | 作用                         |
| ------------------------------------------------ | ---------------------------- |
| `pnpm app:create --name <app> --port <port>`     | 创建子应用并自动接入宿主     |
| `pnpm app:list`                                  | 查看当前 workspace 应用列表  |
| `pnpm app:delete --name <app>`                   | 删除子应用并清理全部注册信息 |

三条命令等价于直接执行 `node scripts/*.mjs`，推荐使用 `pnpm app:*`，避免记错脚本路径。

## 3. 创建子应用

### 3.1 命令

```bash
pnpm app:create --name app-order --port 3102
```

参数说明：

| 参数     | 必填 | 说明                                                     |
| -------- | ---- | -------------------------------------------------------- |
| `--name` | 是   | 子应用目录名和包名，格式为 `app-<业务>`                  |
| `--port` | 是   | 独立运行端口，不能与现有应用（3006/3100/3101/3105 等）冲突 |
| `--help` | 否   | 查看帮助                                                 |

生成结果示例：

```text
apps/app-order
├── .env                 # VITE_APP_CODE = app_order，VITE_PORT = 3102
├── .env.production      # VITE_REMOTE_PUBLIC_PATH = https://app-order.qxiangkj.cn/
├── package.json         # @art/app-order
├── vite.config.ts       # MF name: app-order
├── tsconfig.json        # @/* 指向 apps/app-order/src
└── src
    ├── main.ts          # appName/appCode/独立登录/首页路径
    └── routes.ts        # /order 与 RouteName.ORDER_*
```

### 3.2 自动完成的操作

1. 复制 `templates/app-template` 到 `apps/<name>`，跳过并清理 `node_modules`、`dist`、`.turbo`、`.mf`、`@mf-types` 等缓存。
2. 将模板身份 `app-template` / `app_template` / `/template` 替换为新应用身份，模板本身保持纯净。
3. 更新 `package.json` 包名为 `@art/<name>`。
4. 更新 `.env` 的 `VITE_APP_CODE`（`app_order`）和 `VITE_PORT`。
5. 更新 `.env.production` 的子应用部署域名及 `vite.config.ts` 的 MF name。
6. 重新生成 `src/routes.ts`（布局根路由 + 欢迎页），并同步 `src/main.ts`、404 回跳等入口配置。
7. 更新 `tsconfig.json` 路径别名（`templates/app-template` → `apps/app-order`）和 `index.html` 标题。
8. 向 `packages/app-utils/src/enums/routeName.ts` 追加 `<APP>_*` 枚举。
9. 向 `packages/app-config/src/vite/remotes.ts` 追加 dev/prod MF 注册项。

命名映射规则：

| 输入               | 路由前缀       | RouteName 前缀     | 应用编码           | MF 名称        |
| ------------------ | -------------- | ------------------ | ------------------ | -------------- |
| `app-order`      | `/order`     | `ORDER_*`        | `app_order`      | `app-order`  |
| `app-order-center` | `/order-center` | `ORDER_CENTER_*`  | `app_order_center` | `app-order-center` |

如果目标目录已存在、包名与其他 workspace 包冲突、端口被占用、应用名不合法或 RouteName 冲突，脚本会直接失败，不会覆盖已有应用。

## 4. 查看应用列表

```bash
pnpm app:list
```

输出示例：

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

数据来源：

- 应用名：`apps/` 下的目录名。
- 包名：应用 `package.json` 的 `name`。
- 端口：应用 `.env` 的 `VITE_PORT`。
- 类型：`app-main` 为基座，其余为子应用。

## 5. 删除子应用

### 5.1 命令

```bash
pnpm app:delete --name app-order
```

脚本会依次完成：

1. 校验应用名，并拒绝删除 `app-main`（宿主）、`app-system`（系统业务应用）与 `app-template`（纯模板）。
2. 从 `packages/app-config/src/vite/remotes.ts` 中移除该应用在 **dev 与 prod** 两个数组中的完整注册项。
3. 从 `packages/app-utils/src/enums/routeName.ts` 中移除该应用的 `<PREFIX>` / `<PREFIX>_*` 枚举及脚手架生成注释。
4. 物理删除 `apps/<name>` 整个目录。
5. 输出清理结果，并提示执行 `pnpm install`。

映射示例：`app-order` 对应 `ORDER` / `ORDER_*`，`app-order-center` 对应 `ORDER_CENTER` / `ORDER_CENTER_*`。

### 5.2 安全边界

- 只接受 `app-<业务>` 格式的应用名，且只能删除 `apps/` 的直接子目录，避免路径穿越。
- `app-main`、`app-system`、`app-template` 在脚本层被硬编码为不可删除。
- 目标应用不存在或不是目录时直接失败，不会误删其他路径。
- 若 `remotes.ts` 中存在同别名但格式无法识别的注册项，脚本会中止并且**不会删除目录**，需手动检查后重试。
- 若注册项或枚举已被手动清理，脚本会提示并继续完成目录删除。
- 注册表写入或目录删除失败时，会自动回滚两个注册表，避免出现“应用还在、注册信息已丢”的中间态。

### 5.3 删除后

```bash
pnpm install
git diff
```

确认 `remotes.ts` 与 `routeName.ts` 已无该应用残留。若启用了后端菜单模式，还需在服务端同步清理该应用的菜单与 `appCode` 数据；本脚本只负责前端 workspace 与注册表。

## 6. 安装依赖并启动

```bash
pnpm install
pnpm dev
```

启动后：

- 主应用：<http://localhost:3006>
- 新子应用：<http://localhost:3102>
- 原有系统应用：<http://localhost:3101>
- 查看应用列表：`pnpm app:list`

首次生成后务必执行 `pnpm install`，让 pnpm 识别新的 workspace 包。

## 7. 验收新应用

### 7.1 子应用独立运行

1. 打开 <http://localhost:3102>。
2. 应显示独立登录页。
3. 使用测试账号 `Super` / `123456` 登录。
4. 登录后应跳转到 `http://localhost:3102/#/order/home`，显示脚手架欢迎页。
5. 浏览器控制台不应出现运行时错误。

### 7.2 主应用聚合

1. 打开 <http://localhost:3006> 并登录。
2. 左侧菜单应出现新应用对应的菜单（默认使用应用名，例如 `Article`）。
3. 点击该菜单，地址应变为 `http://localhost:3006/#/order/home`，欢迎页正常渲染。

主应用 `apps/app-main/src/main.ts` 使用下面的方式消费注册表：

```ts
remoteRouteSources: createRemoteRouteSources(__MF_REMOTE_REGISTRY__)
```

因此脚本只需要维护 `remotes.ts` 注册项，**不需要在 main.ts 里逐个维护路由源**。新增或删除子应用后如果主应用已启动，建议刷新或重启主应用 dev server。

## 8. 上线前检查

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

## 9. 常见问题

### 3006 左侧菜单没有新应用

- 确认已执行 `pnpm install`。
- 确认 `packages/app-config/src/vite/remotes.ts` 中存在该应用的 dev 注册项。
- 重启主应用 dev server，确保 Vite 重新读取注册表。

### 删除后 3006 仍显示旧应用菜单

- 确认已重启主应用 dev server。
- 执行 `pnpm app:list`，确认 `apps/<name>` 已不存在。
- 检查 `git diff`，确认 `remotes.ts` 中没有该应用残留。
- 若使用后端菜单模式，清理服务端菜单数据。

### 3006 打开子应用页面报错或超时

- 确认子应用 dev server 已启动，且 `http://localhost:<port>/mf-manifest.json` 可访问。
- 确认 `vite.config.ts` 的 MF name 与 `remotes.ts` 的 `moduleId` 前缀一致。
- 点击刷新重试；如果仍失败，执行 `pnpm clean`，并删除 `apps/<app-name>/node_modules/.vite` 与 `.vite-temp` 后重启所有应用。
- 如果控制台出现 `getActivePinia()` 相关错误，检查 `vite-plugin-federation` 补丁是否生效（仓库已通过 `patches/` 锁定该行为）。

### 子应用独立登录后接口返回 401/403

- 检查 `.env` 的 `VITE_APP_CODE` 与 `src/main.ts` 的 `appCode` 是否一致。
- 后端若按 appCode 隔离数据，需要在后端注册新的应用编码。

### 端口冲突

创建脚本会检查现有应用的 `.env` 端口。直接更换 `--port` 重新生成即可；不要手工修改生成应用的端口后忘记同步 `remotes.ts`。

### 删除脚本提示未找到注册项或枚举

说明该应用可能由旧版本脚本生成，或已被手动清理。确认 `git diff` 与 `app:list` 结果后即可继续；如果 `remotes.ts` 中仍有同别名配置但格式无法识别，脚本会中止并提示手动清理。

## 10. 后续开发建议

生成应用默认只有 `src/views/home/index.vue` 欢迎页，正式开发时：

1. 在 `src/views` 下创建业务目录与页面。
2. 在 `src/routes.ts` 中补充业务路由，保留 `/order` 根路径和 `RouteName.ORDER_*` 命名约定。
3. 如需新增接口，按现有分层放入应用自身的 `src/api`。
4. 在子应用内独立调试通过后，再回到主应用验证聚合效果。
