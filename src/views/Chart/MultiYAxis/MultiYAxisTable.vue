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
            <template v-if="!isNarrowCell">
              <template
                v-for="(item, index) in visibleCategories"
                :key="`header-${yIndex}-${item}-${index}`"
              >
                <div
                  v-if="isColumnVisible(index)"
                  class="table-cell-div"
                  :style="
                    getDynamicCellStyle(
                      String(item),
                      autoColumnWidth,
                      categoryLayout,
                      categoryTiltAngle,
                      textDivStyle.fontSize
                    )
                  "
                >
                  <TextDiv
                    :text="item"
                    :layout="categoryLayout"
                    :width="autoColumnWidth"
                    :height="
                      getDynamicCellStyle(
                        String(item),
                        autoColumnWidth,
                        categoryLayout,
                        categoryTiltAngle,
                        textDivStyle.fontSize
                      ).height
                    "
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
                  :style="
                    getDynamicCellStyle(
                      String(item),
                      denseColumnWidth,
                      categoryLayout,
                      categoryTiltAngle,
                      textDivStyle.fontSize
                    )
                  "
                >
                  <TextDiv
                    :text="item"
                    :layout="categoryLayout"
                    :width="denseColumnWidth"
                    :height="
                      getDynamicCellStyle(
                        String(item),
                        denseColumnWidth,
                        categoryLayout,
                        categoryTiltAngle,
                        textDivStyle.fontSize
                      ).height
                    "
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
              :style="
                getDynamicCellStyle(
                  item.label,
                  tablePosition.marginLeft,
                  getHeaderLayout(item.value),
                  getHeaderTiltAngle(item.value),
                  textDivStyle.fontSize,
                  rowHeights[`${yIndex}-${item.value}`]
                )
              "
            >
              <TextDiv
                :text="item.label"
                :layout="getHeaderLayout(item.value)"
                :width="tablePosition.marginLeft"
                :height="
                  getDynamicCellStyle(
                    item.label,
                    tablePosition.marginLeft,
                    getHeaderLayout(item.value),
                    getHeaderTiltAngle(item.value),
                    textDivStyle.fontSize,
                    rowHeights[`${yIndex}-${item.value}`]
                  ).height
                "
                :font-size="textDivStyle.fontSize"
                :tilt-angle="getHeaderTiltAngle(item.value)"
                :truncate="false"
              />
            </div>
            <div :style="{ display: 'flex' }">
              <!-- 正常显示或竖排/横排窄屏显示 -->
              <template
                v-if="
                  !isNarrowCell ||
                  getHeaderLayout(item.value) === 'vertical' ||
                  getHeaderLayout(item.value) === 'horizontal'
                "
              >
                <template
                  v-for="(category, index) in visibleCategories"
                  :key="`cell-${yIndex}-${category}-${item.value}-${index}`"
                >
                  <div
                    v-if="
                      isNarrowCell && getHeaderLayout(item.value) === 'vertical'
                        ? isDenseColumnVisible(index)
                        : isColumnVisible(index)
                    "
                    class="table-cell-div"
                    :style="{
                      ...getDynamicCellStyle(
                        String(
                          getVisibleValues(yAxis.values)?.[index]?.[
                            item.value
                          ] || ''
                        ),
                        isNarrowCell &&
                          getHeaderLayout(item.value) === 'vertical'
                          ? denseColumnWidth
                          : autoColumnWidth,
                        getHeaderLayout(item.value),
                        getHeaderTiltAngle(item.value),
                        textDivStyle.fontSize,
                        rowHeights[`${yIndex}-${item.value}`]
                      ),
                      backgroundColor:
                        yAxis.cellBgColors?.[visibleStartIndex + index] ??
                        yAxis.bgColor ??
                        'transparent'
                    }"
                  >
                    <TextDiv
                      :text="
                        String(
                          getVisibleValues(yAxis.values)?.[index]?.[
                            item.value
                          ] || ''
                        )
                      "
                      :layout="getHeaderLayout(item.value)"
                      :width="
                        isNarrowCell &&
                        getHeaderLayout(item.value) === 'vertical'
                          ? denseColumnWidth
                          : autoColumnWidth
                      "
                      :height="
                        getDynamicCellStyle(
                          String(
                            getVisibleValues(yAxis.values)?.[index]?.[
                              item.value
                            ] || ''
                          ),
                          isNarrowCell ? denseColumnWidth : autoColumnWidth,
                          getHeaderLayout(item.value),
                          getHeaderTiltAngle(item.value),
                          textDivStyle.fontSize,
                          rowHeights[`${yIndex}-${item.value}`]
                        ).height
                      "
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
                  v-for="(group, gIdx) in getCellGroups(
                    getVisibleValues(yAxis.values),
                    item
                  )"
                  :key="`group-${yIndex}-${item.value}-${gIdx}`"
                  class="table-cell-div"
                  :style="{
                    ...getDynamicCellStyle(
                      group.text,
                      group.width,
                      getHeaderLayout(item.value),
                      getHeaderTiltAngle(item.value),
                      textDivStyle.fontSize,
                      rowHeights[`${yIndex}-${item.value}`]
                    ),
                    backgroundColor: getGroupBgColor(yAxis, gIdx),
                    width: `${group.width}px`
                  }"
                >
                  <TextDiv
                    :text="group.text"
                    :layout="getHeaderLayout(item.value)"
                    :width="group.width"
                    :height="
                      getDynamicCellStyle(
                        group.text,
                        group.width,
                        getHeaderLayout(item.value),
                        getHeaderTiltAngle(item.value),
                        textDivStyle.fontSize,
                        rowHeights[`${yIndex}-${item.value}`]
                      ).height
                    "
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
import { computed, toRef, watch } from 'vue'
import { getDynamicCellStyle } from '@/utils/chart-util'

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
    showCategoryRow?: boolean
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
    showCategoryRow: false,
    isColorByMode: false
  }
)

