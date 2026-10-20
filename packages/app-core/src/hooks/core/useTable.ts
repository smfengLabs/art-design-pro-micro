import { ref, reactive, computed, onMounted, onUnmounted, nextTick, readonly } from 'vue'
import { useTableColumns } from './useTableColumns'
import type { ColumnOption } from '@art/app-utils'
import {
  TableCache,
  CacheInvalidationStrategy,
  type ApiResponse
} from '@art/app-utils'
import {
  type TableError,
  defaultResponseAdapter,
  extractTableData,
  updatePaginationFromResponse,
  createSmartDebounce,
  createErrorHandler
} from '@art/app-utils'
import { tableConfig } from '@art/app-utils'

type InferApiParams<T> = T extends (params: infer P) => any ? P : never
type InferApiResponse<T> = T extends (params: any) => Promise<infer R> ? R : never
type InferRecordType<T> = T extends Api.Common.PaginatedResponse<infer U> ? U : never

export interface UseTableConfig<
  TApiFn extends (params: any) => Promise<any> = (params: any) => Promise<any>,
  TRecord = InferRecordType<InferApiResponse<TApiFn>>,
  TParams = InferApiParams<TApiFn>,
  TResponse = InferApiResponse<TApiFn>
> {
  core: {
    /** API 请求函数 */
    apiFn: TApiFn
    /** 默认请求参数 */
    apiParams?: Partial<TParams>
    /** 排除 apiParams 中的属性 */
    excludeParams?: string[]
    /** 是否立即加载数据 */
    immediate?: boolean
    /** 列配置工厂函数 */
    columnsFactory?: () => ColumnOption<TRecord>[]
    /** 自定义分页字段映射 */
    paginationKey?: {
      /** 当前页码字段名，默认为 'current' */
      current?: string
      /** 每页条数字段名，默认为 'size' */
      size?: string
    }
  }

  transform?: {
    /** 数据转换函数 */
    dataTransformer?: (data: TRecord[]) => TRecord[]
    /** 响应数据适配器 */
    responseAdapter?: (response: TResponse) => ApiResponse<TRecord>
  }

  performance?: {
    /** 是否启用缓存 */
    enableCache?: boolean
    /** 缓存时间（毫秒） */
    cacheTime?: number
    /** 防抖延迟时间（毫秒） */
    debounceTime?: number
    /** 最大缓存条数限制 */
    maxCacheSize?: number
  }

  hooks?: {
    /** 数据加载成功回调（仅网络请求成功时触发） */
    onSuccess?: (data: TRecord[], response: ApiResponse<TRecord>) => void
    /** 错误处理回调 */
    onError?: (error: TableError) => void
    /** 缓存命中回调（从缓存获取数据时触发） */
    onCacheHit?: (data: TRecord[], response: ApiResponse<TRecord>) => void
    /** 加载状态变化回调 */
    onLoading?: (loading: boolean) => void
    /** 重置表单回调函数 */
    resetFormCallback?: () => void
  }

  debug?: {
    /** 是否启用日志输出 */
    enableLog?: boolean
    /** 日志级别 */
    logLevel?: 'info' | 'warn' | 'error'
  }
}

export function useTable<TApiFn extends (params: any) => Promise<any>>(
  config: UseTableConfig<TApiFn>
) {
  return useTableImpl(config)
}

