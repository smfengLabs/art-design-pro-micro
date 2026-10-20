import { defineConfig, type ConfigEnv, type UserConfig } from 'vite'
import vueDevTools from 'vite-plugin-vue-devtools'
import { federation } from 'vite-plugin-federation'
import { createBaseConfig, loadAppEnv } from './base.ts'
import { mfSharedConfig } from './federation.ts'
import { createRemotes } from './remotes.ts'

export function createMainConfig() {
  return defineConfig(({ mode }: ConfigEnv): UserConfig => {
    const isDev = mode === 'development'
    const env = loadAppEnv(mode)
    const base = createBaseConfig({ mode, kind: 'main', env })

    return {
      ...base,
      plugins: [
        ...(base.plugins || []),
        // v2 偏差 D2-15：vite-plugin-vue-devtools 会干扰宿主端 Vue HMR（模块更新到达却
        // 不应用）；默认关闭，需要 DevTools 面板时以 VITE_VUE_DEVTOOLS=1 启动 dev。
        ...(process.env.VITE_VUE_DEVTOOLS === '1' ? [vueDevTools()] : []),
        // Module Federation（v2 C1）
        federation({
          name: 'app-main',
          remotes: createRemotes(isDev, env),
          shared: mfSharedConfig,
          // v2 偏差登记：插件默认 version-first 会在宿主 initializeSharing 时对全部
          // remotes 执行 initRemoteModule（MF 核心主动预热），导致 boot 期拉取远端
          // entry 并执行远端整图（双运行时）。loaded-first 下共享解析优先已加载
          // provider（宿主），remotes 惰性加载（登录后经 loadRemoteFromManifest）。
          shareStrategy: 'loaded-first',
          manifest: true,
          // 类型经 workspace（tsconfig paths + 源码直连）流转，不启用 MF DTS 拉包
          dts: false,
          dev: { devtools: true }
        })
      ]
    }
  })
}