const chartRef = toRef(props, 'chart')

// 使用通用的 dataZoom 状态监听
const { dataZoomState } = useDataZoomState(chartRef)

const totalCount = computed(() => props.categories?.length || 0)

const getSliceRange = () => {
  if (!dataZoomState.value || !chartRef.value)
    return { start: 0, end: totalCount.value - 1 }
  const total = totalCount.value
  const start = Math.max(
    0,
    Math.round((dataZoomState.value.start / 100) * (total - 1))
  )
  const end = Math.min(
    total - 1,
    Math.round((dataZoomState.value.end / 100) * (total - 1))
  )
  return { start, end }
}

const isNarrowCell = computed(() => {
  return isNarrowMode.value && !props.isColorByMode
})

/**
 * 根据 dataZoom 状态截取可见的 categories
 */
const visibleCategories = computed(() => {
  const { start, end } = getSliceRange()
  return (props.categories || []).slice(start, end + 1)
})

/**
 * 根据 dataZoom 状态截取指定 values 数组的可见部分
 */
const getVisibleValues = (values: ChartDataItem[]) => {
  const { start, end } = getSliceRange()
  return values.slice(start, end + 1)
}

/**
 * 可见区域的 starting index（用于映射 cellBgColors）
 */
const visibleStartIndex = computed(() => getSliceRange().start)

/**
 * 计算当前可见数据中，单元格内容的最大文本长度
 * 用于 autoInterval 在 format 后仍能正确计算列宽，防止文本重叠
 */
const maxCellTextLength = computed(() => {
  let max = 0
  props.yAxisList?.forEach((yAxis) => {
    const visibleValues = getVisibleValues(yAxis.values)
    yAxis.headers?.forEach((h) => {
      visibleValues.forEach((item) => {
        const text = String(item[h.value] ?? '')
        if (text.length > max) max = text.length
      })
    })
  })
  return max
})

/**
 * 获取窄屏合并单元格的背景色（取组内第一个可见列的颜色）
 */
const getGroupBgColor = (yAxis: YAxisTableItem, gIdx: number) => {
  if (!yAxis.cellBgColors?.length) return yAxis.bgColor ?? 'transparent'
  const size = groupSize.value
  const cols = (props.categories || [])
    .map((_, idx) => idx)
    .filter((idx) => isDenseColumnVisible(idx))
  const firstIdx = cols[gIdx * size]
  if (firstIdx === undefined) return yAxis.bgColor ?? 'transparent'
  return yAxis.cellBgColors[firstIdx] ?? yAxis.bgColor ?? 'transparent'
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
  getCellGroups,
  groupSize,
  buildRowHeights
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
  maxCellTextLength,
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
    const axisHeights = buildRowHeights(
      visibleValues,
      (header) => `${yIndex}-${header.value}`
    )
    Object.assign(heights, axisHeights)
  })
  return heights
})

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
  overflow: hidden;
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
