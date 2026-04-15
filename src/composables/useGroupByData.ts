import type { ChartDataItem, GroupResult } from '@/types/echarts'
import { sortAndGroupCount } from '@/utils/chart-util'
import { ref, watch, type Ref } from 'vue'

export function useGroupByData(
  groupBy: Ref<string[]>,
  sortBy: Ref<string | undefined>,
  visibleData: Ref<ChartDataItem[] | undefined>
) {
  const groupByData = ref<GroupResult[][]>([])

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