function useTableImpl<TApiFn extends (params: any) => Promise<any>>(
  config: UseTableConfig<TApiFn>
) {
  type TRecord = InferRecordType<InferApiResponse<TApiFn>>
  type TParams = InferApiParams<TApiFn>
  const {
    core: {
      apiFn,
      apiParams = {} as Partial<TParams>,
      excludeParams = [],
      immediate = true,
      columnsFactory,
      paginationKey
    },
    transform: { dataTransformer, responseAdapter = defaultResponseAdapter } = {},
    performance: {
      enableCache = false,
      cacheTime = 5 * 60 * 1000,
      debounceTime = 300,
      maxCacheSize = 50
    } = {},
    hooks: { onSuccess, onError, onCacheHit, resetFormCallback } = {},
    debug: { enableLog = false } = {}
  } = config

  const pageKey = paginationKey?.current || tableConfig.paginationKey.current
  const sizeKey = paginationKey?.size || tableConfig.paginationKey.size

  // 响应式触发器，用于手动更新缓存统计信息
  const cacheUpdateTrigger = ref(0)

  const logger = {
    log: (message: string, ...args: unknown[]) => {
      if (enableLog) {
        console.log(`[useTable] ${message}`, ...args)
      }
    },
    warn: (message: string, ...args: unknown[]) => {
      if (enableLog) {
        console.warn(`[useTable] ${message}`, ...args)
      }
    },
    error: (message: string, ...args: unknown[]) => {
      if (enableLog) {
        console.error(`[useTable] ${message}`, ...args)
      }
    }
  }

  const cache = enableCache ? new TableCache<TRecord>(cacheTime, maxCacheSize, enableLog) : null

  type LoadingState = 'idle' | 'loading' | 'success' | 'error'
  const loadingState = ref<LoadingState>('idle')
  const loading = computed(() => loadingState.value === 'loading')

  const error = ref<TableError | null>(null)

  const data = ref<TRecord[]>([])

  let abortController: AbortController | null = null

  let cacheCleanupTimer: NodeJS.Timeout | null = null

  const searchParams = reactive(
    Object.assign(
      {
        [pageKey]: 1,
        [sizeKey]: 10
      },
      apiParams || {}
    ) as TParams
  )

  const pagination = reactive<Api.Common.PaginationParams>({
    current: ((searchParams as Record<string, unknown>)[pageKey] as number) || 1,
    size: ((searchParams as Record<string, unknown>)[sizeKey] as number) || 10,
    total: 0
  })

  // 原生 window resize 监听（替代 @vueuse/core useWindowSize：微前端下 vueuse 实例可能
  // 与组件 vue 实例不同源，其内部 watch 无法追踪组件 ref，这里不依赖跨实例响应式追踪）
  const viewportWidth = ref(typeof window === 'undefined' ? 1280 : window.innerWidth)
  const handleViewportResize = () => {
    viewportWidth.value = window.innerWidth
  }
  onMounted(() => {
    window.addEventListener('resize', handleViewportResize)
  })
  onUnmounted(() => {
    window.removeEventListener('resize', handleViewportResize)
  })
  const mobilePagination = computed(() => ({
    ...pagination,
    small: viewportWidth.value < 768
  }))

  const columnConfig = columnsFactory ? useTableColumns<TRecord>(columnsFactory) : null
  const columns = columnConfig?.columns
  const columnChecks = columnConfig?.columnChecks

  const hasData = computed(() => data.value.length > 0)

  const cacheInfo = computed(() => {
    // 依赖触发器，确保缓存变化时重新计算
    void cacheUpdateTrigger.value
    if (!cache) return { total: 0, size: '0KB', hitRate: '0 avg hits' }
    return cache.getStats()
  })

  const handleError = createErrorHandler(onError, enableLog)

  const clearCache = (strategy: CacheInvalidationStrategy, context?: string): void => {
    if (!cache) return

    let clearedCount = 0

    switch (strategy) {
      case CacheInvalidationStrategy.CLEAR_ALL:
        cache.clear()
        logger.log(`清空所有缓存 - ${context || ''}`)
        break

      case CacheInvalidationStrategy.CLEAR_CURRENT:
        clearedCount = cache.clearCurrentSearch(searchParams)
        logger.log(`清空当前搜索缓存 ${clearedCount} 条 - ${context || ''}`)
        break

      case CacheInvalidationStrategy.CLEAR_PAGINATION:
        clearedCount = cache.clearPagination()
        logger.log(`清空分页缓存 ${clearedCount} 条 - ${context || ''}`)
        break

      case CacheInvalidationStrategy.KEEP_ALL:
      default:
        logger.log(`保持缓存不变 - ${context || ''}`)
        break
    }
    cacheUpdateTrigger.value++
  }

  const fetchData = async (
    params?: Partial<TParams>,
    useCache = enableCache
  ): Promise<ApiResponse<TRecord>> => {
    if (abortController) {
      abortController.abort()
    }

    const currentController = new AbortController()
    abortController = currentController

    loadingState.value = 'loading'
    error.value = null

    try {
      let requestParams = Object.assign(
        {},
        searchParams,
        {
          [pageKey]: pagination.current,
          [sizeKey]: pagination.size
        },
        params || {}
      ) as TParams

      if (excludeParams.length > 0) {
        const filteredParams = { ...requestParams }
        excludeParams.forEach((key) => {
          delete (filteredParams as Record<string, unknown>)[key]
        })
        requestParams = filteredParams as TParams
      }

      if (useCache && cache) {
        const cachedItem = cache.get(requestParams)
        if (cachedItem) {
          data.value = cachedItem.data
          updatePaginationFromResponse(pagination, cachedItem.response)

          // 修复：避免重复设置相同的值，防止响应式循环更新
          const paramsRecord = searchParams as Record<string, unknown>
          if (paramsRecord[pageKey] !== pagination.current) {
            paramsRecord[pageKey] = pagination.current
          }
          if (paramsRecord[sizeKey] !== pagination.size) {
            paramsRecord[sizeKey] = pagination.size
          }

          loadingState.value = 'success'

          // 缓存命中时触发专门的回调，而不是 onSuccess
          if (onCacheHit) {
            onCacheHit(cachedItem.data, cachedItem.response)
          }

          logger.log(`缓存命中`)
          return cachedItem.response
        }
      }

      const response = await apiFn(requestParams)

      if (currentController.signal.aborted) {
        throw new Error('请求已取消')
      }

      const standardResponse = responseAdapter(response)

      let tableData = extractTableData(standardResponse)

      if (dataTransformer) {
        tableData = dataTransformer(tableData)
      }

      data.value = tableData
      updatePaginationFromResponse(pagination, standardResponse)

      // 修复：避免重复设置相同的值，防止响应式循环更新
      const paramsRecord = searchParams as Record<string, unknown>
      if (paramsRecord[pageKey] !== pagination.current) {
        paramsRecord[pageKey] = pagination.current
      }
      if (paramsRecord[sizeKey] !== pagination.size) {
        paramsRecord[sizeKey] = pagination.size
      }

      if (useCache && cache) {
        cache.set(requestParams, tableData, standardResponse)
        cacheUpdateTrigger.value++
        logger.log(`数据已缓存`)
      }

      loadingState.value = 'success'

      if (onSuccess) {
        onSuccess(tableData, standardResponse)
      }

      return standardResponse
    } catch (err) {
      if (err instanceof Error && err.message === '请求已取消') {
        loadingState.value = 'idle'
        return { records: [], total: 0, current: 1, size: 10 }
      }

      loadingState.value = 'error'
      data.value = []
      const tableError = handleError(err, '获取表格数据失败')
      throw tableError
    } finally {
      // 只有当前控制器是活跃的才清空
      if (abortController === currentController) {
        abortController = null
      }
    }
  }

  const getData = async (params?: Partial<TParams>): Promise<ApiResponse<TRecord> | void> => {
    try {
      return await fetchData(params)
    } catch {
      return Promise.resolve()
    }
  }

  const getDataByPage = async (params?: Partial<TParams>): Promise<ApiResponse<TRecord> | void> => {
    pagination.current = 1
    ;(searchParams as Record<string, unknown>)[pageKey] = 1

    // 搜索时清空当前搜索条件的缓存，确保获取最新数据
    clearCache(CacheInvalidationStrategy.CLEAR_CURRENT, '搜索数据')

    try {
      return await fetchData(params, false) // 搜索时不使用缓存
    } catch {
      return Promise.resolve()
    }
  }

  const debouncedGetDataByPage = createSmartDebounce(getDataByPage, debounceTime)

  const resetSearchParams = async (): Promise<void> => {
    debouncedGetDataByPage.cancel()

    const paramsRecord = searchParams as Record<string, unknown>
    const defaultPagination = {
      [pageKey]: 1,
      [sizeKey]: (paramsRecord[sizeKey] as number) || 10
    }

    Object.keys(searchParams).forEach((key) => {
      delete paramsRecord[key]
    })

    Object.assign(searchParams, apiParams || {}, defaultPagination)

    pagination.current = 1
    pagination.size = defaultPagination[sizeKey] as number

    error.value = null

    clearCache(CacheInvalidationStrategy.CLEAR_ALL, '重置搜索')

    await getData()

    if (resetFormCallback) {
      await nextTick()
      resetFormCallback()
    }
  }

  // 替换搜索参数：适用于表单查询，避免旧字段残留
  const replaceSearchParams = (params?: Partial<TParams>): void => {
    const paramsRecord = searchParams as Record<string, unknown>
    const currentSize = pagination.size || ((paramsRecord[sizeKey] as number) ?? 10)

    Object.keys(searchParams).forEach((key) => {
      if (key !== pageKey && key !== sizeKey) {
        delete paramsRecord[key]
      }
    })

    Object.assign(
      searchParams,
      {
        [pageKey]: 1,
        [sizeKey]: currentSize
      },
      params || {}
    )

    pagination.current = 1
    pagination.size = currentSize
  }

  let isCurrentChanging = false

  const handleSizeChange = async (newSize: number): Promise<void> => {
    if (newSize <= 0) return

    debouncedGetDataByPage.cancel()

    const paramsRecord = searchParams as Record<string, unknown>
    pagination.size = newSize
    pagination.current = 1
    paramsRecord[sizeKey] = newSize
    paramsRecord[pageKey] = 1

    clearCache(CacheInvalidationStrategy.CLEAR_CURRENT, '分页大小变化')

    await getData()
  }

  const handleCurrentChange = async (newCurrent: number): Promise<void> => {
    if (newCurrent <= 0) return

    // 修复：防止重复调用
    if (isCurrentChanging) {
      return
    }

    // 修复：如果当前页没有变化，不需要重新请求
    if (pagination.current === newCurrent) {
      logger.log('分页页码未变化，跳过请求')
      return
    }

    try {
      isCurrentChanging = true

      // 修复：只更新必要的状态
      const paramsRecord = searchParams as Record<string, unknown>
      pagination.current = newCurrent
      // 只有当 searchParams 的分页字段与新值不同时才更新
      if (paramsRecord[pageKey] !== newCurrent) {
        paramsRecord[pageKey] = newCurrent
      }

      await getData()
    } finally {
      isCurrentChanging = false
    }
  }


  const refreshCreate = async (): Promise<void> => {
    debouncedGetDataByPage.cancel()
    pagination.current = 1
    ;(searchParams as Record<string, unknown>)[pageKey] = 1
    clearCache(CacheInvalidationStrategy.CLEAR_PAGINATION, '新增数据')
    await getData()
  }

  const refreshUpdate = async (): Promise<void> => {
    clearCache(CacheInvalidationStrategy.CLEAR_CURRENT, '编辑数据')
    await getData()
  }

  const refreshRemove = async (): Promise<void> => {
    const { current } = pagination

    clearCache(CacheInvalidationStrategy.CLEAR_CURRENT, '删除数据')
    await getData()

    // 如果当前页为空且不是第一页，回到上一页
    if (data.value.length === 0 && current > 1) {
      pagination.current = current - 1
      ;(searchParams as Record<string, unknown>)[pageKey] = current - 1
      await getData()
    }
  }

  const refreshData = async (): Promise<void> => {
    debouncedGetDataByPage.cancel()
    clearCache(CacheInvalidationStrategy.CLEAR_ALL, '手动刷新')
    await getData()
  }

  const refreshSoft = async (): Promise<void> => {
    clearCache(CacheInvalidationStrategy.CLEAR_CURRENT, '软刷新')
    await getData()
  }

  const cancelRequest = (): void => {
    if (abortController) {
      abortController.abort()
    }
    debouncedGetDataByPage.cancel()
  }

  const clearData = (): void => {
    data.value = []
    error.value = null
    clearCache(CacheInvalidationStrategy.CLEAR_ALL, '清空数据')
  }

  const clearExpiredCache = (): number => {
    if (!cache) return 0
    const cleanedCount = cache.cleanupExpired()
    if (cleanedCount > 0) {
      cacheUpdateTrigger.value++
    }
    return cleanedCount
  }

  if (enableCache && cache) {
    cacheCleanupTimer = setInterval(() => {
      const cleanedCount = cache.cleanupExpired()
      if (cleanedCount > 0) {
        logger.log(`自动清理 ${cleanedCount} 条过期缓存`)
        cacheUpdateTrigger.value++
      }
    }, cacheTime / 2) // 每半个缓存周期清理一次
  }

  if (immediate) {
    onMounted(async () => {
      await getData()
    })
  }

  onUnmounted(() => {
    cancelRequest()
    if (cache) {
      cache.clear()
    }
    if (cacheCleanupTimer) {
      clearInterval(cacheCleanupTimer)
    }
  })

  return {
    /** 表格数据 */
    data,
    /** 数据加载状态 */
    loading: readonly(loading),
    /** 错误状态 */
    error: readonly(error),
    /** 数据是否为空 */
    isEmpty: computed(() => data.value.length === 0),
    /** 是否有数据 */
    hasData,

    /** 分页状态信息 */
    pagination: readonly(pagination),
    /** 移动端分页配置 */
    paginationMobile: mobilePagination,
    /** 页面大小变化处理 */
    handleSizeChange,
    /** 当前页变化处理 */
    handleCurrentChange,

    /** 搜索参数 */
    searchParams,
    /** 替换搜索参数（适用于表单查询，避免旧字段残留） */
    replaceSearchParams,
    /** 重置搜索参数 */
    resetSearchParams,

    /** 加载数据 */
    fetchData: getData,
    /** 获取数据 */
    getData: getDataByPage,
    /** 获取数据（防抖） */
    getDataDebounced: debouncedGetDataByPage,
    /** 清空数据 */
    clearData,

    /** 全量刷新：清空所有缓存，重新获取数据（适用于手动刷新按钮） */
    refreshData,
    /** 轻量刷新：仅清空当前搜索条件的缓存，保持分页状态（适用于定时刷新） */
    refreshSoft,
    /** 新增后刷新：回到第一页并清空分页缓存（适用于新增数据后） */
    refreshCreate,
    /** 更新后刷新：保持当前页，仅清空当前搜索缓存（适用于更新数据后） */
    refreshUpdate,
    /** 删除后刷新：智能处理页码，避免空页面（适用于删除数据后） */
    refreshRemove,

    /** 缓存统计信息 */
    cacheInfo,
    /** 清除缓存，根据不同的业务场景选择性地清理缓存： */
    clearCache,
    /** 清理已过期的缓存条目，释放内存空间 */
    clearExpiredCache,

    /** 取消当前请求 */
    cancelRequest,

    ...(columnConfig && {
      /** 表格列配置 */
      columns,
      /** 列显示控制 */
      columnChecks,
      /** 新增列 */
      addColumn: columnConfig.addColumn,
      /** 删除列 */
      removeColumn: columnConfig.removeColumn,
      /** 切换列显示状态 */
      toggleColumn: columnConfig.toggleColumn,
      /** 更新列配置 */
      updateColumn: columnConfig.updateColumn,
      /** 批量更新列配置 */
      batchUpdateColumns: columnConfig.batchUpdateColumns,
      /** 重新排序列 */
      reorderColumns: columnConfig.reorderColumns,
      /** 获取指定列配置 */
      getColumnConfig: columnConfig.getColumnConfig,
      /** 获取所有列配置 */
      getAllColumns: columnConfig.getAllColumns,
      /** 重置所有列配置到默认状态 */
      resetColumns: columnConfig.resetColumns
    })
  }
}

export { CacheInvalidationStrategy } from '@art/app-utils'
export type { ApiResponse, CacheItem } from '@art/app-utils'
export type { BaseRequestParams, TableError } from '@art/app-utils'
