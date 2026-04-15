import type { ECharts } from 'echarts'
import { ref, watch, type Ref } from 'vue'

/**
 * DataZoom 状态对象
 */
export interface DataZoomState {
  start: number
  end: number
}

/**
 * 可见数据范围
 */
export interface VisibleRange {
  startIndex: number
  endIndex: number
  total: number
}

/**
 * 获取 ECharts 实例当前的 dataZoom 状态
 * @param chart - ECharts 实例
 * @returns dataZoom 的起止百分比，若不存在则返回 null
 */
export function getDataZoomState(chart: ECharts | undefined): DataZoomState | null {
  const opt = chart?.getOption() as
    | { dataZoom?: Array<{ start?: number; end?: number }> }
    | undefined
  const dz = opt?.dataZoom?.[0]
  if (!dz || dz.start == null || dz.end == null) return null
  return { start: dz.start, end: dz.end }
}

/**
 * 根据 dataZoom 状态计算当前可见的索引范围
 * @param chart - ECharts 实例
 * @param total - 数据总条数
 * @returns 可见范围对象，包含起始索引、结束索引和总数
 */
export function getVisibleRange(
  chart: ECharts | undefined,
  total: number
): VisibleRange | null {
  if (!total) return null
  const dz = getDataZoomState(chart)
  if (!dz) {
    return { startIndex: 0, endIndex: total - 1, total }
  }
  const startIndex = Math.max(0, Math.round((dz.start / 100) * (total - 1)))
  const endIndex = Math.min(total - 1, Math.round((dz.end / 100) * (total - 1)))
  return { startIndex, endIndex, total }
}

/**
 * 通用的隐藏图表原始 X 轴标签/刻度/轴线的操作
 * 用于自定义 X 轴组件覆盖原生轴时
 * @param chart - ECharts 实例
 */
export function hideChartXAxis(chart: ECharts | undefined) {
  chart?.setOption({
    xAxis: {
      axisLabel: { show: false },
      axisTick: { show: false },
      axisLine: { show: false }
    }
  })
}

/**
 * Composable: 监听指定 ECharts 实例的 dataZoom 事件，并返回响应式状态
 * @param chartRef - ECharts 实例的 ref
 * @returns 响应式的 dataZoomState
 */
export function useDataZoomState(chartRef: Ref<ECharts | undefined>) {
  const dataZoomState = ref<DataZoomState | null>(null)

  const update = () => {
    dataZoomState.value = getDataZoomState(chartRef.value)
  }

  watch(
    () => chartRef.value,
    (instance, _oldInstance, onCleanup) => {
      if (instance) {
        instance.on('dataZoom', update)
        update()
        onCleanup(() => {
          instance.off('dataZoom', update)
        })
      }
    },
    { immediate: true }
  )

  return { dataZoomState }
}
