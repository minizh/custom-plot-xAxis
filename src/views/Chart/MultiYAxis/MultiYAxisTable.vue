<template>
  <div :class="[`layout-${categoryLayout}`, { 'narrow-mode': isNarrowMode }]" :style="{ position: 'relative' }">
    <template v-for="(yAxis, yIndex) in yAxisList || []" :key="`yaxis-${yIndex}`">
      <div class="table-group">
        <!-- 类别行 -->
        <div
          v-if="showCategoryRow && visibleCategories.length"
          :style="{ display: 'flex' }"
        >
          <div
            :style="{
              display: 'flex',
              marginLeft: `${tablePosition.marginLeft}px`
            }"
          >
            <template v-if="!isNarrowMode">
              <template
                v-for="(item, index) in visibleCategories"
                :key="`header-${yIndex}-${item}-${index}`"
              >
                <div
                  v-if="isColumnVisible(index)"
                  class="table-cell-div"
                  :style="getDynamicCellStyle(String(item), autoColumnWidth, categoryLayout, categoryTiltAngle, textDivStyle.fontSize)"
                >
                  <TextDiv
                    :text="item"
                    :layout="categoryLayout"
                    :width="autoColumnWidth"
                    :height="getDynamicCellStyle(String(item), autoColumnWidth, categoryLayout, categoryTiltAngle, textDivStyle.fontSize).height"
                    :font-size="textDivStyle.fontSize"
                    :tilt-angle="categoryTiltAngle"
                    :truncate="false"
                  />
                </div>
              </template>
            </template>
            <template v-else>
              <template
                v-for="(item, index) in visibleCategories"
                :key="`header-${yIndex}-${item}-${index}`"
              >
                <div
                  v-if="isDenseColumnVisible(index)"
                  class="table-cell-div"
                  :style="getDynamicCellStyle(String(item), denseColumnWidth, categoryLayout, categoryTiltAngle, textDivStyle.fontSize)"
                >
                  <TextDiv
                    :text="item"
                    :layout="categoryLayout"
                    :width="denseColumnWidth"
                    :height="getDynamicCellStyle(String(item), denseColumnWidth, categoryLayout, categoryTiltAngle, textDivStyle.fontSize).height"
                    :font-size="textDivStyle.fontSize"
                    :tilt-angle="categoryTiltAngle"
                    :truncate="false"
                  />
                </div>
              </template>
            </template>
          </div>
        </div>

        <!-- 数据行 -->
        <template v-if="yAxis.headers?.length">
          <div
            v-for="item in yAxis.headers"
            :key="`row-${yIndex}-${item.value}`"
            :style="{ display: 'flex' }"
          >
            <!-- 标签列（无背景无边框） -->
            <div
              class="table-cell-div table-label-cell no-bg-no-border"
              :style="getDynamicCellStyle(item.label, tablePosition.marginLeft, getHeaderLayout(item.value), getHeaderTiltAngle(item.value), textDivStyle.fontSize, rowHeights[`${yIndex}-${item.value}`])"
            >
              <TextDiv
                :text="item.label"
                :layout="getHeaderLayout(item.value)"
                :width="tablePosition.marginLeft"
                :height="getDynamicCellStyle(item.label, tablePosition.marginLeft, getHeaderLayout(item.value), getHeaderTiltAngle(item.value), textDivStyle.fontSize, rowHeights[`${yIndex}-${item.value}`]).height"
                :font-size="textDivStyle.fontSize"
                :tilt-angle="getHeaderTiltAngle(item.value)"
                :truncate="false"
              />
            </div>
            <div :style="{ display: 'flex' }">
              <!-- 正常显示或竖排/横排窄屏显示 -->
              <template v-if="!isNarrowMode || getHeaderLayout(item.value) === 'vertical' || getHeaderLayout(item.value) === 'horizontal'">
                <template
                  v-for="(category, index) in visibleCategories"
                  :key="`cell-${yIndex}-${category}-${item.value}-${index}`"
                >
                  <div
                    v-if="isNarrowMode ? isDenseColumnVisible(index) : isColumnVisible(index)"
                    class="table-cell-div"
                    :style="{
                      ...getDynamicCellStyle(String(getVisibleValues(yAxis.values)?.[index]?.[item.value] || ''), isNarrowMode ? denseColumnWidth : autoColumnWidth, getHeaderLayout(item.value), getHeaderTiltAngle(item.value), textDivStyle.fontSize, rowHeights[`${yIndex}-${item.value}`]),
                      backgroundColor: yAxis.bgColor || 'transparent'
                    }"
                  >
                    <TextDiv
                      :text="String(getVisibleValues(yAxis.values)?.[index]?.[item.value] || '')"
                      :layout="getHeaderLayout(item.value)"
                      :width="isNarrowMode ? denseColumnWidth : autoColumnWidth"
                      :height="getDynamicCellStyle(String(getVisibleValues(yAxis.values)?.[index]?.[item.value] || ''), isNarrowMode ? denseColumnWidth : autoColumnWidth, getHeaderLayout(item.value), getHeaderTiltAngle(item.value), textDivStyle.fontSize, rowHeights[`${yIndex}-${item.value}`]).height"
                      :font-size="textDivStyle.fontSize"
                      :tilt-angle="getHeaderTiltAngle(item.value)"
                      :truncate="false"
                    />
                  </div>
                </template>
              </template>
              <!-- 窄屏 tilted 布局：合并单元格显示 -->
              <template v-else>
                <div
                  v-for="(group, gIdx) in getCellGroups(getVisibleValues(yAxis.values), item)"
                  :key="`group-${yIndex}-${item.value}-${gIdx}`"
                  class="table-cell-div"
                  :style="{
                    ...getDynamicCellStyle(group.text, group.width, getHeaderLayout(item.value), getHeaderTiltAngle(item.value), textDivStyle.fontSize, rowHeights[`${yIndex}-${item.value}`]),
                    backgroundColor: yAxis.bgColor || 'transparent',
                    width: `${group.width}px`
                  }"
                >
                  <TextDiv
                    :text="group.text"
                    :layout="getHeaderLayout(item.value)"
                    :width="group.width"
                    :height="getDynamicCellStyle(group.text, group.width, getHeaderLayout(item.value), getHeaderTiltAngle(item.value), textDivStyle.fontSize, rowHeights[`${yIndex}-${item.value}`]).height"
                    :font-size="textDivStyle.fontSize"
                    :tilt-angle="getHeaderTiltAngle(item.value)"
                    :truncate="false"
                  />
                </div>
              </template>
            </div>
          </div>
        </template>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import TextDiv from '@/components/TextDiv/TextDiv.vue'
