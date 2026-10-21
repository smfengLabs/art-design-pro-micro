/// <reference path="./virtual-iconify.d.ts" />
import { addCollection, type IconifyJSON } from '@iconify/vue/offline'
import autoCollections from 'virtual:art-iconify'

// 图标数据由 @art/app-config 的 art:auto-iconify 插件在构建/开发期按需提取，
// 无需手动生成脚本；此处仅负责注册到当前运行时。
for (const collection of autoCollections) {
  addCollection(collection as unknown as IconifyJSON)
}
