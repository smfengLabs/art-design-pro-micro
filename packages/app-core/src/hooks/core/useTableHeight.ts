import { computed, ref, type Ref } from 'vue'
import { useObservedElementHeight } from './useObservedElementHeight'

interface TableHeightOptions {
  /** 是否显示表格头部 */
  showTableHeader: Ref<boolean>
  /** 分页器高度 */
  paginationHeight: Ref<number>
  /** 表格头部高度 */
  tableHeaderHeight: Ref<number>
  /** 分页器间距 */
  paginationSpacing: Ref<number>
}

class TableHeightCalculator {
  private static readonly DEFAULT_TABLE_HEADER_HEIGHT = 44
  private static readonly TABLE_HEADER_SPACING = 12

  constructor(private options: TableHeightOptions) {}

  calculate(): { height: string } {
    const offset = this.calculateOffset()
    return {
      height: offset === 0 ? '100%' : `calc(100% - ${offset}px)`
    }
  }

  private calculateOffset(): number {
    if (!this.options.showTableHeader.value) {
      return this.calculatePaginationOffset()
    }

    const headerHeight = this.getHeaderHeight()
    const paginationOffset = this.calculatePaginationOffset()

    return headerHeight + paginationOffset + TableHeightCalculator.TABLE_HEADER_SPACING
  }

  private getHeaderHeight(): number {
    return this.options.tableHeaderHeight.value || TableHeightCalculator.DEFAULT_TABLE_HEADER_HEIGHT
  }

  private calculatePaginationOffset(): number {
    const { paginationHeight, paginationSpacing } = this.options
    return paginationHeight.value === 0 ? 0 : paginationHeight.value + paginationSpacing.value
  }
}

export function useTableHeight(options: TableHeightOptions) {
  const containerHeight = computed(() => {
    const calculator = new TableHeightCalculator(options)
    return calculator.calculate()
  })

  return {
    /** 容器高度样式对象 */
    containerHeight
  }
}

export interface TableAutoHeightOptions {
  /** 是否显示表格头部 */
  showTableHeader: Ref<boolean>
  /** 分页器高度间距 */
  paginationSpacing: Ref<number>
  /** 分页器元素引用 */
  paginationRef: Ref<HTMLElement | undefined>
  /** 表格头部元素引用 */
  tableHeaderRef: Ref<HTMLElement | undefined>
}

// 原生 ResizeObserver 观测表头/分页器，兼容微前端异步挂载
export function useTableAutoHeight(options: TableAutoHeightOptions) {
  const paginationHeight = ref(0)
  const tableHeaderHeight = ref(0)

  useObservedElementHeight(options.paginationRef, paginationHeight)
  useObservedElementHeight(options.tableHeaderRef, tableHeaderHeight)

  const { containerHeight } = useTableHeight({
    showTableHeader: options.showTableHeader,
    paginationHeight,
    tableHeaderHeight,
    paginationSpacing: options.paginationSpacing
  })

  return {
    /** 容器高度样式对象 */
    containerHeight,
    /** 分页器实测高度 */
    paginationHeight,
    /** 表格头部实测高度 */
    tableHeaderHeight
  }
}
