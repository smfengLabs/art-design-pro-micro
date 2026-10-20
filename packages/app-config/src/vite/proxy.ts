/**
 * 开发代理工厂
 *
 * 对齐 origin：VITE_API_PROXY_URL 存在时启用 '/api' 转发（解决跨域）。
 *
 * @module app-config/vite/proxy
 */
import type { ProxyOptions } from 'vite'

export function createProxy(
  env: Record<string, string>
): Record<string, string | ProxyOptions> | undefined {
  if (!env.VITE_API_PROXY_URL) return undefined

  return {
    '/api': {
      target: env.VITE_API_PROXY_URL,
      changeOrigin: true
    }
  }
}
