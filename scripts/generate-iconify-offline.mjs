import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const appUtilsDir = path.join(root, 'packages/app-utils')
const outputFile = path.join(appUtilsDir, 'src/ui/iconify-offline.json')

const prefixes = [
  'ri',
  'fluent',
  'iconamoon',
  'icon-park-outline',
  'ix',
  'solar',
  'system-uicons',
  'vaadin'
]

function collectFiles(dir, result = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) collectFiles(full, result)
    else if (/\.(ts|vue)$/.test(entry.name)) result.push(full)
  }
  return result
}

const used = new Set()
const iconPattern = /['"]([a-z0-9-]+):([a-z0-9-]+)['"]/g
for (const file of [...collectFiles(path.join(root, 'apps')), ...collectFiles(path.join(root, 'packages'))]) {
  const source = fs.readFileSync(file, 'utf-8')
  for (const match of source.matchAll(iconPattern)) {
    if (prefixes.includes(match[1])) used.add(`${match[1]}:${match[2]}`)
  }
}

const collections = []
for (const prefix of prefixes) {
  const source = JSON.parse(
    fs.readFileSync(
      path.join(appUtilsDir, 'node_modules/@iconify-json', prefix, 'icons.json'),
      'utf-8'
    )
  )
  const names = [...used]
    .filter((item) => item.startsWith(`${prefix}:`))
    .map((item) => item.slice(prefix.length + 1))

  if (!names.length) continue

  const icons = {}
  const aliases = {}
  for (const name of names) {
    if (source.icons?.[name]) {
      icons[name] = source.icons[name]
      continue
    }
    const alias = source.aliases?.[name]
    if (alias) {
      aliases[name] = alias
      if (alias.parent && source.icons?.[alias.parent]) {
        icons[alias.parent] = source.icons[alias.parent]
      }
    }
  }

  collections.push({
    prefix,
    width: source.width,
    height: source.height,
    icons,
    ...(Object.keys(aliases).length ? { aliases } : {})
  })
}

fs.writeFileSync(outputFile, `${JSON.stringify(collections, null, 2)}\n`)
console.log(
  `[iconify] generated ${collections.reduce((total, item) => total + Object.keys(item.icons).length, 0)} icons for ${collections.length} collections -> ${path.relative(root, outputFile)}`
)
