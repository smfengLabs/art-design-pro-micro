/**
 * useObservedElementHeight - 原生 ResizeObserver 元素高度观测
 *
 * 微前端容错：使用原生 ResizeObserver 观测元素高度
 *
 * 不使用 @vueuse/core 的 useResizeObserver：在微前端（宿主 + 远程共享模块）场景下，
 * 远程模块中的 vueuse 实例可能与组件自身的 vue 实例并非同一份运行时，
 * 其内部 watch 无法追踪组件创建的 ref，导致回调永不触发、高度恒为 0。
 * 这里使用原生 ResizeObserver + requestAnimationFrame 主动补测，不依赖跨实例的响应式追踪：
 * - watch 组件自身 vue 副本的元素 ref，元素挂载/替换后自动重新观测
 * - 元素接入观测后先同步补测一次（不依赖渲染帧，后台标签页 rAF 暂停时同样有效），下一帧再复测
 * - 尺寸变化时 rAF 延迟回填，避免 ResizeObserver loop 警告（与原实现一致）
 *
 * @module useObservedElementHeight
 * @author Art Design Pro Team
 */

import { onBeforeUnmount, watch, type Ref } from 'vue'

export function useObservedElementHeight(elRef: Ref<HTMLElement | undefined>, heightRef: Ref<number>) {
  let observer: ResizeObserver | null = null
  let observedEl: HTMLElement | null = null
  let rafId: number | null = null

  /** 取消已排队的补测 */
  const cancelScheduledMeasure = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  }

  /** 读取元素高度并回填（元素脱离文档或高度为 0 时跳过，保留上次有效值） */
  const readHeight = () => {
    if (observedEl && observedEl.offsetHeight > 0) {
      heightRef.value = observedEl.offsetHeight
    }
  }

  /** 在下一帧读取元素高度并回填（rAF 延迟以规避 ResizeObserver loop 警告，与原实现一致） */
  const measure = () => {
    cancelScheduledMeasure()
    rafId = requestAnimationFrame(() => {
      rafId = null
      readHeight()
    })
  }

  /** 解除观测并清理待执行的测量 */
  const detach = () => {
    cancelScheduledMeasure()
    observer?.disconnect()
    observer = null
    observedEl = null
  }

  /** 观测新的元素（同元素重复调用直接忽略；传入空值时解除观测） */
  const attach = (el?: HTMLElement) => {
    if (el === observedEl) return
    detach()
    if (!el) return
    observedEl = el
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(measure)
      observer.observe(el)
    }
    // 立即同步补测一次：不依赖渲染帧，后台/遮挡标签页 rAF 被暂停时也能拿到正确高度
    readHeight()
    // 再在下一帧复测，覆盖异步挂载、布局完成后的最终尺寸
    measure()
  }

  watch(elRef, (el) => attach(el), { flush: 'post' })
  onBeforeUnmount(detach)
}
