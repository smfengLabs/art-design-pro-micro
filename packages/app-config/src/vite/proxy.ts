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
