import { defineConfig, type ConfigEnv, type UserConfig } from 'vite'
import { federation } from 'vite-plugin-federation'
import { createBaseConfig, loadAppEnv } from './base.ts'
import { mfSharedConfig } from './federation.ts'

export interface RemoteConfigOptions {
  /** 子应用部署基础路径 */
  base?: string
  /** Module Federation 应用名（默认 app-system，兼容现有模板） */
  name?: string
}

export function createRemoteConfig(options: RemoteConfigOptions = {}) {
  return defineConfig(({ mode }: ConfigEnv): UserConfig => {
    const isDev = mode === 'development'
    const env = loadAppEnv(mode)
    const basePath = options.base || '/'
    const remoteName = options.name?.trim() || 'app-system'
    // 子应用资源必须从自身域名根路径解析；主机地址不能参与 publicPath 计算。
    const remotePublicPath =
      env.VITE_REMOTE_PUBLIC_PATH?.trim() ||
      (isDev ? undefined : 'https://app-system.qxiangkj.cn/')
    const base = createBaseConfig({
      mode,
      kind: 'remote',
      env: { ...env, VITE_BASE_URL: basePath }
    })

    return {
      ...base,
      // 强制子应用以根路径部署，确保 manifest/remoteEntry 的资产路径为 /assets/*
      base: basePath,
      plugins: [
        ...(base.plugins || []),
        // Module Federation（v2 C2）
        federation({
          name: remoteName,
          exposes: {
            './routes': './src/routes.ts'
            // 阶段二：视图级按需暴露（'./views/system/user': './src/views/system/user/index.vue'）
          },
          shared: mfSharedConfig,
          // 生产环境写入子应用自身的绝对 publicPath，避免 remoteEntry 被宿主域名解析。
          ...(remotePublicPath ? { publicPath: remotePublicPath } : {}),
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
