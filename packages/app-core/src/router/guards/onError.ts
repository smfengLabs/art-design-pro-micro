/**
 * 路由导航错误兜底
 *
 * vue-router 4 在「组件 chunk 加载失败/超时」等导航错误路径下走 triggerError（router.onError），
 * 不会触发 afterEach —— 若无兜底，NProgress 进度条与全屏 loading 会永久残留
 * （表现为切换到子应用页面时无限转圈）。
 *
 * @module router/guards/onError
 */
import NProgress from 'nprogress'
import type { Router } from 'vue-router'
import { loadingService } from '../../utils/ui/index'
import { resetPendingLoading } from './beforeEach'

/**
 * 注册导航错误兜底：输出明确错误并强制清理全局加载痕迹
 */
export function setupRouterErrorHandler(router: Router): void {
  router.onError((error, to) => {
    const reason = error instanceof Error ? error.message : String(error)
    console.error(
      `[RouteGuard] 路由导航失败（${to.fullPath}）：${reason}\n` +
        '  → 远端子应用模块加载中断（常见于 dev server 重新预构建依赖的窗口期）；请刷新页面重试'
    )

    // 错误路径不会触发 afterEach：在此清理进度条与全屏 loading
    NProgress.done()
    setTimeout(() => {
      NProgress.remove()
    }, 600)
    loadingService.hideLoading()
    resetPendingLoading()
  })
}