import { useDataZoomState } from '@/composables/useChartCommon'
import { useTableAxis } from '@/composables/useTableAxis'
import type { ChartDataItem, HeaderLayout, TableHeader } from '@/types/echarts'
import type { ECharts } from 'echarts'
import { computed, ref, toRef, watch } from 'vue'
import { getDynamicCellStyle } from '@/utils/chart-util'

export interface YAxisTableItem {
  name: string
  headers: TableHeader[]
  values: ChartDataItem[]
  bgColor?: string
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
    showCategoryRow?: boolean
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
    showCategoryRow: false
  }
)

const chartRef = toRef(props, 'chart')

// 使用通用的 dataZoom 状态监听
const { dataZoomState } = useDataZoomState(chartRef)

const totalCount = computed(() => props.categories?.length || 0)

/**
 * 根据 dataZoom 状态截取可见的 categories
 */
const visibleCategories = computed(() => {
  const cats = props.categories || []
  if (!dataZoomState.value || !chartRef.value) return cats
  const total = cats.length
  const startIndex = Math.max(0, Math.round((dataZoomState.value.start / 100) * (total - 1)))
  const endIndex = Math.min(total - 1, Math.round((dataZoomState.value.end / 100) * (total - 1)))
  return cats.slice(startIndex, endIndex + 1)
})

/**
 * 根据 dataZoom 状态截取指定 values 数组的可见部分
 */
const getVisibleValues = (values: ChartDataItem[]) => {
  if (!dataZoomState.value || !chartRef.value) return values
  const total = values.length
  const startIndex = Math.max(0, Math.round((dataZoomState.value.start / 100) * (total - 1)))
  const endIndex = Math.min(total - 1, Math.round((dataZoomState.value.end / 100) * (total - 1)))
  return values.slice(startIndex, endIndex + 1)
}

// 抽离复杂的表格轴布局计算
const {
  tablePosition,
  textDivStyle,
  getHeaderLayout,
  getHeaderTiltAngle,
  isNarrowMode,
  bindResizeObserver,
  autoColumnWidth,
  denseColumnWidth,
  isColumnVisible,
  isDenseColumnVisible,
  calculateVisibleColumns,
  calculateDenseVisibleColumns,
  getCellGroups,
  buildRowHeights,
  hideChartXAxis
} = useTableAxis({
  chart: chartRef,
  categories: computed(() => visibleCategories.value),
  headers: computed(() => {
    // 合并所有 yAxis 的 headers 作为布局计算的参考（去重）
    const map = new Map<string, TableHeader>()
    props.yAxisList?.forEach((yAxis) => {
      yAxis.headers?.forEach((h) => {
        if (!map.has(h.value)) map.set(h.value, h)
      })
    })
    return Array.from(map.values())
  }),
  labelLayout: computed(() => props.labelLayout),
  labelTiltAngle: computed(() => props.labelTiltAngle),
  categoryLayout: computed(() => props.categoryLayout),
  categoryTiltAngle: computed(() => props.categoryTiltAngle),
  headerLayouts: computed(() => props.headerLayouts),
  autoInterval: computed(() => props.autoInterval)
})

// 为每个 yAxis 的每个 header 计算行高
const rowHeights = computed(() => {
  const heights: Record<string, number> = {}
  props.yAxisList?.forEach((yAxis, yIndex) => {
    const visibleValues = getVisibleValues(yAxis.values)
    const axisHeights = buildRowHeights(visibleValues, (header) => `${yIndex}-${header.value}`)
    Object.assign(heights, axisHeights)
  })
  return heights
})

// 数据变化时隐藏原生 X 轴并重新计算列宽
watch(
  visibleCategories,
  (data) => {
    if (props.chart && data?.length) {
      hideChartXAxis()
      calculateVisibleColumns()
      calculateDenseVisibleColumns()
    }
  },
  { immediate: true }
)

// 监听 chart 实例变化，绑定 ResizeObserver
watch(
  () => props.chart,
  (chart) => {
    if (chart) {
      bindResizeObserver()
    }
  }
)
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

.table-cell-div {
  border: 1px solid #000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.table-label-cell {
  overflow: hidden;
}

.table-cell-div.no-bg-no-border {
  background-color: transparent !important;
  border: none;
}

.narrow-mode .table-cell-div {
  border-left: none;
  border-right: none;
}
</style>
