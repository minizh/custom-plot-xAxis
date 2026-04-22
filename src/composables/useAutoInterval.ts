import { nextTick, ref, watch, type Ref } from 'vue'
import { calculateColumnState, type ColumnStateOptions } from '@/utils/chart-util'

export interface AutoIntervalOptions extends ColumnStateOptions {}

/**
 * Composable: 根据容器宽度和标签布局自动计算可见列索引与列宽
 * 用于表格轴/自定义 X 轴在空间不足时自动间隔显示，防止标签重叠
 */
export function useAutoInterval(options: Ref<AutoIntervalOptions>) {
  // 当前可见的列索引数组
  const visibleColumns = ref<number[]>([])
  // 计算后的单列宽度（像素）
  const autoColumnWidth = ref(0)

  /**
   * 核心计算：在可用宽度内均匀选取可见列，保证列宽至少能容纳标签
   */
  const calculateVisibleColumns = () => {
    const result = calculateColumnState(options.value)
    visibleColumns.value = result.visibleColumns
    autoColumnWidth.value = result.autoColumnWidth
  }

  /**
   * 判断指定列索引是否在可见列表中
   */
  const isColumnVisible = (index: number): boolean => {
    if (!options.value.enabled || visibleColumns.value.length === 0) {
      return true
    }
    return visibleColumns.value.includes(index)
  }

  // 监听配置变化，自动重新计算
  watch(
    () => options.value,
    async () => {
      await nextTick()
      calculateVisibleColumns()
    },
    { deep: true }
  )

  return {
    visibleColumns,
    autoColumnWidth,
    calculateVisibleColumns,
    isColumnVisible
  }
}
