import type { ApiResponse } from './tableCache'
import { tableConfig } from './tableConfig'

// 请求参数基础接口，扩展分页参数
export interface BaseRequestParams extends Api.Common.PaginationParams {
  [key: string]: unknown
}

// 错误处理接口
export interface TableError {
  code: string
  message: string
  details?: unknown
}

// 辅助函数：从对象中提取记录数组
function extractRecords<T>(obj: Record<string, unknown>, fields: string[]): T[] {
  for (const field of fields) {
    if (field in obj && Array.isArray(obj[field])) {
      return obj[field] as T[]
    }
  }
  return []
}

// 辅助函数：从对象中提取总数
function extractTotal(obj: Record<string, unknown>, records: unknown[], fields: string[]): number {
  for (const field of fields) {
    if (field in obj && typeof obj[field] === 'number') {
      return obj[field] as number
    }
  }
  return records.length
}

// 辅助函数：提取分页参数
function extractPagination(
  obj: Record<string, unknown>,
  data?: Record<string, unknown>
): Pick<ApiResponse<unknown>, 'current' | 'size'> | undefined {
  const result: Partial<Pick<ApiResponse<unknown>, 'current' | 'size'>> = {}
  const sources = [obj, data ?? {}]

  const currentFields = tableConfig.currentFields
  for (const src of sources) {
    for (const field of currentFields) {
      if (field in src && typeof src[field] === 'number') {
        result.current = src[field] as number
        break
      }
    }
    if (result.current !== undefined) break
  }

  const sizeFields = tableConfig.sizeFields
  for (const src of sources) {
    for (const field of sizeFields) {
      if (field in src && typeof src[field] === 'number') {
        result.size = src[field] as number
        break
      }
    }
    if (result.size !== undefined) break
  }

  if (result.current === undefined && result.size === undefined) return undefined
  return result
}

/**
 * 默认响应适配器 - 支持多种常见的API响应格式
 */
export const defaultResponseAdapter = <T>(response: unknown): ApiResponse<T> => {
  const recordFields = tableConfig.recordFields

  if (!response) {
    return { records: [], total: 0 }
  }

  if (Array.isArray(response)) {
    return { records: response, total: response.length }
  }

  if (typeof response !== 'object') {
    console.warn(
      '[tableUtils] 无法识别的响应格式，支持的格式包括: 数组、包含' +
        recordFields.join('/') +
        '字段的对象、嵌套data对象。当前格式:',
      response
    )
    return { records: [], total: 0 }
  }

  const res = response as Record<string, unknown>
  let records: T[] = []
  let total = 0
  let pagination: Pick<ApiResponse<unknown>, 'current' | 'size'> | undefined

  records = extractRecords(res, recordFields)
  total = extractTotal(res, records, tableConfig.totalFields)
  pagination = extractPagination(res)

  // 如果没有找到，检查嵌套data
  if (records.length === 0 && 'data' in res && typeof res.data === 'object') {
    const data = res.data as Record<string, unknown>
    records = extractRecords(data, ['list', 'records', 'items'])
    total = extractTotal(data, records, tableConfig.totalFields)
    pagination = extractPagination(res, data)

    if (Array.isArray(res.data)) {
      records = res.data as T[]
      total = records.length
    }
  }

  if (!recordFields.some((field) => field in res) && records.length === 0) {
    console.warn('[tableUtils] 无法识别的响应格式')
    console.warn('支持的字段包括: ' + recordFields.join('、'), response)
    console.warn('扩展字段请到 utils/table/tableConfig 文件配置')
  }

  const result: ApiResponse<T> = { records, total }
  if (pagination) {
    Object.assign(result, pagination)
  }
  return result
}

/**
 * 从标准化的API响应中提取表格数据
 */
export const extractTableData = <T>(response: ApiResponse<T>): T[] => {
  const data = response.records || response.data || []
  return Array.isArray(data) ? data : []
}

/**
 * 根据API响应更新分页信息
 */
export const updatePaginationFromResponse = <T>(
  pagination: Api.Common.PaginationParams,
  response: ApiResponse<T>
): void => {
  pagination.total = response.total ?? pagination.total ?? 0

  if (response.current !== undefined) {
    pagination.current = response.current
  }

  const maxPage = Math.max(1, Math.ceil(pagination.total / (pagination.size || 1)))
  if (pagination.current > maxPage) {
    pagination.current = maxPage
  }
}

export const createSmartDebounce = <T extends (...args: any[]) => Promise<any>>(
  fn: T,
  delay: number
): T & { cancel: () => void; flush: () => Promise<any> } => {
  let pending: {
    timer: ReturnType<typeof setTimeout>
    args: Parameters<T>
    resolve: (value: any) => void
    reject: (reason: any) => void
  } | null = null

  const clearPending = () => {
    if (!pending) return
    clearTimeout(pending.timer)
    pending = null
  }

  const debouncedFn = (...args: Parameters<T>): Promise<any> => {
    clearPending()
    return new Promise((resolve, reject) => {
      pending = {
        timer: setTimeout(() => {
          const current = pending
          clearPending()
          if (current) fn(...current.args).then(current.resolve, current.reject)
        }, delay),
        args,
        resolve,
        reject
      }
    })
  }

  debouncedFn.cancel = clearPending

  debouncedFn.flush = async () => {
    if (!pending) return
    const { timer, args, resolve, reject } = pending
    clearPending()
    try {
      const result = await fn(...args)
      resolve(result)
      return result
    } catch (error) {
      reject(error)
      throw error
    }
  }

  return debouncedFn as any
}

export const createErrorHandler = (
  onError?: (error: TableError) => void,
  enableLog: boolean = false
) => {
  const logger = {
    error: (message: string, ...args: any[]) => {
      if (enableLog) console.error(`[useTable] ${message}`, ...args)
    }
  }

  return (err: unknown, context: string): TableError => {
    const tableError: TableError = {
      code: 'UNKNOWN_ERROR',
      message: '未知错误',
      details: err
    }

    if (err instanceof Error) {
      tableError.message = err.message
      tableError.code = err.name
    } else if (typeof err === 'string') {
      tableError.message = err
    }

    logger.error(`${context}:`, err)
    onError?.(tableError)
    return tableError
  }
}
