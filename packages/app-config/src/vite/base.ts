import fs from 'node:fs'
import path from 'node:path'
import { loadEnv, type Plugin, type UserConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import Components from 'unplugin-vue-components/vite'
import AutoImport from 'unplugin-auto-import/vite'
import ElementPlus from 'unplugin-element-plus/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import viteCompression from 'vite-plugin-compression'
import { createVersionDefine } from './federation.ts'
import { createRemoteRegistry } from './remotes.ts'
import { createProxy } from './proxy.ts'

/**
 * [MF 适配] element-plus 根子路径导入改走共享代理（解析期别名）
 *
 * unplugin-vue-components 的 ElementPlusResolver 产出 `'element-plus/es'` 子路径规格符。
 * Module Federation 共享清单以精确包名为 key（`'element-plus'`），裸子路径不会命中共享
 * 代理（loadShare 包装），应用/远端图会直连自身 element-plus 实例——其内部 vue 运行时
 * 与宿主形成双实例（跨运行时 renderSlot 崩溃）。
 *
 * 处理方式：解析期把精确规格符 `'element-plus/es'` 重新交给 `'element-plus'` 解析
 * （命中共享代理，复用 provider 单例）。不改写 resolver 输出，避免激活
 * unplugin-element-plus 对 `'element-plus'` 根导入的按需样式注入——其
 * hyphenate('LoadingDirective') 会产出 element-plus 中不存在的
 * `loading-directive/style/index`，且会给所有组件重复注入样式（背离 origin 样式管线）。
 * 样式子路径（`.../style/*`）为精确匹配之外的规格符，不受拦截。
 */
function elementPlusSharedSubpath(): Plugin {
  return {
    name: 'art:mf-element-plus-shared-subpath',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (source !== 'element-plus/es') return null
      return this.resolve('element-plus', importer, { ...options, skipSelf: true })
    }
  }
}

/** app 根目录（vite 以 app 目录为 cwd 运行） */
const rootDir = process.cwd()

/** 解析 app 内路径（origin resolvePath） */
function resolvePath(paths: string) {
  return path.resolve(rootDir, paths)
}

