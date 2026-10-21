import type { Router } from 'vue-router'
import { loadingService } from '../../utils/ui/index'
import { removeProgress } from '../../utils/router'
import { resetPendingLoading } from './beforeEach'

export function setupRouterErrorHandler(router: Router): void {
  router.onError((error, to) => {
    const reason = error instanceof Error ? error.message : String(error)
    console.error(
      `[RouteGuard] 路由导航失败（${to.fullPath}）：${reason}\n` +
        '  → 远端子应用模块加载中断（常见于 dev server 重新预构建依赖的窗口期）；请刷新页面重试'
    )

    // 错误路径不会触发 afterEach：在此清理进度条与全屏 loading
    removeProgress()
    loadingService.hideLoading()
    resetPendingLoading()
  })
}
