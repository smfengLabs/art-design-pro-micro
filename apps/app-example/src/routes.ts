// app-example 业务路由：组件示例 + 模板页面
import type { RouteRecordRaw } from 'vue-router'
import { RouteName } from '@art/app-utils'

export const exampleRoutes: RouteRecordRaw[] = [
  {
    path: '/example',
    name: RouteName.EXAMPLE,
    component: () => import('@art/app-components/layouts'),
    redirect: '/example/components',
    meta: {
      title: 'menus.example.title',
      icon: 'ri:apps-2-line'
    },
    children: [
      {
        path: 'components',
        name: RouteName.EXAMPLE_COMPONENTS,
        meta: {
          title: 'menus.example.components',
          icon: 'ri:apps-2-add-line'
        },
        children: [
          {
            path: '',
            name: RouteName.EXAMPLE_COMPONENTS_OVERVIEW,
            component: () => import('./views/components/index.vue'),
            meta: {
              title: 'menus.example.components',
              icon: 'ri:apps-2-add-line',
              isHide: true
            }
          },
          {
            path: 'wang-editor',
            name: RouteName.EXAMPLE_COMPONENT_EDITOR,
            component: () => import('./views/components/wang-editor/index.vue'),
            meta: {
              title: 'menus.widgets.wangEditor',
              icon: 'ri:t-box-line',
              keepAlive: true
            }
          },
          {
            path: 'excel',
            name: RouteName.EXAMPLE_COMPONENT_EXCEL,
            component: () => import('./views/components/excel/index.vue'),
            meta: {
              title: 'menus.widgets.excel',
              icon: 'ri:download-2-line',
              keepAlive: true
            }
          },
          {
            path: 'drag',
            name: RouteName.EXAMPLE_COMPONENT_DRAG,
            component: () => import('./views/components/drag/index.vue'),
            meta: {
              title: 'menus.widgets.drag',
              icon: 'ri:drag-move-fill',
              keepAlive: true
            }
          },
          {
            path: 'qrcode',
            name: RouteName.EXAMPLE_COMPONENT_QRCODE,
            component: () => import('./views/components/qrcode/index.vue'),
            meta: {
              title: 'menus.widgets.qrcode',
              icon: 'ri:qr-code-line',
              keepAlive: true
            }
          },
          {
            path: 'video',
            name: RouteName.EXAMPLE_COMPONENT_VIDEO,
            component: () => import('./views/components/video/index.vue'),
            meta: {
              title: 'menus.widgets.video',
              icon: 'ri:vidicon-line',
              keepAlive: true
            }
          },
          {
            path: 'image-crop',
            name: RouteName.EXAMPLE_COMPONENT_IMAGE_CROP,
            component: () => import('./views/components/image-crop/index.vue'),
            meta: {
              title: 'menus.widgets.imageCrop',
              icon: 'ri:screenshot-line',
              keepAlive: true
            }
          },
          {
            path: 'watermark',
            name: RouteName.EXAMPLE_COMPONENT_WATERMARK,
            component: () => import('./views/components/watermark/index.vue'),
            meta: {
              title: 'menus.widgets.watermark',
              icon: 'ri:water-flash-line',
              keepAlive: true
            }
          },
          {
            path: 'count-to',
            name: RouteName.EXAMPLE_COMPONENT_COUNT_TO,
            component: () => import('./views/components/count-to/index.vue'),
            meta: {
              title: 'menus.widgets.countTo',
              icon: 'ri:anthropic-line',
              keepAlive: false
            }
          },
          {
            path: 'text-scroll',
            name: RouteName.EXAMPLE_COMPONENT_TEXT_SCROLL,
            component: () => import('./views/components/text-scroll/index.vue'),
            meta: {
              title: 'menus.widgets.textScroll',
              icon: 'ri:input-method-line',
              keepAlive: true
            }
          },
          {
            path: 'icon',
            name: RouteName.EXAMPLE_COMPONENT_ICON,
            component: () => import('./views/components/icon/index.vue'),
            meta: {
              title: 'menus.widgets.icon',
              icon: 'ri:palette-line',
              keepAlive: true
            }
          },
          {
            path: 'fireworks',
            name: RouteName.EXAMPLE_COMPONENT_FIREWORKS,
            component: () => import('./views/components/fireworks/index.vue'),
            meta: {
              title: 'menus.widgets.fireworks',
              icon: 'ri:magic-line',
              keepAlive: true,
              showTextBadge: 'Hot'
            }
          },
          {
            path: 'context-menu',
            name: RouteName.EXAMPLE_COMPONENT_CONTEXT_MENU,
            component: () => import('./views/components/context-menu/index.vue'),
            meta: {
              title: 'menus.widgets.contextMenu',
              icon: 'ri:menu-2-line',
              keepAlive: true
            }
          }
        ]
      },
      {
        path: 'templates',
        name: RouteName.EXAMPLE_TEMPLATES,
        meta: {
          title: 'menus.example.templates',
          icon: 'ri:layout-grid-line'
        },
        children: [
          {
            path: '',
            name: RouteName.EXAMPLE_TEMPLATES_OVERVIEW,
            component: () => import('./views/templates/index.vue'),
            meta: {
              title: 'menus.example.templates',
              icon: 'ri:layout-grid-line',
              isHide: true
            }
          },
          {
            path: 'examples',
            name: RouteName.EXAMPLE_TEMPLATE_EXAMPLES,
            meta: {
              title: 'menus.examples.title',
              icon: 'ri:sparkling-line'
            },
            children: [
              {
                path: 'forms',
                name: RouteName.EXAMPLE_TEMPLATE_FORMS,
                component: () => import('./views/templates/examples/forms/index.vue'),
                meta: {
                  title: 'menus.examples.forms',
                  icon: 'ri:table-view',
                  keepAlive: true
                }
              },
              {
                path: 'form/search-bar',
                name: RouteName.EXAMPLE_TEMPLATE_SEARCH_BAR,
                component: () => import('./views/templates/examples/forms/search-bar.vue'),
                meta: {
                  title: 'menus.examples.searchBar',
                  icon: 'ri:table-line',
                  keepAlive: true
                }
              },
              {
                path: 'tables/basic',
                name: RouteName.EXAMPLE_TEMPLATE_TABLES_BASIC,
                component: () => import('./views/templates/examples/tables/basic.vue'),
                meta: {
                  title: 'menus.examples.tablesBasic',
                  icon: 'ri:layout-grid-line',
                  keepAlive: true
                }
              },
              {
                path: 'tables',
                name: RouteName.EXAMPLE_TEMPLATE_TABLES_ADVANCED,
                component: () => import('./views/templates/examples/tables/index.vue'),
                meta: {
                  title: 'menus.examples.tables',
                  icon: 'ri:table-3',
                  keepAlive: true
                }
              },
              {
                path: 'tables/tree',
                name: RouteName.EXAMPLE_TEMPLATE_TABLES_TREE,
                component: () => import('./views/templates/examples/tables/tree.vue'),
                meta: {
                  title: 'menus.examples.tablesTree',
                  icon: 'ri:layout-2-line',
                  keepAlive: true
                }
              },
              {
                path: 'permission/switch-role',
                name: RouteName.EXAMPLE_TEMPLATE_PERMISSION_SWITCH_ROLE,
                component: () =>
                  import('./views/templates/examples/permission/switch-role/index.vue'),
                meta: {
                  title: 'menus.examples.permission.switchRole',
                  icon: 'ri:contacts-line',
                  keepAlive: true
                }
              },
              {
                path: 'permission/button-auth',
                name: RouteName.EXAMPLE_TEMPLATE_PERMISSION_BUTTON_AUTH,
                component: () =>
                  import('./views/templates/examples/permission/button-auth/index.vue'),
                meta: {
                  title: 'menus.examples.permission.buttonAuth',
                  icon: 'ri:mouse-line',
                  keepAlive: true,
                  authList: [
                    { title: '新增', authMark: 'add' },
                    { title: '编辑', authMark: 'edit' },
                    { title: '删除', authMark: 'delete' },
                    { title: '导出', authMark: 'export' },
                    { title: '查看', authMark: 'view' },
                    { title: '发布', authMark: 'publish' },
                    { title: '配置', authMark: 'config' },
                    { title: '管理', authMark: 'manage' }
                  ]
                }
              },
              {
                path: 'permission/page-visibility',
                name: RouteName.EXAMPLE_TEMPLATE_PERMISSION_PAGE_VISIBILITY,
                component: () =>
                  import('./views/templates/examples/permission/page-visibility/index.vue'),
                meta: {
                  title: 'menus.examples.permission.pageVisibility',
                  icon: 'ri:user-3-line',
                  keepAlive: true,
                  roles: ['R_SUPER']
                }
              },
              {
                path: 'tabs',
                name: RouteName.EXAMPLE_TEMPLATE_TABS,
                component: () => import('./views/templates/examples/tabs/index.vue'),
                meta: {
                  title: 'menus.examples.tabs',
                  icon: 'ri:price-tag-line',
                  keepAlive: true
                }
              },
              {
                path: 'socket-chat',
                name: RouteName.EXAMPLE_TEMPLATE_SOCKET_CHAT,
                component: () => import('./views/templates/examples/socket-chat/index.vue'),
                meta: {
                  title: 'menus.examples.socketChat',
                  icon: 'ri:shake-hands-line',
                  keepAlive: true
                }
              }
            ]
          },
          {
            path: 'cards',
            name: RouteName.EXAMPLE_TEMPLATE_CARDS,
            component: () => import('./views/templates/pages/cards/index.vue'),
            meta: {
              title: 'menus.template.cards',
              icon: 'ri:wallet-line',
              keepAlive: false
            }
          },
          {
            path: 'banners',
            name: RouteName.EXAMPLE_TEMPLATE_BANNERS,
            component: () => import('./views/templates/pages/banners/index.vue'),
            meta: {
              title: 'menus.template.banners',
              icon: 'ri:rectangle-line',
              keepAlive: false
            }
          },
          {
            path: 'charts',
            name: RouteName.EXAMPLE_TEMPLATE_CHARTS,
            component: () => import('./views/templates/pages/charts/index.vue'),
            meta: {
              title: 'menus.template.charts',
              icon: 'ri:bar-chart-box-line',
              keepAlive: false
            }
          },
          {
            path: 'map',
            name: RouteName.EXAMPLE_TEMPLATE_MAP,
            component: () => import('./views/templates/pages/map/index.vue'),
            meta: {
              title: 'menus.template.map',
              icon: 'ri:map-pin-line',
              keepAlive: true
            }
          },
          {
            path: 'chat',
            name: RouteName.EXAMPLE_TEMPLATE_CHAT,
            component: () => import('./views/templates/pages/chat/index.vue'),
            meta: {
              title: 'menus.template.chat',
              icon: 'ri:message-3-line',
              keepAlive: true
            }
          },
          {
            path: 'calendar',
            name: RouteName.EXAMPLE_TEMPLATE_CALENDAR,
            component: () => import('./views/templates/pages/calendar/index.vue'),
            meta: {
              title: 'menus.template.calendar',
              icon: 'ri:calendar-2-line',
              keepAlive: true
            }
          },
          {
            path: 'pricing',
            name: RouteName.EXAMPLE_TEMPLATE_PRICING,
            component: () => import('./views/templates/pages/pricing/index.vue'),
            meta: {
              title: 'menus.template.pricing',
              icon: 'ri:money-cny-box-line',
              keepAlive: true,
              isFullPage: true
            }
          }
        ]
      }
    ]
  }
]

export default exampleRoutes
