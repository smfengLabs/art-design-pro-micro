<script setup lang="ts">
import { withBase } from 'vitepress'
import { demoApps, siteConfig } from '../site'
import SiteHeader from './SiteHeader.vue'
import HeroVisual from './HeroVisual.vue'
import FeatureCard from './FeatureCard.vue'
import ArchitectureTree from './ArchitectureTree.vue'
import BrandMark from './BrandMark.vue'

const features = [
  {
    index: '01',
    title: '微前端聚合',
    description:
      'app-main 是唯一宿主。运行时按 remotes 注册表加载子应用路由，合并进同一套菜单、权限与布局，子应用无需为被聚合改一行代码。',
    tag: 'MF 2.0',
    icon: [
      'M12 3 3 7.5l9 4.5 9-4.5L12 3Z',
      'M3 12l9 4.5 9-4.5',
      'M3 16.5 12 21l9-4.5'
    ]
  },
  {
    index: '02',
    title: '独立单飞',
    description:
      '每个子应用自带 Layout、登录页与路由守卫，可以独占域名独立部署、独立发布，也能被宿主聚合，两种形态共用同一套核心。',
    tag: 'STANDALONE',
    icon: [
      'M12 3 4.5 6v5.2c0 4.4 3.2 8.5 7.5 9.8 4.3-1.3 7.5-5.4 7.5-9.8V6L12 3Z',
      'm8.8 12 2.1 2.1 4.4-4.4'
    ]
  },
  {
    index: '03',
    title: '秒开预加载',
    description:
      '登录后 requestIdleCallback 空闲预热 manifest、remoteEntry 与路由表，菜单悬停再预取页面 chunk，真正点击时直接命中缓存。',
    tag: 'PRELOAD',
    icon: ['m13 2-9 12h7l-1 8 9-12h-7l1-8Z']
  },
  {
    index: '04',
    title: 'CLI 脚手架',
    description:
      'app:create / app:list / app:delete 三条命令完成建应用、注册远端、追加 RouteName 与回收清理，校验不过直接失败、不落盘。',
    tag: 'CLI',
    icon: [
      'm5 7 4 4-4 4',
      'M12 15h7',
      'M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z'
    ]
  },
  {
    index: '05',
    title: '自动化门禁',
    description:
      'typecheck、dependency-cruiser 依赖方向、产物审计与双端 CI 组成质量门禁；GitHub Quality Gate 与 Gitee 双审批，越界代码合不进去。',
    tag: 'CI GATE',
    icon: [
      'M6 3v12',
      'M18 9v3a3 3 0 0 1-3 3H9',
      'M6 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
      'M18 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
      'M9 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z'
    ]
  },
  {
    index: '06',
    title: '错误隔离',
    description:
      '远端加载超时重试、ArtErrorBoundary 局部兜底、全局脚本与资源错误归集。单个子应用崩溃只影响自己的卡片，宿主继续可用。',
    tag: 'RESILIENCE',
    icon: [
      'M12 3c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3Z',
      'M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6',
      'M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6'
    ]
  }
]

const metrics = [
  { value: '03', label: '可部署应用单元' },
  { value: '06', label: '共享核心 packages' },
  { value: '01', label: '全局运行时实例' },
  { value: '02', label: '级预加载策略' }
]

const architecturePoints = [
  {
    title: 'apps/*',
    text: '只通过 Module Federation expose 通信，跨应用禁止源码引用。'
  },
  {
    title: 'packages/*',
    text: '依赖方向单向收敛，dependency-cruiser 在 CI 拦截回环与越层。'
  },
  {
    title: 'shared singleton',
    text: 'Vue、Pinia、Router、Element Plus 单实例，状态与权限不再分裂。'
  },
  {
    title: 'remotes 注册表',
    text: '新增子应用只追加一条注册项，宿主路由源与构建期 remotes 同源。'
  }
]

