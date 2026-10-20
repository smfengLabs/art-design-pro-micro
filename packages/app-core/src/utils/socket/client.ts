export interface WebSocketClientOptions {
  /** WebSocket 端点（须由调用方传入；缺省/空时 init() 安全跳过） */
  url?: string
  /** 原始消息回调（JSON 解析由调用方负责） */
  messageHandler: (event: MessageEvent) => void
  /** 重连基础间隔（ms，指数退避基准） */
  reconnectInterval?: number
  /** 心跳检测间隔（ms） */
  heartbeatInterval?: number
  /** 发送 ping 间隔（ms） */
  pingInterval?: number
  /** 重连等待超时（ms） */
  reconnectTimeout?: number
  /** 最大重连次数 */
  maxReconnectAttempts?: number
  /** 连接建立超时（ms） */
  connectionTimeout?: number
}

export default class WebSocketClient {
  private static instance: WebSocketClient | null = null
  private ws: WebSocket | null = null
  private url: string
  private messageHandler: (event: MessageEvent) => void
  private reconnectInterval: number
  private heartbeatInterval: number
  private pingInterval: number
  private reconnectTimeout: number
  private maxReconnectAttempts: number
  private connectionTimeout: number
  private reconnectAttempts: number = 0

  // 消息队列 - 缓存连接建立前的消息
  private messageQueue: Array<string | ArrayBufferLike | Blob | ArrayBufferView> = []

  // 定时器（浏览器环境为 number；类型放宽兼容 Node）
  private detectionTimer: ReturnType<typeof setTimeout> | null = null
  private timeoutTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private pingTimer: ReturnType<typeof setInterval> | null = null
  private connectionTimer: ReturnType<typeof setTimeout> | null = null

  // 状态标识
  private isConnected: boolean = false
  private isConnecting: boolean = false
  private stopReconnect: boolean = false
  private isReconnecting: boolean = false

  private constructor(options: WebSocketClientOptions) {
    this.url = options.url || ''
    this.messageHandler = options.messageHandler
    this.reconnectInterval = options.reconnectInterval ?? 20 * 1000
    this.heartbeatInterval = options.heartbeatInterval ?? 5 * 1000
    this.pingInterval = options.pingInterval ?? 30 * 1000
    this.reconnectTimeout = options.reconnectTimeout ?? 30 * 1000
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 10
    this.connectionTimeout = options.connectionTimeout ?? 10 * 1000
  }

  /** 单例获取（存在时更新消息处理器与 URL；URL 变化则重置重连计数并重新连接） */
  static getInstance(options: WebSocketClientOptions): WebSocketClient {
    if (!WebSocketClient.instance) {
      WebSocketClient.instance = new WebSocketClient(options)
    } else {
      WebSocketClient.instance.messageHandler = options.messageHandler
      if (options.url && WebSocketClient.instance.url !== options.url) {
        WebSocketClient.instance.url = options.url
        WebSocketClient.instance.reconnectAttempts = 0
        WebSocketClient.instance.isReconnecting = false
        WebSocketClient.instance.stopReconnect = false
        // token（查询参数）变化：关闭旧连接后按新 URL 重新建连
        WebSocketClient.instance.closeCurrentSocketForReconnect()
        WebSocketClient.instance.init()
      }
    }
    return WebSocketClient.instance
  }

  /** 初始化连接（URL 未配置时安全跳过，不发连接、不抛错） */
  init(): void {
    const configuredUrl = (import.meta.env.VITE_WS_URL as string | undefined)?.trim()
    // 生产环境绝不根据页面域名推导 WebSocket 地址；未显式配置时直接禁用实时同步。
    if (import.meta.env.PROD && !configuredUrl) {
      console.info('[WebSocket] 生产环境未配置 VITE_WS_URL，跳过实时同步连接')
      return
    }
    if (!this.url) {
      console.info('[WebSocket] URL 未配置，跳过实时同步连接（多端数据同步不启用）')
      return
    }
    this.connect(true)
  }

  private connect(resetReconnectAttempts: boolean = false): void {
    if (this.isConnecting) {
      console.log('[WebSocket] 正在建立连接中，跳过重复连接')
      return
    }
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.warn('[WebSocket] 连接已存在')
      this.flushMessageQueue()
      return
    }

