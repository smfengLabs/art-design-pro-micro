/**
 * ECharts 插件配置
 *
 * 按需导入 ECharts 图表和组件，减小打包体积。
 * 只注册项目中实际使用的图表类型和组件。
 *
 * @module plugins/echarts
 * @author Art Design Pro Team
 */

// ECharts 按需导入配置
import * as echarts from 'echarts/core'

import {
  BarChart,
  LineChart,
  PieChart,
  ScatterChart,
  RadarChart,
  MapChart,
  CandlestickChart
} from 'echarts/charts'

import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent,
  MarkPointComponent,
  MarkLineComponent,
  ToolboxComponent,
  BrushComponent,
  GeoComponent,
  VisualMapComponent
} from 'echarts/components'

import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
  // 图表类型
  BarChart,
  LineChart,
  PieChart,
  ScatterChart,
  RadarChart,
  MapChart,
  CandlestickChart,

  // 组件
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent,
  MarkPointComponent,
  MarkLineComponent,
  ToolboxComponent,
  BrushComponent,
  GeoComponent,
  VisualMapComponent,

  CanvasRenderer
])

export { echarts }
export type { EChartsOption, BarSeriesOption } from 'echarts'

export const graphic = echarts.graphic
