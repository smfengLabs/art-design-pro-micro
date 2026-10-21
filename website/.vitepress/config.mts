import { defineConfig } from 'vitepress'
import { siteConfig } from './theme/site'

const base = process.env.DOCS_BASE || '/'
const asset = (path: string) =>
  `${base.endsWith('/') ? base : `${base}/`}${path.replace(/^\//, '')}`

const giteeIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm3.7 6.3a1 1 0 0 1 .2 1.4l-2.3 3h1.7a1 1 0 0 1 .8 1.6l-2.9 3.8a1 1 0 1 1-1.6-1.2l2.1-2.8h-1.8a1 1 0 0 1-.8-1.6l3.2-4.1a1 1 0 0 1 1.4-.1Z"/></svg>`

export default defineConfig({
  lang: 'zh-CN',
  title: siteConfig.name,
  description: siteConfig.description,
  base,
  appearance: true,
  cleanUrls: true,
  srcExclude: ['README.md'],
  lastUpdated: true,
  markdown: {
    theme: 'github-dark'
  },
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: asset('logo.svg') }],
    ['link', { rel: 'preconnect', href: 'https://img.shields.io' }],
    ['link', { rel: 'preconnect', href: 'https://gitee.com' }],
    ['meta', { name: 'theme-color', content: '#08080e' }],
    ['meta', { name: 'author', content: 'smfengLabs' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: siteConfig.name }],
    ['meta', { property: 'og:description', content: siteConfig.description }]
  ],
  themeConfig: {
    logo: '/logo.svg',
    siteTitle: siteConfig.name,
    nav: [
      { text: '首页', link: '/' },
      {
        text: '文档',
        link: '/docs/guide/getting-started',
        activeMatch: '/docs/'
      },
      { text: 'CLI 脚手架', link: '/docs/guide/cli' },
      { text: '架构', link: '/docs/architecture/' },
      { text: 'FAQ', link: '/docs/faq' },
      { text: '在线演示', link: siteConfig.demo }
    ],
    sidebar: {
      '/docs/': [
        {
          text: '入门',
          items: [
            { text: '快速上手', link: '/docs/guide/getting-started' },
            { text: 'CLI 脚手架使用', link: '/docs/guide/cli' }
          ]
        },
        {
          text: '架构',
          items: [
            { text: '核心架构说明', link: '/docs/architecture/' },
            { text: '微应用接入指南', link: '/docs/guide/micro-app' }
          ]
        },
        {
          text: '支持',
          items: [{ text: '常见问题', link: '/docs/faq' }]
        }
      ]
    },
    socialLinks: [
      { icon: 'github', link: siteConfig.github },
      { icon: { svg: giteeIcon }, link: siteConfig.gitee }
    ],
    search: {
      provider: 'local',
      options: {
        translations: {
          button: {
            buttonText: '搜索文档',
            buttonAriaLabel: '搜索文档'
          },
          modal: {
            noResultsText: '没有找到结果',
            resetButtonTitle: '清除条件',
            footer: {
              selectText: '选择',
              navigateText: '切换',
              closeText: '关闭'
            }
          }
        }
      }
    },
    outline: {
      level: [2, 3],
      label: '本页导航'
    },
    docFooter: {
      prev: '上一页',
      next: '下一页'
    },
    lastUpdated: {
      text: '最后更新',
      formatOptions: {
        dateStyle: 'medium',
        timeStyle: 'short'
      }
    },
    editLink: {
      pattern:
        'https://github.com/smfengLabs/art-design-pro-micro/edit/main/website/:path',
      text: '在 GitHub 上编辑此页'
    },
    footer: {
      message: '基于 MIT 协议开源 · 为微前端工程化而生',
      copyright: `Copyright © 2026 ${siteConfig.name}`
    },
    darkModeSwitchLabel: '外观',
    lightModeSwitchTitle: '切换到浅色模式',
    darkModeSwitchTitle: '切换到深色模式',
    sidebarMenuLabel: '文档目录',
    returnToTopLabel: '回到顶部',
    externalLinkIcon: true
  }
})
