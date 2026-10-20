/**
 * 组件加载器
 *
 * 动态加载 Vue 组件。
 * 宿主在装配期通过 runtime.setComponentGlob/setLayoutComponent/setIframeComponent
 * 注入本地视图 glob 与布局/Iframe 组件（原实现直接 import.meta.glob 与 @/views 静态导入，
 * 微前端化后由各应用自持视图，见 v2 E1）。
 *
 * @module router/core/ComponentLoader
 */
import { h } from 'vue'
import { RoutesAlias } from '@art/app-utils'
import { getComponentGlob, getIframeComponent, getLayoutComponent } from '../runtime'

export class ComponentLoader {
  private modules: Record<string, () => Promise<any>>

  constructor() {
    // 归一化 glob 键：'./views/xxx.vue' / '/src/views/xxx.vue' 等 → 'views/xxx.vue'
    const raw = getComponentGlob()
    const normalized: Record<string, () => Promise<any>> = {}
    for (const [key, loader] of Object.entries(raw)) {
      normalized[key.replace(/^\.\//, '').replace(/^\/?src\//, '').replace(/^\//, '')] = loader
    }
    this.modules = normalized
  }

  /**
   * 加载组件
   */
  load(componentPath: string): () => Promise<any> {
    if (!componentPath) {
      return this.createEmptyComponent()
    }

    // 归一化业务路径：'/dashboard/console' → 'dashboard/console'
    const path = componentPath.replace(/^\/+/, '')

    // 布局壳语义别名（RoutesAlias.Layout = '/index/index'）：统一映射到宿主注入的布局组件
    // （@art/app-components/layouts），不再经过本地 views glob（开源清理后本地壳副本已退役）
    if (path === RoutesAlias.Layout.replace(/^\/+/, '')) {
      return this.loadLayout()
    }

    const fullPath = `views/${path}.vue`
    const fullPathWithIndex = `views/${path}/index.vue`

    // 先尝试直接路径，再尝试添加/index的路径
    const module = this.modules[fullPath] || this.modules[fullPathWithIndex]

    if (!module) {
      console.error(
        `[ComponentLoader] 未找到组件: ${componentPath}，尝试过路径: ${fullPath} 与 ${fullPathWithIndex}`
      )
      return this.createErrorComponent(componentPath)
    }

    return module
  }

  /**
   * 加载布局组件（host 注入）
   */
  loadLayout(): () => Promise<any> {
    const loader = getLayoutComponent()
    if (loader) {
      return loader
    }
    console.error('[ComponentLoader] 布局组件未注入：见 bootstrapApp localComponents.layoutComponent')
    return this.createErrorComponent('layout')
  }

  /**
   * 加载 iframe 组件（host 注入）
   */
  loadIframe(): () => Promise<any> {
    const loader = getIframeComponent()
    if (loader) {
      return loader
    }
    console.error('[ComponentLoader] Iframe 组件未注入：见 bootstrapApp localComponents.iframeComponent')
    return this.createErrorComponent('iframe')
  }

  /**
   * 加载空组件
   */
  private createEmptyComponent(): () => Promise<any> {
    return () =>
      Promise.resolve({
        render() {
          return h('div', {})
        }
      })
  }

  /**
   * 加载错误提示组件
   */
  private createErrorComponent(componentPath: string): () => Promise<any> {
    return () =>
      Promise.resolve({
        render() {
          return h('div', { class: 'route-error' }, `组件未找到: ${componentPath}`)
        }
      })
  }
}