const startCommand =
  'git clone https://github.com/smfengLabs/art-design-pro-micro.git'
</script>

<template>
  <div class="ap-home">
    <SiteHeader />

    <main>
      <section class="ap-hero">
        <div class="ap-hero__grid" aria-hidden="true"></div>
        <div class="ap-hero__glow ap-hero__glow--one" aria-hidden="true"></div>
        <div class="ap-hero__glow ap-hero__glow--two" aria-hidden="true"></div>

        <div class="ap-shell ap-hero__inner">
          <div class="ap-hero__copy">
            <div class="ap-eyebrow">
              <span class="ap-eyebrow__dot"></span>
              Micro Frontend Architecture · MF 2.0
            </div>

            <h1 class="ap-hero__title">
              Art Design
              <span class="ap-text-gradient">Pro Micro</span>
            </h1>

            <p class="ap-hero__tagline">{{ siteConfig.tagline }}</p>
            <p class="ap-hero__desc">
              保留 Art Design Pro 的优雅界面与业务组件，把应用边界、状态共享、加载性能、脚手架与
              错误隔离做成可验证的工程约束。不是把单体拆开，而是让复杂度可控。
            </p>

            <div class="ap-hero__actions">
              <a class="ap-btn ap-btn--primary" :href="withBase(siteConfig.docs)">
                快速开始
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </a>
              <a
                class="ap-btn ap-btn--ghost"
                :href="siteConfig.demo"
                target="_blank"
                rel="noreferrer"
              >
                进入主应用（Demo）
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                  <path d="M14 5h5v5M19 5l-8 8" stroke-linecap="round" stroke-linejoin="round" />
                  <path d="M19 13v4a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4" stroke-linecap="round" />
                </svg>
              </a>
            </div>

            <div class="ap-hero__proof">
              <a
                class="ap-badge-link"
                :href="siteConfig.github"
                target="_blank"
                rel="noreferrer"
              >
                <img :src="siteConfig.badges.github" alt="GitHub stars" />
              </a>
              <a
                class="ap-badge-link"
                :href="siteConfig.gitee"
                target="_blank"
                rel="noreferrer"
              >
                <img :src="siteConfig.badges.gitee" alt="Gitee stars" />
              </a>
              <span class="ap-license">{{ siteConfig.version }} · {{ siteConfig.license }} License</span>
            </div>
          </div>

          <HeroVisual />
        </div>

        <div class="ap-shell ap-metrics">
          <div v-for="metric in metrics" :key="metric.label" class="ap-metric">
            <strong>{{ metric.value }}</strong>
            <span>{{ metric.label }}</span>
          </div>
        </div>
      </section>

      <section id="features" class="ap-section ap-features">
        <div class="ap-shell">
          <div class="ap-section-head">
            <div>
              <p class="ap-kicker">Architecture advantages</p>
              <h2>不是拼装，<br />是架构约束。</h2>
            </div>
            <p class="ap-section-head__desc">
              微前端的难点从来不是“加载另一个应用”，而是部署、状态、依赖与运行时的一致。
              这六件事，我们在底座层面解决。
            </p>
          </div>

          <div class="ap-feature-grid grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <FeatureCard
              v-for="feature in features"
              :key="feature.index"
              :feature="feature"
            />
          </div>
        </div>
      </section>

      <section id="demos" class="ap-section ap-demos">
        <div class="ap-shell">
          <div class="ap-section-head">
            <div>
              <p class="ap-kicker">Independent deployments</p>
              <h2>体验微前端<br />独立单飞。</h2>
            </div>
            <p class="ap-section-head__desc">
              三个应用各自构建、各自部署、各自发布。它们能被宿主聚合成同一套菜单与权限，
              也能用独立域名单独打开 —— 两种形态共用同一套核心。
            </p>
          </div>

          <div class="ap-demo-grid">
            <a
              v-for="app in demoApps"
              :key="app.key"
              class="ap-demo-card"
              :class="`ap-demo-card--${app.role.toLowerCase()}`"
              :href="app.url"
              target="_blank"
              rel="noreferrer"
            >
              <span class="ap-demo-card__head">
                <span class="ap-demo-card__role">{{ app.role }}</span>
                <span class="ap-demo-card__live">
                  <i></i>
                  独立部署
                </span>
              </span>

              <h3>
                {{ app.title }}
                <span>{{ app.roleLabel }}</span>
              </h3>
              <p>{{ app.description }}</p>

              <span class="ap-demo-card__foot">
                <code>{{ app.domain }}</code>
                <span class="ap-demo-card__go">
                  打开
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                    <path d="M9 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </span>
              </span>
            </a>
          </div>

          <p class="ap-demos__note">
            直接访问 <strong>app-system</strong> 或 <strong>app-example</strong> 域名时，会看到各自的独立登录页与完整布局；
            由 <strong>app-main</strong> 打开时，它们只贡献路由与页面。演示账号 <code>Super</code> / <code>123456</code>。
          </p>
        </div>
      </section>

      <section id="architecture" class="ap-section ap-architecture">
        <div class="ap-shell ap-architecture__grid">
          <div class="ap-architecture__copy">
            <p class="ap-kicker">Monorepo, with boundaries</p>
            <h2>目录结构，<br />也是运行时契约。</h2>
            <p>
              apps 是可部署单元，packages 是可共享能力。依赖方向由规则强制，而不是靠约定和记忆。
              子应用可以独立单飞，也可以被宿主聚合，两种形态共用同一套核心。
            </p>

            <ul class="ap-check-list">
              <li v-for="point in architecturePoints" :key="point.title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="m5 12 4 4L19 6" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                <span><strong>{{ point.title }}</strong> {{ point.text }}</span>
              </li>
            </ul>
          </div>

          <ArchitectureTree />
        </div>
      </section>

      <section id="start" class="ap-section ap-start">
        <div class="ap-shell">
          <div class="ap-start__panel">
            <p class="ap-kicker">Start building</p>
            <h2>把微前端的复杂度，<br />留在架构里。</h2>
            <p>
              从一次 clone 开始。安装依赖、启动工作区，宿主与子应用会各自就位。
              文档覆盖架构、接入与常见问题，下一步由你定义。
            </p>

            <div class="ap-start__actions">
              <a class="ap-btn ap-btn--primary" :href="withBase(siteConfig.docs)">
                阅读文档
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </a>
              <a
                class="ap-btn ap-btn--ghost"
                :href="siteConfig.github"
                target="_blank"
                rel="noreferrer"
              >
                查看源码
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                  <path d="M14 5h5v5M19 5l-8 8" stroke-linecap="round" stroke-linejoin="round" />
                  <path d="M19 13v4a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4" stroke-linecap="round" />
                </svg>
              </a>
            </div>

            <div class="ap-command-line">
              <span>$</span>
              <code>{{ startCommand }}</code>
            </div>
          </div>
        </div>
      </section>
    </main>

    <footer class="ap-footer">
      <div class="ap-shell ap-footer__inner">
        <a class="ap-footer__brand" :href="withBase('/')">
          <span class="ap-brand__mark"><BrandMark /></span>
          Art Design Pro Micro
        </a>
        <div class="ap-footer__links">
          <a :href="withBase(siteConfig.docs)">文档</a>
          <a :href="withBase('/docs/guide/cli')">CLI 脚手架</a>
          <a :href="withBase('/docs/architecture/')">架构</a>
          <a :href="withBase('/docs/faq')">FAQ</a>
          <a :href="siteConfig.github" target="_blank" rel="noreferrer">GitHub</a>
          <a :href="siteConfig.gitee" target="_blank" rel="noreferrer">Gitee</a>
        </div>
        <span class="ap-footer__meta">MIT · 2026</span>
      </div>
    </footer>
  </div>
</template>
