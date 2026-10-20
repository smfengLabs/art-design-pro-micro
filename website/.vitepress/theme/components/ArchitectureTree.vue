<script setup lang="ts">
import { onUnmounted, ref } from 'vue'

type NodeKind = 'root' | 'folder' | 'app' | 'package' | 'config'

interface TreeLine {
  branch: string
  name: string
  comment: string
  kind: NodeKind
}

const tree: TreeLine[] = [
  {
    branch: '',
    name: 'art-design-pro-micro/',
    comment: 'pnpm workspace',
    kind: 'root'
  },
  { branch: '├─ ', name: 'apps/', comment: 'deployable units', kind: 'folder' },
  {
    branch: '│  ├─ ',
    name: 'app-main/',
    comment: 'host · shell',
    kind: 'app'
  },
  {
    branch: '│  └─ ',
    name: 'app-system/',
    comment: 'remote · system',
    kind: 'app'
  },
  {
    branch: '├─ ',
    name: 'packages/',
    comment: 'shared runtime',
    kind: 'folder'
  },
  {
    branch: '│  ├─ ',
    name: 'app-core/',
    comment: 'router · store · guards',
    kind: 'package'
  },
  {
    branch: '│  ├─ ',
    name: 'app-api/',
    comment: 'http · websocket',
    kind: 'package'
  },
  {
    branch: '│  ├─ ',
    name: 'app-components/',
    comment: 'ui · layout shell',
    kind: 'package'
  },
  {
    branch: '│  ├─ ',
    name: 'app-utils/',
    comment: 'utils · route names',
    kind: 'package'
  },
  {
    branch: '│  ├─ ',
    name: 'app-base/',
    comment: 'bootstrap',
    kind: 'package'
  },
  {
    branch: '│  └─ ',
    name: 'app-config/',
    comment: 'vite · mf 2.0',
    kind: 'package'
  },
  {
    branch: '└─ ',
    name: 'dependency-cruiser.js',
    comment: 'boundary rules',
    kind: 'config'
  }
]

const treeText = tree
  .map(({ branch, name, comment }) => `${branch}${name}${comment ? `  # ${comment}` : ''}`)
  .join('\n')

const copied = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

async function copyTree() {
  try {
    await navigator.clipboard.writeText(treeText)
  } catch {
    copied.value = false
    return
  }

  copied.value = true
  clearTimeout(timer)
  timer = setTimeout(() => {
    copied.value = false
  }, 1800)
}

onUnmounted(() => clearTimeout(timer))
</script>

<template>
  <div class="ap-tree-card">
    <div class="ap-tree-card__bar">
      <span class="ap-tree-card__dots" aria-hidden="true"><i></i><i></i><i></i></span>
      <span class="ap-tree-card__file">monorepo.tree</span>
      <button type="button" class="ap-tree-card__copy" @click="copyTree">
        {{ copied ? 'Copied' : 'Copy' }}
      </button>
    </div>

    <div class="ap-tree-card__body" aria-label="Monorepo 目录结构">
      <div v-for="line in tree" :key="line.name" class="ap-tree-line">
        <span class="ap-tree-line__branch">{{ line.branch }}</span>
        <span
          class="ap-tree-line__name"
          :class="`ap-tree-line__name--${line.kind}`"
        >
          {{ line.name }}
        </span>
        <span v-if="line.comment" class="ap-tree-line__comment">
          {{ `  # ${line.comment}` }}
        </span>
      </div>
    </div>

    <div class="ap-tree-card__footer">
      <span><strong>apps/*</strong> deployable</span>
      <span><strong>packages/*</strong> shared</span>
    </div>
  </div>
</template>
