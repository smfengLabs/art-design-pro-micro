# Art Design Pro Micro Website

Official website and documentation for Art Design Pro Micro. Built with VitePress, Vue 3, and Tailwind CSS.

`website` is a member of the root pnpm workspace, so dependencies install with the rest of the repo.

## Development

```bash
# 仓库根目录
pnpm install
pnpm docs:dev            # 等价于 pnpm --filter website docs:dev
```

The local site runs at `http://localhost:5173/`.

## Build

```bash
pnpm docs:build          # 产物输出到 website/.vitepress/dist
pnpm docs:preview
```

## GitHub Pages

```bash
DOCS_BASE=/art-design-pro-micro/ pnpm docs:build
```

On Windows PowerShell:

```powershell
$env:DOCS_BASE = '/art-design-pro-micro/'
pnpm docs:build
```

## Structure

```text
website/
├─ .vitepress/
│  ├─ config.mts         # nav / sidebar / search / social links
│  └─ theme/
│     ├─ components/     # homepage sections
│     ├─ styles/         # theme tokens, Tailwind, homepage styles
│     └─ site.ts         # repository, badge, and demo links
├─ docs/
│  ├─ guide/             # 快速上手、CLI 脚手架、微应用接入
│  ├─ architecture/      # 核心架构说明
│  └─ faq.md             # 常见问题
├─ public/
├─ index.md              # custom homepage entry
├─ tailwind.config.cjs   # content globs + darkMode: 'class'
└─ package.json
```

## Links

Update repository, badge, or demo URLs in `.vitepress/theme/site.ts`. 新增文档页后需要同步 `.vitepress/config.mts` 的 `nav` / `sidebar`，并确认 `tailwind.config.cjs` 的 `content` 覆盖到该 Markdown 文件。

## GitHub Pages

```bash
DOCS_BASE=/art-design-pro-micro/ pnpm docs:build
```

On Windows PowerShell:

```powershell
$env:DOCS_BASE = '/art-design-pro-micro/'
pnpm docs:build
```

## Structure

```text
website/
├─ .vitepress/
│  ├─ config.mts
│  └─ theme/
│     ├─ components/     # homepage sections
│     ├─ styles/         # theme tokens, Tailwind, homepage styles
│     └─ site.ts         # repository, badge, and demo links
├─ docs/                 # documentation pages
├─ public/
├─ index.md              # custom homepage entry
└─ package.json
```

## Links

Update repository, badge, or demo URLs in `.vitepress/theme/site.ts`.
