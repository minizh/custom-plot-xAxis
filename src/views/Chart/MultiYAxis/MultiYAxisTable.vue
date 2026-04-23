<template>
  <div
    :class="[`layout-${categoryLayout}`, { 'narrow-mode': isNarrowCell }]"
    :style="{ position: 'relative' }"
  >
    <template
      v-for="(yAxis, yIndex) in yAxisList || []"
      :key="`yaxis-${yIndex}`"
    >
      <div class="table-group">
        <template v-if="yAxis.headers?.length">
          <template
            v-for="(item, hIdx) in yAxis.headers"
            :key="`row-${yIndex}-${item.value}`"
          >
            <TableRow
              v-if="
                item.label !== 'categoryRow' ||
                (yIndex === 0 && hIdx === firstCategoryRowIndex)
              "
              :y-index="yIndex"
              :header="item"
              :values="getVisibleValues(yAxis.values)"
              :visible-start-index="visibleStartIndex"
              :margin-left="tablePosition.marginLeft"
              :layout="getHeaderLayout(item.value)"
              :tilt-angle="getHeaderTiltAngle(item.value)"
              :row-height="rowHeights[`${yIndex}-${item.value}`]"
              :font-size="textDivStyle.fontSize"
              :is-narrow-cell="isNarrowCell"
              :auto-column-width="autoColumnWidth"
              :is-column-visible="isColumnVisible"
              :config="getRowConfig(yIndex, item.value)"
              :bg-color="yAxis.bgColor"
              :cell-bg-colors="yAxis.cellBgColors"
              :get-cell-groups="getCellGroups"
              :get-header-cell-groups="getHeaderCellGroups"
              :get-group-bg-color="
                (gIdx) => getRowGroupBgColor(yAxis, gIdx, yIndex, item.value)
              "
            />
          </template>
        </template>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue'
import TableRow from './components/TableRow.vue'
import { useMultiYAxisTable } from './composables/useMultiYAxisTable'
import type { ChartDataItem, HeaderLayout, TableHeader } from '@/types/echarts'
import type { ECharts } from 'echarts'

export interface YAxisTableItem {
  name: string
  headers: TableHeader[]
  values: ChartDataItem[]
  bgColor?: string
  cellBgColors?: string[]
}

const props = withDefaults(
  defineProps<{
    chart?: ECharts
    categories?: string[]
    yAxisList?: YAxisTableItem[]
    labelLayout?: 'horizontal' | 'vertical' | 'tilted'
    labelTiltAngle?: number
    categoryLayout?: 'horizontal' | 'vertical' | 'tilted'
    categoryTiltAngle?: number
    headerLayouts?: Record<string, HeaderLayout>
    autoInterval?: boolean
    isColorByMode?: boolean
  }>(),
  {
    chart: undefined,
    categories: () => [],
    yAxisList: () => [],
    labelLayout: 'horizontal',
    labelTiltAngle: 45,
    categoryLayout: 'horizontal',
    categoryTiltAngle: 45,
    headerLayouts: () => ({}),
    autoInterval: true,
    isColorByMode: false
  }
)

const chartRef = toRef(props, 'chart')

const firstCategoryRowIndex = computed(() => {
  const headers = props.yAxisList?.[0]?.headers ?? []
  return headers.findIndex((h) => h.label === 'categoryRow')
})

const {
  getVisibleValues,
  visibleStartIndex,
  tablePosition,
  textDivStyle,
  getHeaderLayout,
  getHeaderTiltAngle,
  isNarrowCell,
  autoColumnWidth,
  isColumnVisible,
  getCellGroups,
  getHeaderCellGroups,
  getRowConfig,
  getRowGroupBgColor,
  rowHeights
} = useMultiYAxisTable({
  chart: chartRef,
  categories: computed(() => props.categories),
  yAxisList: computed(() => props.yAxisList),
  labelLayout: computed(() => props.labelLayout),
  labelTiltAngle: computed(() => props.labelTiltAngle),
  categoryLayout: computed(() => props.categoryLayout),
  categoryTiltAngle: computed(() => props.categoryTiltAngle),
  headerLayouts: computed(() => props.headerLayouts),
  autoInterval: computed(() => props.autoInterval),
  isColorByMode: computed(() => props.isColorByMode)
})
</script>

<style scoped>
.table-group {
  padding: 0;
  border-radius: 0;
  margin-bottom: -1px;
}

.table-group:last-child {
  margin-bottom: 0;
}

.narrow-mode :deep(.table-cell-div) {
  border-left: none;
  border-right: none;
}
</style>
