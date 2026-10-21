import { nextTick } from 'vue'
import { Router } from 'vue-router'
import { useCommon } from '../../hooks/core/useCommon'
import { doneProgress } from '../../utils/router'
import { loadingService } from '../../utils/ui/index'
import { useUserStore } from '../../store/modules/user'
import { scheduleRemoteIdlePreload } from '../preload'
import { getPendingLoading, resetPendingLoading } from './beforeEach'

export function setupAfterEachGuard(router: Router) {
  const { scrollToTop } = useCommon()

  router.afterEach((to) => {
    scrollToTop()
    // 无论当前设置是否开启，都清理可能残留的进度条
    doneProgress()

    if (getPendingLoading()) {
      nextTick(() => {
        loadingService.hideLoading()
        resetPendingLoading()
      })
    }

    // 进入认证后的业务页面后再预热子应用，登录页与异常页不占用网络
    const isAuthPage = to.path === '/login' || to.path.startsWith('/auth/')
    const isExceptionPage = String(to.name || '').startsWith('Exception')

    if (useUserStore().isLogin && !isAuthPage && !isExceptionPage) {
      scheduleRemoteIdlePreload()
    }
  })
}
