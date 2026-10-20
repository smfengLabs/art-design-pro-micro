import AppConfig from './index'
import { SystemThemeEnum, MenuThemeEnum, MenuTypeEnum, ContainerWidthEnum } from '@art/app-utils'

// 修改默认值时同步 SettingActions 与 store/modules/setting.ts
export const SETTING_DEFAULT_CONFIG = {
  menuType: MenuTypeEnum.LEFT,
  menuOpenWidth: 230,
  menuOpen: true,
  dualMenuShowText: false,
  systemThemeType: SystemThemeEnum.AUTO,
  systemThemeMode: SystemThemeEnum.AUTO,
  menuThemeType: MenuThemeEnum.DESIGN,
  systemThemeColor: AppConfig.systemMainColor[0],
  showMenuButton: true,
  showFastEnter: true,
  showRefreshButton: true,
  showCrumbs: true,
  showWorkTab: true,
  showLanguage: true,
  showNprogress: false,
  showSettingGuide: true,
  showFestivalText: false,
  watermarkVisible: false,
  autoClose: false,
  uniqueOpened: true,
  colorWeak: false,
  refresh: false,
  holidayFireworksLoaded: false,
  boxBorderMode: true,
  pageTransition: 'slide-left',
  tabStyle: 'tab-default',
  customRadius: '0.75',
  containerWidth: ContainerWidthEnum.FULL,
  festivalDate: ''
}

/**
 * 获取设置默认值
 * @returns 设置默认值对象
 */
export function getSettingDefaults() {
  return { ...SETTING_DEFAULT_CONFIG }
}

/**
 * 重置为默认设置
 * @param currentSettings 当前设置对象
 */
export function resetToDefaults(currentSettings: Record<string, any>) {
  const defaults = getSettingDefaults()
  Object.keys(defaults).forEach((key) => {
    if (key in currentSettings) {
      currentSettings[key] = defaults[key as keyof typeof defaults]
    }
  })
}
