import { defineStore } from 'pinia'
import { ref } from 'vue'
import { AppRouteRecord } from '@art/app-utils'
import { getFirstMenuPath } from '../../utils/navigation/route'
import { getHomePagePath } from '../../router/runtime'

/**
 * 菜单状态管理
 * 管理应用的菜单列表、首页路径、菜单宽度和动态路由移除函数
 */
export const useMenuStore = defineStore('menuStore', () => {
  /** 首页路径 */
  const homePath = ref(getHomePagePath())
  /** 菜单列表 */
  const menuList = ref<AppRouteRecord[]>([])
  /** 菜单宽度 */
  const menuWidth = ref('')
  /** 存储路由移除函数的数组 */
  const removeRouteFns = ref<(() => void)[]>([])

  const setMenuList = (list: AppRouteRecord[]) => {
    menuList.value = list
    setHomePath(getHomePagePath() || getFirstMenuPath(list))
  }

  const getHomePath = () => homePath.value

  const setHomePath = (path: string) => {
    homePath.value = path
  }

  const addRemoveRouteFns = (fns: (() => void)[]) => {
    removeRouteFns.value.push(...fns)
  }

  const removeAllDynamicRoutes = () => {
    removeRouteFns.value.forEach((fn) => fn())
    removeRouteFns.value = []
  }

  const clearRemoveRouteFns = () => {
    removeRouteFns.value = []
  }

  return {
    menuList,
    menuWidth,
    removeRouteFns,
    setMenuList,
    getHomePath,
    setHomePath,
    addRemoveRouteFns,
    removeAllDynamicRoutes,
    clearRemoveRouteFns
  }
})
