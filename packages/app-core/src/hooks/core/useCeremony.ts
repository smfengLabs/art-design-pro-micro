// 定时器均为原生实现（替代 @vueuse/core useTimeoutFn/useIntervalFn：微前端下 vueuse 实例
// 可能与组件 vue 实例不同源，其内部 watch 无法追踪组件 ref，这里不依赖跨实例响应式追踪）
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useSettingStore } from '../../store/modules/setting'
import { mittBus } from '@art/app-utils'
import { findCurrentFestival } from '../../utils/festival'

/**
 * 节日庆祝配置常量
 */
const FESTIVAL_CONFIG = {
  /** 初始延迟（毫秒） */
  INITIAL_DELAY: 300,
  /** 烟花播放间隔（毫秒） */
  FIREWORK_INTERVAL: 1000,
  /** 文本显示延迟（毫秒） */
  TEXT_DELAY: 2000,
  /** 默认烟花播放次数 */
  DEFAULT_FIREWORKS_COUNT: 3
} as const

/**
 * 节日庆祝功能
 * 提供节日烟花效果和祝福文本展示
 */
export function useCeremony() {
  const settingStore = useSettingStore()
  const { holidayFireworksLoaded, isShowFireworks } = storeToRefs(settingStore)

  let fireworksInterval: { pause: () => void } | null = null
  let pendingTimers: ReturnType<typeof setTimeout>[] = []

  const later = (fn: () => void, delay: number) => {
    const timer = setTimeout(() => {
      pendingTimers = pendingTimers.filter((t) => t !== timer)
      fn()
    }, delay)
    pendingTimers.push(timer)
  }

  /**
   * 获取当前日期对应的节日数据
   * （日期匹配逻辑提取至 utils/festival，解开与 setting store 的循环引用）
   */
  const currentFestivalData = computed(() => findCurrentFestival())

  const updateFestivalDate = () => {
    settingStore.setFestivalDate(currentFestivalData.value?.date || '')
  }

  const triggerFirework = () => {
    mittBus.emit('triggerFireworks', currentFestivalData.value?.image)
  }

  /**
   * 完成烟花效果后显示文本
   */
  const showFestivalText = () => {
    settingStore.setholidayFireworksLoaded(true)

    later(() => {
      settingStore.setShowFestivalText(true)
      updateFestivalDate()
    }, FESTIVAL_CONFIG.TEXT_DELAY)
  }

  /**
   * 启动烟花循环
   */
  const startFireworksLoop = () => {
    let playedCount = 0
    const count = currentFestivalData.value?.count ?? FESTIVAL_CONFIG.DEFAULT_FIREWORKS_COUNT

    let timerId: ReturnType<typeof setInterval> | null = null
    const pause = () => {
      if (timerId !== null) {
        clearInterval(timerId)
        timerId = null
      }
    }

    timerId = setInterval(() => {
      triggerFirework()
      playedCount++

      if (playedCount >= count) {
        pause()
        showFestivalText()
      }
    }, FESTIVAL_CONFIG.FIREWORK_INTERVAL)

    fireworksInterval = { pause }
  }

  /**
   * 开启节日庆祝
   */
  const openFestival = () => {
    if (!currentFestivalData.value || !isShowFireworks.value) return

    later(startFireworksLoop, FESTIVAL_CONFIG.INITIAL_DELAY)
  }

  /**
   * 清理烟花效果
   */
  const cleanup = () => {
    if (fireworksInterval) {
      fireworksInterval.pause()
      fireworksInterval = null
    }
    pendingTimers.forEach(clearTimeout)
    pendingTimers = []
    settingStore.setShowFestivalText(false)
    updateFestivalDate()
  }

  return {
    openFestival,
    cleanup,
    holidayFireworksLoaded,
    currentFestivalData,
    isShowFireworks
  }
}
