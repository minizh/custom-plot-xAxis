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
  _categoryCount?: Ref<number>
) {
  const tablePosition = reactive<TablePosition>({
    marginLeft: 0,
    width: 0
  })

  const groupPosition = reactive<GroupPosition>({
    left: 0,
    width: 0
  })

  const getGridRect = (instance: ECharts) => {
    try {
      const grid = (instance as any).getModel().getComponent('grid', 0)
      return grid?.coordinateSystem?.getRect() as
        | { x: number; y: number; width: number; height: number }
        | undefined
    } catch {
      return undefined
    }
  }

  const getDataZoomState = (instance: ECharts) => {
    const opt = instance?.getOption() as
      | { dataZoom?: Array<{ start?: number; end?: number }> }
      | undefined
    const dz = opt?.dataZoom?.[0]
    if (!dz || dz.start == null || dz.end == null) return null
    return { start: dz.start, end: dz.end }
  }

  const getVisibleRange = (instance: ECharts) => {
    const total = instance.getOption().xAxis?.[0]?.data?.length || 0
    if (!total) return null

    const dz = getDataZoomState(instance)
    if (!dz) {
      return { startIndex: 0, endIndex: total - 1, total }
    }

    const startIndex = Math.max(
      0,
      Math.round((dz.start / 100) * (total - 1))
    )
    const endIndex = Math.min(
      total - 1,
      Math.round((dz.end / 100) * (total - 1))
    )
    return { startIndex, endIndex, total }
  }

  const setTablePosition = () => {
    const instance = chart.value
    if (!instance) return

    const rect = getGridRect(instance)
    const range = getVisibleRange(instance)
    if (!range) {
      if (rect) {
        tablePosition.width = rect.width
        tablePosition.marginLeft = rect.x
      }
      return
    }

    const { startIndex, endIndex } = range
    if (startIndex === endIndex) {
      if (rect) {
        tablePosition.width = rect.width
        tablePosition.marginLeft = rect.x
      }
      return
    }

    const startCenter = instance.convertToPixel(
      { xAxisIndex: 0 },
      startIndex
    ) as number
    const endCenter = instance.convertToPixel(
      { xAxisIndex: 0 },
      endIndex
    ) as number
    const pointWidth = Math.abs(endCenter - startCenter)
    const width = pointWidth / (endIndex - startIndex)
    const marginLeft = Math.min(startCenter, endCenter) - width / 2

    tablePosition.width = width
    tablePosition.marginLeft = marginLeft
  }

  const setGroupPosition = () => {
    const instance = chart.value
    if (!instance) return

    const rect = getGridRect(instance)
    const range = getVisibleRange(instance)
    if (!range) {
      if (rect) {
        groupPosition.width = rect.width
        groupPosition.left = rect.x
      }
      return
    }

    const { startIndex, endIndex } = range
    if (startIndex === endIndex) {
      if (rect) {
        groupPosition.width = rect.width
        groupPosition.left = rect.x
      }
      return
    }

    const startCenter = instance.convertToPixel(
      { xAxisIndex: 0 },
      startIndex
    ) as number
    const endCenter = instance.convertToPixel(
      { xAxisIndex: 0 },
      endIndex
    ) as number
    const pointWidth = Math.abs(endCenter - startCenter)
    const left = Math.min(startCenter, endCenter)

    groupPosition.width = pointWidth
    groupPosition.left = left
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
