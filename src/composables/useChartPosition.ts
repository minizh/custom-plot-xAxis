import type { ECharts } from 'echarts'
import { reactive, watch, type Ref } from 'vue'
import { getVisibleRange } from '@/composables/useChartCommon'

export interface TablePosition {
  marginLeft: number
  width: number
}

export interface GroupPosition {
  left: number
  width: number
}

/**
 * Composable: 同步 ECharts 图表网格位置到响应式对象
 * 用于在图表上方/下方覆盖自定义 DOM（如分组 X 轴、表格 X 轴）时精确定位
 */
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

  /**
   * 获取 ECharts grid 组件的矩形区域（像素坐标）
   */
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

  /**
   * 计算单个数据点在网格中的像素宽度，并更新 tablePosition
   * tablePosition 表示：第一个数据点左边缘到第二个数据点左边缘的宽度（即单格宽度）
   */
  const setTablePosition = () => {
    const instance = chart.value
    if (!instance) return

    const rect = getGridRect(instance)
    const opt = instance.getOption() as { xAxis?: Array<{ data?: unknown[] }> }
    const range = getVisibleRange(instance, opt.xAxis?.[0]?.data?.length || 0)
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

  /**
   * 计算可见区域在网格中的整体 left/width，并更新 groupPosition
   * groupPosition 表示：可见区域最左侧到最右侧的总宽度和左偏移
   */
  const setGroupPosition = () => {
    const instance = chart.value
    if (!instance) return

    const rect = getGridRect(instance)
    const opt = instance.getOption() as { xAxis?: Array<{ data?: unknown[] }> }
    const range = getVisibleRange(instance, opt.xAxis?.[0]?.data?.length || 0)
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

  /**
   * 同步两种位置计算
   */
  const syncPosition = () => {
    setTablePosition()
    setGroupPosition()
  }

  // 监听 chart 实例变化，绑定 dataZoom 事件以在缩放/平移时自动同步位置
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
