import type { ChartDataItem, TableChartData } from '@/types/echarts'
import type { ECharts } from 'echarts'
import { ref, watch, type Ref } from 'vue'

export interface DataZoomState {
  start: number
  end: number
}

export function useChartDataZoom<T extends TableChartData | ChartDataItem[]>(
  chart: Ref<ECharts | undefined>,
  chartData: Ref<T | undefined>
) {
  const visibleData = ref<T>()

  const getDataZoomState = (): DataZoomState | null => {
    const opt = chart.value?.getOption() as
      | { dataZoom?: Array<{ start?: number; end?: number }> }
      | undefined
    const dz = opt?.dataZoom?.[0]
    if (!dz || dz.start == null || dz.end == null) return null
    return { start: dz.start, end: dz.end }
  }

  const hasCategories = (data: unknown): data is TableChartData => {
    return !!data && Array.isArray((data as TableChartData).categories)
  }

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

    const dz = getDataZoomState()
    if (!dz) {
      visibleData.value = data
      return
    }

    if (hasCategories(data)) {
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
