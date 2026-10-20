import { onBeforeUnmount, watch, type Ref } from 'vue'

// 不用 VueUse：微前端下 remote 的 vueuse 实例可能无法追踪宿主 ref，改用原生 ResizeObserver
export function useObservedElementHeight(elRef: Ref<HTMLElement | undefined>, heightRef: Ref<number>) {
  let observer: ResizeObserver | null = null
  let observedEl: HTMLElement | null = null
  let rafId: number | null = null

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
