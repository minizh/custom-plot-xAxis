import type { ChartDataItem, GroupResult } from '@/types/echarts'
import { sortAndGroupCount } from '@/utils/chart-util'
import { ref, watch, type Ref } from 'vue'

/**
 * Composable: 对可见数据按指定字段进行分组计数
 * 常用于自定义分组 X 轴（GroupXAxis）的数据预处理
 */
export function useGroupByData(
  groupBy: Ref<string[]>,
  sortBy: Ref<string | undefined>,
  visibleData: Ref<ChartDataItem[] | undefined>
) {
  // 分组后的二维数组：每一层对应一个 groupBy 字段的分组结果
  const groupByData = ref<GroupResult[][]>([])

  /**
   * 根据 groupBy 配置对 visibleData 逐字段分组
   * 固定按 'waferId' 排序（与业务强相关）
   */
  const updateGroupByData = () => {
    const data = visibleData.value
    if (!data || !data.length) {
      groupByData.value = []
      return
    }

    const result: GroupResult[][] = []
    groupBy.value.forEach((key) => {
      const grouped = sortAndGroupCount(
        [...data],
        'waferId',
        key,
        !!sortBy.value
      )
      result.push(grouped)
    })
    groupByData.value = result
  }

  // 监听分组字段、排序字段或可见数据变化，自动更新分组结果
  watch(
    [groupBy, sortBy, visibleData],
    () => {
      updateGroupByData()
    },
    { immediate: true }
  )

  return {
    groupByData,
    updateGroupByData
  }
}
