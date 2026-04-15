import type { ChartDataItem, TableChartData } from '@/types/echarts'
import type { ECharts } from 'echarts'
import { ref, watch, type Ref } from 'vue'
import { getDataZoomState } from '@/composables/useChartCommon'

export interface DataZoomState {
  start: number
  end: number
}

/**
 * Composable: 根据 ECharts 的 dataZoom 状态，计算当前可见的数据切片
 * 支持两类数据格式：带 categories/values 的 TableChartData 和普通的 ChartDataItem[]
 */
export function useChartDataZoom<T extends TableChartData | ChartDataItem[]>(
  chart: Ref<ECharts | undefined>,
  chartData: Ref<T | undefined>
) {
  const visibleData = ref<T>()

  /**
   * 类型守卫：判断数据是否为 TableChartData（含有 categories 数组）
   */
  const hasCategories = (data: unknown): data is TableChartData => {
    return !!data && Array.isArray((data as TableChartData).categories)
  }

  /**
   * 根据 dataZoom 百分比截取可见数据
   */
  const updateVisibleData = () => {
    const data = chartData.value
    if (!data) {
      visibleData.value = undefined
      return
    }
    if (!chart.value) {
      visibleData.value = data
      return
    }

    const dz = getDataZoomState(chart.value)
    if (!dz) {
      visibleData.value = data
      return
    }

    if (hasCategories(data)) {
      // TableChartData：同步截取 categories 和 values
      const total = data.categories.length
      const startIndex = Math.max(0, Math.round((dz.start / 100) * (total - 1)))
      const endIndex = Math.min(
        total - 1,
        Math.round((dz.end / 100) * (total - 1))
      )
      visibleData.value = {
        categories: data.categories.slice(startIndex, endIndex + 1),
        values: data.values.slice(startIndex, endIndex + 1)
      } as T
    } else {
      // 普通数组：直接 slice
      const arr = data as ChartDataItem[]
      const total = arr.length
      const startIndex = Math.max(0, Math.round((dz.start / 100) * (total - 1)))
      const endIndex = Math.min(
        total - 1,
        Math.round((dz.end / 100) * (total - 1))
      )
      visibleData.value = arr.slice(startIndex, endIndex + 1) as T
    }
  }

  // 监听 chart 实例变化，绑定/解绑 dataZoom 事件
  watch(
    () => chart.value,
    (instance, _oldInstance, onCleanup) => {
      if (instance) {
        instance.on('dataZoom', updateVisibleData)
        updateVisibleData()
        onCleanup(() => {
          instance.off('dataZoom', updateVisibleData)
        })
      }
    }
  )

  // 监听原始数据变化，立即更新可见数据
  watch(
    () => chartData.value,
    () => {
      updateVisibleData()
    },
    { immediate: true }
  )

  return {
    visibleData,
    updateVisibleData
  }
}
