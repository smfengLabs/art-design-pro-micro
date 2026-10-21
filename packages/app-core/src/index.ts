/// <reference types="pinia-plugin-persistedstate" />

// 公共入口；remote 可依赖，但不得触达 bootstrap / router guards / store create
export * from './router/runtime'
export * from './router/preload'

export * from './router/core'

export * from './store'

export { default as i18n, $t, languageOptions } from './locales'

export * from './hooks'

export * from './utils/router'
export * from './utils/navigation'
export * from './utils/storage'
export * from './utils/ui'
export { initSocket, closeSocket } from './utils/socket'
export type { GlobalDataRefreshPayload } from './utils/socket'
export { mittBus } from '@art/app-utils'

export { default as AppConfig } from './config'
export * from './config/setting'
export * from './config/assets/images'
export * from './config/modules/headerBar'