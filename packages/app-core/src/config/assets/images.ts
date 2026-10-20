import lightTheme from './images/settings/theme_styles/light.png'
import darkTheme from './images/settings/theme_styles/dark.png'
import systemTheme from './images/settings/theme_styles/system.png'
import verticalLayout from './images/settings/menu_layouts/vertical.png'
import horizontalLayout from './images/settings/menu_layouts/horizontal.png'
import mixedLayout from './images/settings/menu_layouts/mixed.png'
import dualColumnLayout from './images/settings/menu_layouts/dual_column.png'
import designStyle from './images/settings/menu_styles/design.png'
import darkStyle from './images/settings/menu_styles/dark.png'
import lightStyle from './images/settings/menu_styles/light.png'

/**
 * 配置中心图片资源对象
 */
export const configImages = {
  /** 系统主题预览图 */
  themeStyles: {
    /** 亮色主题 */
    light: lightTheme,
    /** 暗色主题 */
    dark: darkTheme,
    /** 自动主题（跟随系统） */
    system: systemTheme
  },
  /** 菜单布局预览图 */
  menuLayouts: {
    /** 左侧菜单 */
    vertical: verticalLayout,
    /** 顶部菜单 */
    horizontal: horizontalLayout,
    /** 混合菜单 */
    mixed: mixedLayout,
    /** 双栏菜单 */
    dualColumn: dualColumnLayout
  },
  /** 菜单风格预览图 */
  menuStyles: {
    /** 设计风格 */
    design: designStyle,
    /** 暗色风格 */
    dark: darkStyle,
    /** 亮色风格 */
    light: lightStyle
  }
}
