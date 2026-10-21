import { nextTick } from 'vue'
import { Router } from 'vue-router'
import { useCommon } from '../../hooks/core/useCommon'
import { doneProgress } from '../../utils/router'
import { loadingService } from '../../utils/ui/index'
import { getPendingLoading, resetPendingLoading } from './beforeEach'

export function setupAfterEachGuard(router: Router) {
  const { scrollToTop } = useCommon()

  router.afterEach(() => {
    scrollToTop()
    // 无论当前设置是否开启，都清理可能残留的进度条
    doneProgress()

    if (getPendingLoading()) {
      nextTick(() => {
        loadingService.hideLoading()
        resetPendingLoading()
      })
    }
  })
}
