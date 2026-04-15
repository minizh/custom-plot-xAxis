import {
  getConfiguredGridPx,
  getXAxisVisibleDomRange
} from '@/utils/chart-util'
import type { ECharts } from 'echarts'
import { reactive, watch, type Ref } from 'vue'

export interface TablePosition {
  marginLeft: number
  width: number
}

export interface GroupPosition {
  left: number
  width: number
}

export function useChartPosition(
  chart: Ref<ECharts | undefined>,
  categoryCount: Ref<number>
) {
  const tablePosition = reactive<TablePosition>({
    marginLeft: 0,
    width: 0
  })

  const groupPosition = reactive<GroupPosition>({
    left: 0,
    width: 0
  })

  const setTablePosition = () => {
    const instance = chart.value
    if (!instance) return

    const chartWidthRange = getXAxisVisibleDomRange(instance, 0)
    const { point } = chartWidthRange
    const center1 = instance.convertToPixel({ xAxisIndex: 0 }, 0) as number
    const center2 = instance.convertToPixel({ xAxisIndex: 0 }, 1) as number

    let width = center2 - center1
    let marginLeft = point.left - width / 2

    if (categoryCount.value === 1 || !center2) {
      const gridLeft = getConfiguredGridPx(instance, 0, 'left')
      const gridRight = getConfiguredGridPx(instance, 0, 'right')
      const chartWidth = instance.getDom().clientWidth
      width = chartWidth - gridLeft - gridRight
      marginLeft = gridLeft
    }

    tablePosition.width = width
    tablePosition.marginLeft = marginLeft
  }

  const setGroupPosition = () => {
    const instance = chart.value
    if (!instance) return

    const { point } = getXAxisVisibleDomRange(instance, 0)
    let width = point.width
    let left = point.left

    if (categoryCount.value === 1 || width === 0) {
      const gridLeft = getConfiguredGridPx(instance, 0, 'left')
      const gridRight = getConfiguredGridPx(instance, 0, 'right')
      const chartWidth = instance.getDom().clientWidth
      width = chartWidth - gridLeft - gridRight
      left = gridLeft
    }

    groupPosition.left = left
    groupPosition.width = width
  }

  const syncPosition = () => {
    setTablePosition()
    setGroupPosition()
  }

  watch(
    () => chart.value,
    (instance, _old, onCleanup) => {
      if (instance) {
        instance.on('dataZoom', syncPosition)
        syncPosition()
        onCleanup(() => {
          instance.off('dataZoom', syncPosition)
        })
      }
    }
  )

  return {
    tablePosition,
    groupPosition,
    setTablePosition,
    setGroupPosition,
    syncPosition
  }
}
