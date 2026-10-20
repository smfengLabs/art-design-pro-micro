import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'

import './styles/tailwind.css'
import './styles/custom.css'
import './styles/home.css'

export default {
  extends: DefaultTheme
} satisfies Theme
