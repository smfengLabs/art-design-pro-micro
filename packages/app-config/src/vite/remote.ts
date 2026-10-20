/**
 * Remote（app-system）Vite 配置工厂
 *
 * v2 C2：exposes './routes'（默认导出路由清单）；dev 开启 remoteHmr 供 host 接 HMR。
 *
 * @module app-config/vite/remote
 */
import { defineConfig, type ConfigEnv, type UserConfig } from 'vite'
import { federation } from 'vite-plugin-federation'
import { createBaseConfig } from './base.ts'
import { mfSharedConfig } from './federation.ts'

export function createRemoteConfig() {
  return defineConfig(({ mode }: ConfigEnv): UserConfig => {
    const base = createBaseConfig({ mode, kind: 'remote' })

    return {
      ...base,
      plugins: [
        ...(base.plugins || []),
        // Module Federation（v2 C2）
        federation({
          name: 'app-system',
          exposes: {
            './routes': './src/routes.ts'
            // 阶段二：视图级按需暴露（'./views/system/user': './src/views/system/user/index.vue'）
          },
          shared: mfSharedConfig,
          // v2 偏差登记：与宿主一致采用 loaded-first（见 vite/main.ts 同项注释）
          shareStrategy: 'loaded-first',
          manifest: true,
          // 类型经 workspace（tsconfig paths + 源码直连）流转，不启用 MF DTS 拉包
          dts: false,
          dev: { remoteHmr: true }
        })
      ]
    }
  })
}
