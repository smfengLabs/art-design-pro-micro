# Changesets 版本变更与发版流程

本文适用于 v1.3.0 及以上版本。项目使用 [Changesets](https://changesets.dev) 记录版本变更、生成 CHANGELOG 并驱动发版，所有会影响使用者的改动都必须随 PR 提交 changeset 文件。

## 1. 开发阶段：记录变更

在仓库根目录执行：

```bash
pnpm changeset
```

按交互提示完成三步：

1. 用空格选择受影响的 workspace 包（至少一个）。
2. 选择版本类型：`patch` / `minor` / `major`。
3. 填写变更摘要，该摘要会进入对应包的 `CHANGELOG.md`。

版本类型选择建议：

| 类型    | 适用场景                                                 |
| ------- | -------------------------------------------------------- |
| `patch` | Bug 修复、内部重构、文档与 CI 调整                       |
| `minor` | 向后兼容的新功能，例如新增预加载能力                     |
| `major` | 破坏性变更，例如修改微前端协议、shared 配置或公共 API    |

命令会生成 `.changeset/<随机名称>.md`。该文件必须与代码一起提交到 PR，否则版本变更不会进入下一次发版。

> 一个 PR 包含多个独立变更时，可以执行多次 `pnpm changeset` 分别记录。

## 2. PR 阶段：通过质量门禁

向 `main` 提交 Pull Request 后，GitHub Actions 会执行 `.github/workflows/ci.yml`：

1. `pnpm typecheck`：全 workspace 类型检查。
2. `pnpm depcruise`：架构依赖规则校验，任何分层或跨应用违规都会让 CI 失败。
3. `pnpm build`：宿主与全部子应用的生产构建。

任一步失败，PR 检查会标红。建议在仓库分支保护规则中将 `Quality Gate` 配置为 required check，禁止绕过门禁合并。

## 3. 发布阶段：消费 changeset

维护者在最新的 `main` 上执行：

```bash
pnpm changeset version
pnpm install --lockfile-only
git add .
git commit -m "chore(release): version packages"
pnpm release
git push origin main --follow-tags
git push gitee main --follow-tags
```

说明：

- `pnpm changeset version` 会消费 `.changeset/*.md`，更新相关包版本与 CHANGELOG。
- `pnpm release` 等价于 `changeset publish`。仓库内包均为私有包，因此不会发布到 npm，只会为版本变化创建 git tag。
- 对外应用版本仍需同步更新根目录 `VERSION` 和 `apps/app-main/src/mock/upgrade/changeLog.ts`，保证应用内升级弹窗与构建缓存键一致。
- 当前 `release` 只负责版本号与 git tag；GitHub Release 页面尚未配置自动创建，后续可增加 tag 触发的 release workflow。
