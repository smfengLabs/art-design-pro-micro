export interface DemoApp {
  key: string
  title: string
  role: 'Host' | 'Remote'
  roleLabel: string
  description: string
  domain: string
  url: string
}

export const demoApps: DemoApp[] = [
  {
    key: 'app-main',
    title: '主应用',
    role: 'Host',
    roleLabel: '极薄基座',
    description: '极薄基座，统一登录与路由调度',
    domain: 'app-main.qxiangkj.cn',
    url: 'https://app-main.qxiangkj.cn'
  },
  {
    key: 'app-system',
    title: '业务系统',
    role: 'Remote',
    roleLabel: '权限微应用',
    description: '权限管理微应用，可独立运行',
    domain: 'app-system.qxiangkj.cn',
    url: 'https://app-system.qxiangkj.cn'
  },
  {
    key: 'app-example',
    title: '示例组件',
    role: 'Remote',
    roleLabel: '组件与模板',
    description: '高级表格、编辑器与模板库',
    domain: 'app-example.qxiangkj.cn',
    url: 'https://app-example.qxiangkj.cn'
  }
]

export const siteConfig = {
  name: 'Art Design Pro Micro',
  tagline: '基于 Vue 3 + MF 2.0 的企业级微前端底座',
  description:
    '面向企业级中后台的微前端底座：Module Federation 聚合、子应用独立单飞、两级预加载、CLI 脚手架、自动化门禁与错误隔离。',
  version: 'v1.5.0',
  license: 'MIT',
  docs: '/docs/guide/getting-started',
  github: 'https://github.com/smfengLabs/art-design-pro-micro',
  gitee: 'https://gitee.com/smfengLabs/art-design-pro-micro',
  demo: demoApps[0].url,
  badges: {
    github:
      'https://img.shields.io/github/stars/smfengLabs/art-design-pro-micro?style=social',
    gitee:
      'https://gitee.com/smfengLabs/art-design-pro-micro/badge/star.svg?theme=dark'
  }
}
