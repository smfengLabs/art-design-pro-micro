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

一键推送并创建 PR（配置 Token 后还会尝试自动合并）：

```bash
pnpm pr:auto
```

脚本会读取当前分支，推送到 `origin`（GitHub）与 `gitee`，再调用两端 API 创建或复用 PR。
Token 只从环境变量读取，不会打印：

- GitHub：`GITHUB_TOKEN` 或 `GH_TOKEN`
- Gitee：`GITEE_TOKEN` 或 `GITEE_ACCESS_TOKEN`

未配置 Token 时，脚本仍会完成双端推送，并输出手动创建 PR 的对比链接。可选参数：

```bash
pnpm pr:auto -- --base main --title "feat: xxx" --no-merge
```

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
- `pnpm release` 等价于 `changeset publish`。仓库内包均为私有包，因此不会发布到 npm，只会为版本变化创建包级 git tag。
- 对外应用版本仍需同步更新根目录 `VERSION` 和 `apps/app-main/src/mock/upgrade/changeLog.ts`，保证应用内升级弹窗与构建缓存键一致。
- `pnpm release` 不负责应用级版本 tag；对外发版必须继续执行第 4 节的标准发版 SOP。

## 4. 标准发版 SOP（每次对外发版必须执行）

Changesets 负责包版本与 CHANGELOG，应用对外版本则通过 `vX.Y.Z` tag 发布。若本次迭代积累了 changeset，先按第 3 节消费并提交，再执行以下步骤，顺序不可省略：

1. 修改根目录 `VERSION` 为本次版本号，同步更新 `apps/app-main/src/mock/upgrade/changeLog.ts`，并提交代码。
2. 在最新 `main` 提交上打 annotated tag：

   ```bash
   git tag -a v1.4.0 -m "Release v1.4.0 - 说明"
   ```

3. 推送代码与标签：

   ```bash
   git push origin main && git push origin v1.4.0
   ```

推送 `v*` 标签后，`.github/workflows/release.yml` 会自动创建 GitHub Release，无需再到网页手动操作。

双端同步时补充执行：

```bash
git push gitee main && git push gitee v1.4.0
```

注意事项：

- `v1.4.0` 仅为示例，实际替换为本次发版号，并确保与 `VERSION` 完全一致。
- 打 tag 的提交必须包含 `.github/workflows/release.yml`，否则该标签无法触发自动 Release。
- 已发布的 tag 严禁重复使用或随意移动；需要补发时应创建新的版本号。