/** 解析键值对 env 文件（根 .env.shared 默认值来源） */
function parseEnvFile(file: string): Record<string, string> {
  const result: Record<string, string> = {}
  if (!fs.existsSync(file)) return result
  for (const line of fs.readFileSync(file, 'utf-8').split(/\r?\n/)) {
    if (/^\s*#/.test(line)) continue
    const matched = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (matched) result[matched[1]] = matched[2]
  }
  return result
}

export interface BaseConfigContext {
  /** vite mode（development / production） */
  mode: string
  /** 应用形态：main = host，remote = 远端子应用 */
  kind: 'main' | 'remote'
}

/**
 * element-plus 全量组件样式入口（枚举「无扩展名」规格符）
 *
 * 为什么不用通配符：optimizeDeps.include 中的 `*` 会被 Vite 展开为「带扩展名的文件
 * 路径」（如 …/style/css.mjs），而 unplugin-vue-components / unplugin-auto-import 的
 * ElementPlusResolver 在**转换期**注入的运行时规格符是无扩展名的 …/style/css ——
 * 两者 key 不一致，未命中的组件样式会在首次渲染该组件时触发 Vite 运行期再预构建
 * （表现为 504 Outdated Optimize Dep、切换子应用路由时 chunk 卡死/无限转圈）。
 * 全量枚举后启动即预构建完毕，路由切换不再触发 re-optimize。
 */
function elementPlusStyleDeps(): string[] {
  const componentsDir = resolvePath('node_modules/element-plus/es/components')
  try {
    const deps: string[] = []
    for (const entry of fs.readdirSync(componentsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      if (fs.existsSync(path.join(componentsDir, entry.name, 'style/css.mjs'))) {
        deps.push(`element-plus/es/components/${entry.name}/style/css`)
      }
      if (fs.existsSync(path.join(componentsDir, entry.name, 'style/index.mjs'))) {
        deps.push(`element-plus/es/components/${entry.name}/style/index`)
      }
    }
    return deps
  } catch {
    // 包未安装等异常环境：退回通配符兜底（保持旧行为）
    return ['element-plus/es/components/*/style/css*', 'element-plus/es/components/*/style/index*']
  }
}

/** main（宿主）预构建依赖（仅保留宿主实际在用的重型依赖） */
const MAIN_OPTIMIZE_DEPS = [
  'echarts/core',
  'echarts/charts',
  'echarts/components',
  'echarts/renderers',
  'element-plus/es',
  // vdp 为 MF 共享项，宿主须在启动时即预构建提供者（避免列设置弹层首开触发再优化）
  'vue-draggable-plus',
  ...elementPlusStyleDeps()
]

/** remote（app-system：element-plus + 图标依赖） */
const REMOTE_OPTIMIZE_DEPS = [
  '@element-plus/icons-vue',
  '@iconify/vue',
  'element-plus/es',
  'vue-draggable-plus',
  ...elementPlusStyleDeps()
]

export function createBaseConfig(context: BaseConfigContext): UserConfig {
  const { mode, kind } = context
  const isDev = mode === 'development'

  // app 级 env 覆盖根 .env.shared（v2 B5：默认值下沉，app 可覆写）
  const appEnv = loadEnv(mode, rootDir)
  const env = { ...parseEnvFile(path.resolve(rootDir, '../..', '.env.shared')), ...appEnv }

  console.log(`🔧 [app-config] kind=${kind} mode=${mode}`)
  console.log(`📡 API_URL = ${env.VITE_API_URL}`)

  return {
    define: {
      // vue-i18n 的 ESM Bundler 产物依赖该常量裁剪生产分支；显式注入可避免
      // 联邦/压缩链路下常量缺失，导致运行时函数被错误 tree-shake。
      'process.env.NODE_ENV': JSON.stringify(isDev ? 'development' : 'production'),
      __APP_VERSION__: createVersionDefine(),
      __MF_REMOTE_REGISTRY__: JSON.stringify(createRemoteRegistry(isDev).routeSources)
    },
    base: env.VITE_BASE_URL,
    server: {
      port: Number(env.VITE_PORT),
      proxy: createProxy(env),
      host: true
    },
    resolve: {
      alias: {
        '@': resolvePath('src'),
        '@views': resolvePath('src/views'),
        '@imgs': resolvePath('src/assets/images'),
        '@styles': path.resolve(rootDir, '../../packages/app-config/tailwind')
      }
    },
    build: {
      // v2 偏差（D2-17）：federation 生成的 loadShare 代理含 Top-level await（ES2022+），
      // es2015 目标下 esbuild 转译失败（app-system 构建中断）；与插件官方示例一致改用 esnext。
      target: 'esnext',
      outDir: 'dist',
      chunkSizeWarningLimit: 2000,
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true
        },
        mangle: {
          // 避免把 MF 共享模块的导入绑定重命名为 `$`，与 Vue 共享模块导出的 `$` 冲突，
          // 导致 `const _directive_ripple = resolveDirective('ripple')` 的导入被错误移除。
          reserved: ['$']
        }
      },
      dynamicImportVarsOptions: {
        warnOnError: true,
        exclude: [],
        include: ['src/views/**/*.vue']
      }
    },
    plugins: [
      // element-plus/es → 共享代理（须先于其他解析插件；见函数注释）
      elementPlusSharedSubpath(),
      vue(),
      tailwindcss(),
      // 仅保留 Vue / Router / Pinia；Element Plus 没有官方 AutoImport preset，
      // 由下方 ElementPlusResolver 按需导入（ElMessage / ElLoading 等）。
      AutoImport({
        imports: ['vue', 'vue-router', 'pinia'],
        dts: 'src/types/import/auto-imports.d.ts',
        resolvers: [ElementPlusResolver()],
        eslintrc: {
          enabled: true,
          filepath: './.auto-import.json',
          globalsPropValue: true
        }
      }),
      Components({
        dts: 'src/types/import/components.d.ts',
        resolvers: [ElementPlusResolver()]
      }),
      ElementPlus({
        useSource: true
      }),
      viteCompression({
        verbose: false,
        disable: false,
        algorithm: 'gzip',
        ext: '.gz',
        threshold: 10240,
        deleteOriginFile: false
      })
    ],
    optimizeDeps: {
      include: kind === 'main' ? MAIN_OPTIMIZE_DEPS : REMOTE_OPTIMIZE_DEPS
    },
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `
            @use "@styles/core/el-light.scss" as *; 
            @use "@styles/core/mixin.scss" as *;
          `
        }
      },
      postcss: {
        plugins: [
          {
            postcssPlugin: 'internal:charset-removal',
            AtRule: {
              charset: (atRule: any) => {
                if (atRule.name === 'charset') {
                  atRule.remove()
                }
              }
            }
          }
        ]
      }
    }
  }
}
