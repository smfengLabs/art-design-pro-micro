import mitt, { type Emitter } from 'mitt'

type Events = {
  // 烟花效果事件 - 可选的图片URL参数
  triggerFireworks: string | undefined
  openSetting: void
  openSearchDialog: void
  openChat: void
  openLockScreen: void
  // 全局数据实时刷新（多端同步）：payload 携带 target 资源标识（如 system_user）
  'global-data-refresh': { target: string; [key: string]: unknown }
}

const mittBus: Emitter<Events> = mitt<Events>()

export default mittBus