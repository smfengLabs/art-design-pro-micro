import type { Router, RouteLocationNormalized, NavigationGuardNext } from 'vue-router'
import { nextTick } from 'vue'
import NProgress from 'nprogress'
import { useSettingStore } from '../../store/modules/setting'
import { useUserStore } from '../../store/modules/user'
import { useMenuStore } from '../../store/modules/menu'
import { setWorktab } from '../../utils/navigation/index'
import { setPageTitle } from '../../utils/router'
import { RoutesAlias } from '@art/app-utils'
import {
  getRouteRegistry,
  setRouteRegistry,
  isRouteInitFailed,
  markRouteInitFailed,
  isRouteInitInProgress,
  setRouteInitInProgress,
  getStaticRoutes
} from '../runtime'
import { loadingService } from '../../utils/ui/index'
import { useCommon } from '../../hooks/core/useCommon'
import { useWorktabStore } from '../../store/modules/worktab'
import { fetchGetUserInfo } from '@art/app-api'
import { ApiStatus } from '@art/app-utils'
import { isHttpError } from '@art/app-api'
import { RouteRegistry, MenuProcessor, IframeRouteManager, RoutePermissionValidator } from '../core/index'
import { initSocket } from '../../utils/socket'

const menuProcessor = new MenuProcessor()

// F5 后模块级 socket 单例丢失；已登录时幂等补连，token 通过查询参数携带
function ensureSocketConnected(): void {
  const userStore = useUserStore()
  if (userStore.isLogin && userStore.accessToken) {
    initSocket()
  }
}

let pendingLoading = false

export function getPendingLoading(): boolean {
  return pendingLoading
}

export function resetPendingLoading(): void {
  pendingLoading = false
}

export function getRouteInitFailed(): boolean {
  return isRouteInitFailed()
}

export function setupBeforeEachGuard(router: Router): void {
  setRouteRegistry(new RouteRegistry(router))

  router.beforeEach(
    async (
      to: RouteLocationNormalized,
      from: RouteLocationNormalized,
      next: NavigationGuardNext
    ) => {
      try {
        await handleRouteGuard(to, from, next, router)
      } catch (error) {
        console.error('[RouteGuard] 路由守卫处理失败:', error)
        closeLoading()
        next({ name: 'Exception500' })
      }
    }
  )
}

function closeLoading(): void {
  if (pendingLoading) {
    nextTick(() => {
      loadingService.hideLoading()
      pendingLoading = false
    })
  }
}

async function handleRouteGuard(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext,
  router: Router
): Promise<void> {
  const settingStore = useSettingStore()
  const userStore = useUserStore()

  if (settingStore.showNprogress) {
    NProgress.start()
  }

  if (!handleLoginStatus(to, userStore, next)) {
    return
  }

  if (isRouteInitFailed()) {
    if (to.matched.length > 0) {
      next()
    } else {
      next({ name: 'Exception500', replace: true })
    }
    return
  }

  if (!getRouteRegistry()?.isRegistered() && userStore.isLogin) {
    // 防止并发请求（快速连续导航场景）
    if (isRouteInitInProgress()) {
      next(false)
      return
    }
    await handleDynamicRoutes(to, next, router)
    return
  }

  if (handleRootPathRedirect(to, next)) {
    return
  }

  if (to.matched.length > 0) {
    setWorktab(to)
    setPageTitle(to)
    next()
    return
  }

  next({ name: 'Exception404' })
}

function handleLoginStatus(
  to: RouteLocationNormalized,
  userStore: ReturnType<typeof useUserStore>,
  next: NavigationGuardNext
): boolean {
  if (userStore.isLogin || to.path === RoutesAlias.Login || isStaticRoute(to.path)) {
    ensureSocketConnected()
    return true
  }

  userStore.logOut()
  next({
    name: 'Login',
    query: { redirect: to.fullPath }
  })
  return false
}

