import WebSocketClient from './client'
import { mittBus } from '@art/app-utils'
import { useUserStore } from '../../store/modules/user'

/** 全局数据刷新事件的 payload（mittBus 'global-data-refresh' 事件） */
export interface GlobalDataRefreshPayload {
  /** 目标资源标识（如 system_user / system_role） */
  target: string
  /** 附加数据（变更内容等，后端可选下发） */
  [key: string]: unknown
}

/** 协议消息（后端下发） */
interface ProtocolMessage {
  type: string
  target?: string
  [key: string]: unknown
}

/**
 * 计算 WebSocket 端点（含鉴权 token 查询参数）
 *
 * 端点来源：import.meta.env.VITE_WS_URL（显式配置）。
 * 未配置时直接返回空串，绝不根据当前页面域名推导 /ws；
 * 避免生产环境向不存在的同源端点发起连接并产生大量 404/重连日志。
 * token 以查询参数携带（浏览器 WebSocket 无法自定义 Header，这是常规做法）。
 *
 * @returns 完整 WS URL；无法解析时返回空字符串（调用方据此跳过建连）
 */
function resolveWebSocketUrl(): string {
  const token = useUserStore().accessToken
  const endpoint = (import.meta.env.VITE_WS_URL as string | undefined)?.trim() || ''
  if (!endpoint) return ''

  const sep = endpoint.includes('?') ? '&' : '?'
  return endpoint + sep + 'token=' + encodeURIComponent(token)
}

/** 未配置 WS 端点的提示只打印一次，避免路由守卫反复调用刷屏 */
let skipLogPrinted = false

/**
 * 初始化全局 WebSocket（登录成功 / F5 刷新后调用）
 *
 * 幂等：重复调用仅更新处理器；URL（token）变化时重连。
 * 未登录（无 token）或端点不可解析时安全跳过，不阻塞启动。
 */
export function initSocket(): void {
  const token = useUserStore().accessToken
  if (!token) {
    console.info('[WebSocket] 未登录（无 token），跳过实时同步连接')
    return
  }
  const url = resolveWebSocketUrl()
  if (!url) {
    if (!skipLogPrinted) {
      console.info('[WebSocket] 未配置 VITE_WS_URL，多端实时同步未启用')
      skipLogPrinted = true
    }
    return
  }
  const client = WebSocketClient.getInstance({
    url,
    messageHandler: (event: MessageEvent) => handleSocketMessage(event)
  })
  // 路由守卫每次放行都会调用本函数：已有连接或等待重连则跳过，避免重复建连与日志噪音
  if (!client.isWebSocketActive) {
    client.init()
  }
}

// closeSocket 由 ./client 导出（纯单例操作，无 store 依赖），此处再导出供装配面消费
export { closeSocket } from './client'

/**
 * 处理 WebSocket 消息：DATA_UPDATE 经 mittBus 抛全局刷新事件
 *
 * 非 JSON / 非 DATA_UPDATE 消息仅记录日志，避免误触发刷新。
 */
function handleSocketMessage(event: MessageEvent): void {
  let message: ProtocolMessage
  try {
    message = JSON.parse(event.data as string)
  } catch {
    console.warn('[WebSocket] 收到非 JSON 消息，已忽略:', event.data)
    return
  }

  if (message.type === 'DATA_UPDATE') {
    const payload: GlobalDataRefreshPayload = {
      target: message.target ?? '',
      ...message
    }
    // 全局事件：业务页面监听 'global-data-refresh' 后按 target 刷新
    mittBus.emit('global-data-refresh', payload)
  } else if (import.meta.env.DEV && message.type !== 'PING' && message.type !== 'PONG') {
    // 开发环境提示未知消息类型；生产环境保持静默，避免第三方握手消息刷屏
    console.log('[WebSocket] 未知消息类型:', message.type)
  }
}
