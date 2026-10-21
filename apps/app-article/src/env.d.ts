/// <reference types="vite/client" />

// 运行时依赖类型补丁（无内置 d.ts）：由本应用及其引用的 workspace 源码共同消费
declare module 'crypto-js'

// 全局变量声明
declare const __APP_VERSION__: string
declare const __MF_REMOTE_REGISTRY__: Array<{ alias: string; manifestUrl: string; moduleId?: string }>
/// <reference path="../../../packages/app-core/src/types/directive.d.ts" />
