import {
  connectRuntimeRemoteHmr,
  refreshRemote,
  registerManifestRemote
} from 'vite-plugin-federation/runtime'
import { resetRouterState } from '@art/app-core/bootstrap'

export interface DynamicRemote {
  alias: string
  manifestUrl: string
}

export function initRemoteHmr(dynamicRemotes: DynamicRemote[]) {
  if (!import.meta.env.DEV || dynamicRemotes.length === 0) return

  const closers: Array<() => void> = []

  for (const { alias, manifestUrl } of dynamicRemotes) {
    // 1) 注册（幂等）；2) 连接 → 3) 事件驱动
    registerManifestRemote(alias, manifestUrl)

    const hmr = connectRuntimeRemoteHmr(alias, manifestUrl)
    closers.push(() => hmr.close())

    window.addEventListener('vite-plugin-federation:remote-expose-update', ((e: any) => {
      const expose: string = e?.detail?.expose ?? ''
      refreshRemote(alias, { invalidateManifest: true })
      // 若 routes 的 expose 需要重新装配补齐（D2 第 2 条）
      if (expose === './routes') resetRouterState(0)
    }) as EventListener)
  }

  if (import.meta.hot) import.meta.hot.dispose(() => closers.forEach((c) => c()))
}
