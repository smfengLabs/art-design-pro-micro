import App from './App.vue'
import { bootstrapApp, createRemoteRouteSources } from '@art/app-base'
import { staticRoutes } from './routes/static'
import { asyncRoutes as localAsyncRoutes } from './routes/local-async'
import '@styles/core/tailwind.css'
import '@styles/index.scss'

bootstrapApp({
  appName: 'app-main',
  App,
  staticRoutes,
  homePath: '/dashboard/console',
  asyncRouteSource: localAsyncRoutes,
  remoteRouteSources: createRemoteRouteSources(__MF_REMOTE_REGISTRY__),
  dynamicRemotes: [],
  localComponents: {
    componentGlob: import.meta.glob('./views/**/*.vue'),
    layoutComponent: () => import('@art/app-components/layouts')
  }
})