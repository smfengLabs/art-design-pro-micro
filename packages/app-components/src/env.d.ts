/// <reference types="vite/client" />
/// <reference path="../../app-core/src/types/directive.d.ts" />

declare module 'crypto-js'

// 构建期注入（@art/app-config 的 define，读取仓库根 VERSION 文件）
declare const __APP_VERSION__: string