    try {
      this.isConnecting = true
      this.stopReconnect = false
      if (resetReconnectAttempts) {
        this.reconnectAttempts = 0
        this.isReconnecting = false
        this.clearTimer('reconnectTimer')
      }
      this.ws = new WebSocket(this.url)

      this.clearTimer('connectionTimer')
      this.connectionTimer = setTimeout(() => {
        console.error(`[WebSocket] 连接超时 (${this.connectionTimeout}ms)：${this.url}`)
        this.handleConnectionTimeout()
      }, this.connectionTimeout)

      this.ws.onopen = (event) => this.handleOpen(event)
      this.ws.onmessage = (event) => this.handleMessage(event)
      this.ws.onclose = (event) => this.handleClose(event)
      this.ws.onerror = (event) => this.handleError(event)
    } catch (error) {
      console.error('[WebSocket] 初始化失败:', error)
      this.isConnecting = false
      this.reconnect()
    }
  }

  private handleConnectionTimeout(): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      console.error('[WebSocket] 连接超时，强制关闭连接')
      this.ws?.close(1000, 'Connection timeout')
      this.isConnecting = false
      this.reconnect()
    }
  }

  /** 关闭连接 */
  close(force?: boolean): void {
    this.clearAllTimers()
    this.stopReconnect = true
    this.isReconnecting = false
    this.isConnecting = false

    if (this.ws) {
      this.ws.close(force ? 1001 : 1000, force ? 'Force closed' : 'Normal close')
      this.ws = null
    }
    this.isConnected = false
  }

  /** 发送消息（未连接时进入队列等待，可设 immediate 强制立即） */
  send(data: string | ArrayBufferLike | Blob | ArrayBufferView, immediate: boolean = false): void {
    if (immediate && (!this.ws || this.ws.readyState !== WebSocket.OPEN)) {
      console.error('[WebSocket] 未连接，无法立即发送消息')
      return
    }
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.log('[WebSocket] 未连接，消息已加入队列等待发送')
      this.messageQueue.push(data)
      if (!this.isConnecting && !this.stopReconnect && this.url) {
        this.init()
      }
      return
    }
    try {
      this.ws.send(data)
    } catch (error) {
      console.error('[WebSocket] 发送消息失败:', error)
      this.messageQueue.push(data)
      this.reconnect()
    }
  }

  private flushMessageQueue(): void {
    if (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      console.log(`[WebSocket] 发送队列中 ${this.messageQueue.length} 条消息`)
      while (this.messageQueue.length > 0) {
        const data = this.messageQueue.shift()
        if (data) {
          try {
            this.ws?.send(data)
          } catch (error) {
            console.error('[WebSocket] 发送队列消息失败:', error)
            this.messageQueue.unshift(data)
            break
          }
        }
      }
    }
  }

  private handleOpen(event: Event): void {
    console.log('[WebSocket] 连接成功', event)
    this.clearTimer('connectionTimer')
    this.isConnected = true
    this.isConnecting = false
    this.isReconnecting = false
    this.stopReconnect = false
    this.reconnectAttempts = 0
    this.startHeartbeat()
    this.startPing()
    this.flushMessageQueue()
  }

  private handleMessage(event: MessageEvent): void {
    this.resetHeartbeat()
    this.messageHandler(event)
  }

  private handleClose(event: CloseEvent): void {
    console.log(`[WebSocket] 断开: 代码=${event.code}, 原因=${event.reason}, 干净关闭=${event.wasClean}`)
    const isNormalClose = event.code === 1000

    this.isConnected = false
    this.isConnecting = false
    this.clearConnectionTimers()
    this.ws = null

    if (!this.stopReconnect && !isNormalClose) {
      this.reconnect()
    }
  }

  private handleError(event: Event): void {
    console.error('[WebSocket] 连接错误:', event)
    console.error(
      '[WebSocket] 当前连接状态:',
      this.ws?.readyState ? this.getReadyStateText(this.ws.readyState) : '未初始化'
    )
    this.isConnected = false
    this.isConnecting = false
    if (!this.stopReconnect) {
      this.reconnect()
    }
  }

  private closeCurrentSocketForReconnect(): void {
    this.clearConnectionTimers()
    this.isConnected = false
    this.isConnecting = false

    if (this.ws) {
      this.ws.onopen = null
      this.ws.onmessage = null
      this.ws.onclose = null
      this.ws.onerror = null
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close(1001, 'Reconnect')
      }
      this.ws = null
    }
  }

  private getReadyStateText(state: number): string {
    switch (state) {
      case WebSocket.CONNECTING:
        return 'CONNECTING (0) - 正在连接'
      case WebSocket.OPEN:
        return 'OPEN (1) - 已连接'
      case WebSocket.CLOSING:
        return 'CLOSING (2) - 正在关闭'
      case WebSocket.CLOSED:
        return 'CLOSED (3) - 已关闭'
      default:
        return `未知状态 (${state})`
    }
  }

  private startHeartbeat(): void {
    this.clearTimer('detectionTimer')
    this.clearTimer('timeoutTimer')
    this.detectionTimer = setTimeout(() => {
      this.isConnected = this.ws?.readyState === WebSocket.OPEN
      if (!this.isConnected) {
        console.warn('[WebSocket] 心跳检测失败，尝试重连')
        this.reconnect()
        this.timeoutTimer = setTimeout(() => {
          console.warn('[WebSocket] 重连超时')
          this.close()
        }, this.reconnectTimeout)
      }
    }, this.heartbeatInterval)
  }

  private resetHeartbeat(): void {
    this.clearTimer('detectionTimer')
    this.clearTimer('timeoutTimer')
    this.startHeartbeat()
  }

  private startPing(): void {
    this.clearTimer('pingTimer')
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState !== WebSocket.OPEN) {
        console.warn('[WebSocket] 未连接，停止发送 ping')
        this.clearTimer('pingTimer')
        this.reconnect()
        return
      }
      try {
        this.ws.send('ping')
      } catch (error) {
        console.error('[WebSocket] 发送 ping 失败:', error)
        this.clearTimer('pingTimer')
        this.reconnect()
      }
    }, this.pingInterval)
  }

  private reconnect(): void {
    if (this.stopReconnect || this.isConnecting || this.reconnectInterval <= 0) {
      return
    }
    if (!this.url) {
      this.stopReconnect = true
      return
    }
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`[WebSocket] 已达到最大重连次数 (${this.maxReconnectAttempts})，停止重连`)
      this.close(true)
      return
    }
    this.reconnectAttempts++
    this.isReconnecting = true
    this.closeCurrentSocketForReconnect()

    const delay = this.calculateReconnectDelay()
    console.log(`[WebSocket] 将在 ${delay / 1000}s 后重新连接（第 ${this.reconnectAttempts}/${this.maxReconnectAttempts} 次）`)

    this.clearTimer('reconnectTimer')
    this.reconnectTimer = setTimeout(() => {
      this.connect(false)
    }, delay)
  }

  private calculateReconnectDelay(): number {
    const jitter = Math.random() * 1000
    const baseDelay = Math.min(
      this.reconnectInterval * Math.pow(1.5, this.reconnectAttempts - 1),
      this.reconnectInterval * 5
    )
    return baseDelay + jitter
  }

  private clearTimer(
    timerName: 'detectionTimer' | 'timeoutTimer' | 'reconnectTimer' | 'pingTimer' | 'connectionTimer'
  ): void {
    const timer = this[timerName]
    if (timer) {
      clearTimeout(timer as ReturnType<typeof setTimeout>)
      if (timerName === 'pingTimer') {
        clearInterval(timer as ReturnType<typeof setInterval>)
      }
      this[timerName] = null
    }
  }

  private clearAllTimers(): void {
    this.clearConnectionTimers()
    this.clearTimer('reconnectTimer')
  }

  private clearConnectionTimers(): void {
    this.clearTimer('detectionTimer')
    this.clearTimer('timeoutTimer')
    this.clearTimer('pingTimer')
    this.clearTimer('connectionTimer')
  }

  /** 当前连接状态 */
  get isWebSocketConnected(): boolean {
    return this.isConnected
  }

  /** 是否已有活跃连接（已连接/连接中/等待重连），用于幂等初始化 */
  get isWebSocketActive(): boolean {
    return this.isConnected || this.isConnecting || this.isReconnecting
  }

  /** 连接状态文本 */
  get connectionStatusText(): string {
    if (this.isConnecting) return '正在连接'
    if (this.isConnected) return '已连接'
    if (this.isReconnecting && this.reconnectAttempts > 0) {
      return `重连中（${this.reconnectAttempts}/${this.maxReconnectAttempts}）`
    }
    return '已断开'
  }

  /** 销毁实例（关闭连接并清除单例；登出场景调用） */
  static destroyInstance(): void {
    if (WebSocketClient.instance) {
      WebSocketClient.instance.close()
      WebSocketClient.instance = null
    }
  }
}

/**
 * 关闭并销毁全局 WebSocket 单例（纯单例操作，不依赖任何 store；
 * 供 user store 登出链路调用，避免经 socket/index.ts 形成循环依赖）
 */
export function closeSocket(): void {
  WebSocketClient.destroyInstance()
}
