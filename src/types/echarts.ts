import type { ECharts, EChartsOption } from 'echarts'

export type ChartInstance = ECharts | undefined

export interface ChartDataItem {
  [key: string]: unknown
}

export interface TableChartData {
  categories: string[]
  values: ChartDataItem[]
}

export interface GroupResult {
  count: number
  value: unknown
  originVal: ChartDataItem
}

export interface VisibleDomRange {
  point: {
    left: number
    width: number
  }
}

export interface HeaderLayout {
  layout?: 'horizontal' | 'vertical' | 'tilted'
  tiltAngle?: number
}

export interface TableHeader {
  value: string
  label: string
}