function isStaticRoute(path: string): boolean {
  const checkRoute = (routes: any[], targetPath: string, parentPath = ''): boolean => {
    return routes.some((route) => {
      // 404 catch-all 路由不应视为可匿名访问的静态页，
      // 否则未登录时手动输入任意地址会直接落到 404，无法跳转登录页。
      if (route.name === 'Exception404') {
        return false
      }

      // 处理动态路由参数匹配（迁移稳健性修订：子路由相对路径需先与父路径拼接，
      // 否则嵌套静态路由（如 /system/hello）永不匹配、未登录访问被误拦到登录页）
      const routePath = route.path
      const fullPath =
        routePath.startsWith('/') || !parentPath
          ? routePath
          : `${parentPath}/${routePath}`.replace(/\/+/g, '/')
      const pattern = fullPath.replace(/:[^/]+/g, '[^/]+').replace(/\*/g, '.*')
      const regex = new RegExp(`^${pattern}$`)

      if (regex.test(targetPath)) {
        return true
      }
      if (route.children && route.children.length > 0) {
        return checkRoute(route.children, targetPath, fullPath)
      }
      return false
    })
  }

  return checkRoute(getStaticRoutes(), path)
}

async function handleDynamicRoutes(
  to: RouteLocationNormalized,
  next: NavigationGuardNext,
  router: Router
): Promise<void> {
  setRouteInitInProgress(true)

  pendingLoading = true
  loadingService.showLoading()

  try {
    await fetchUserInfo()

    const menuList = await menuProcessor.getMenuList()

    if (!menuProcessor.validateMenuList(menuList)) {
      throw new Error('获取菜单列表失败，请重新登录')
    }

    getRouteRegistry()?.register(menuList)

    const menuStore = useMenuStore()
    menuStore.setMenuList(menuList)
    menuStore.addRemoveRouteFns(getRouteRegistry()?.getRemoveRouteFns() || [])

    IframeRouteManager.getInstance().save()

    useWorktabStore().validateWorktabs(router)

    if (isStaticRoute(to.path)) {
      setRouteInitInProgress(false)
      next({
        path: to.path,
        query: to.query,
        hash: to.hash,
        replace: true
      })
      return
    }

    const { homePath } = useCommon()
    const { path: validatedPath, hasPermission } = RoutePermissionValidator.validatePath(
      to.path,
      menuList,
      homePath.value || '/'
    )

    setRouteInitInProgress(false)

    if (!hasPermission) {
      closeLoading()

      console.warn(`[RouteGuard] 用户无权限访问路径: ${to.path}，已跳转到首页`)

      next({
        path: validatedPath,
        replace: true
      })
    } else {
      next({
        path: to.path,
        query: to.query,
        hash: to.hash,
        replace: true
      })
    }
  } catch (error) {
    console.error('[RouteGuard] 动态路由注册失败:', error)

    closeLoading()

    // 401 错误：axios 拦截器已处理退出登录，取消当前导航
    if (isUnauthorizedError(error)) {
      setRouteInitInProgress(false)
      next(false)
      return
    }

    // 标记初始化失败，防止死循环
    markRouteInitFailed()
    setRouteInitInProgress(false)

    if (isHttpError(error)) {
      console.error(`[RouteGuard] 错误码: ${error.code}, 消息: ${error.message}`)
    }

    // 跳转到 500 页面，使用 replace 避免产生历史记录
    next({ name: 'Exception500', replace: true })
  }
}

async function fetchUserInfo(): Promise<void> {
  const userStore = useUserStore()
  const data = await fetchGetUserInfo()
  userStore.setUserInfo(data)
  userStore.checkAndClearWorktabs()
}

function handleRootPathRedirect(to: RouteLocationNormalized, next: NavigationGuardNext): boolean {
  if (to.path !== '/') {
    return false
  }

  const { homePath } = useCommon()
  if (homePath.value && homePath.value !== '/') {
    next({ path: homePath.value, replace: true })
    return true
  }

  return false
}

function isUnauthorizedError(error: unknown): boolean {
  return isHttpError(error) && error.code === ApiStatus.unauthorized
}
