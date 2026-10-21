import { addCollection, type IconifyJSON } from '@iconify/vue/offline'
import offlineCollections from './iconify-offline.json'

// 离线图标数据由 scripts/generate-iconify-offline.mjs 从源码静态扫描生成。
// 只打包实际使用的图标，避免引入整包图标集，也避免运行时请求 Iconify 外部 API。
for (const collection of offlineCollections) {
  addCollection(collection as unknown as IconifyJSON)
}
