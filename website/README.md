# Art Design Pro Micro Website

Official website and documentation for Art Design Pro Micro. Built with VitePress, Vue 3, and Tailwind CSS.

## Development

```bash
cd website
pnpm install
pnpm docs:dev
```

The local site runs at `http://localhost:5173/`.

## Build

```bash
pnpm docs:build
pnpm docs:preview
```

The production output is written to `.vitepress/dist`.

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
