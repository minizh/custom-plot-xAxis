<template>
  <div :class="[`layout-${categoryLayout}`, { 'narrow-mode': isNarrowMode }]" :style="{ position: 'relative' }">
    <template v-for="(yAxis, yIndex) in yAxisList || []" :key="`yaxis-${yIndex}`">
      <div class="table-group">
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
        <template v-if="yAxis.headers?.length">
          <div
            v-for="item in yAxis.headers"
            :key="`row-${yIndex}-${item.value}`"
            :style="{ display: 'flex' }"
          >
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
              <template v-else>
                <div
                  v-for="(group, gIdx) in getCellGroups(yAxis, item)"
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
import { useAutoInterval } from '@/composables/useAutoInterval'
import { useChartPosition } from '@/composables/useChartPosition'
import { useResizeObserver } from '@/composables/useResizeObserver'
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

const dataZoomState = ref<{ start: number; end: number } | null>(null)

const getDataZoomState = () => {
  const opt = chartRef.value?.getOption() as
    | { dataZoom?: Array<{ start?: number; end?: number }> }
    | undefined
  const dz = opt?.dataZoom?.[0]
  if (!dz || dz.start == null || dz.end == null) return null
  return { start: dz.start, end: dz.end }
}

const updateDataZoomState = () => {
  dataZoomState.value = getDataZoomState()
}

watch(
  () => chartRef.value,
  (instance, _oldInstance, onCleanup) => {
    if (instance) {
      instance.on('dataZoom', updateDataZoomState)
      updateDataZoomState()
      onCleanup(() => {
        instance.off('dataZoom', updateDataZoomState)
      })
    }
  }
)

const totalCount = computed(() => props.categories?.length || 0)

const visibleCategories = computed(() => {
  const cats = props.categories || []
  if (!dataZoomState.value || !chartRef.value) return cats
  const total = cats.length
  const startIndex = Math.max(0, Math.round((dataZoomState.value.start / 100) * (total - 1)))
  const endIndex = Math.min(total - 1, Math.round((dataZoomState.value.end / 100) * (total - 1)))
  return cats.slice(startIndex, endIndex + 1)
})

const getVisibleValues = (values: ChartDataItem[]) => {
  if (!dataZoomState.value || !chartRef.value) return values
  const total = values.length
  const startIndex = Math.max(0, Math.round((dataZoomState.value.start / 100) * (total - 1)))
  const endIndex = Math.min(total - 1, Math.round((dataZoomState.value.end / 100) * (total - 1)))
  return values.slice(startIndex, endIndex + 1)
}

const { tablePosition } = useChartPosition(
  chartRef,
  computed(() => visibleCategories.value.length || 0)
)

const textDivStyle = computed(() => ({ fontSize: 12 }))

const getHeaderLayout = (
  headerValue: string
): 'horizontal' | 'vertical' | 'tilted' => {
  return props.headerLayouts[headerValue]?.layout || props.labelLayout
}

const getHeaderTiltAngle = (headerValue: string): number => {
  return props.headerLayouts[headerValue]?.tiltAngle ?? props.labelTiltAngle
}

const effectiveCategoryLayout = computed((): 'horizontal' | 'vertical' | 'tilted' => {
  let hasTilted = false
  let hasVertical = false
  props.yAxisList?.forEach((yAxis) => {
    yAxis.headers?.forEach((header) => {
      const layout = getHeaderLayout(header.value)
      if (layout === 'tilted') hasTilted = true
      if (layout === 'vertical') hasVertical = true
    })
  })
  if (hasTilted) return 'tilted'
  if (hasVertical) return 'vertical'
  return props.categoryLayout
})

const effectiveTiltAngle = computed(() => {
  let maxAngle = props.categoryTiltAngle
  props.yAxisList?.forEach((yAxis) => {
    yAxis.headers?.forEach((header) => {
      const layout = getHeaderLayout(header.value)
      if (layout === 'tilted') {
        const angle = getHeaderTiltAngle(header.value)
        if (angle > maxAngle) maxAngle = angle
      }
    })
  })
  return maxAngle
})

const maxTextLength = computed(() => {
  const cats = visibleCategories.value || []
  return cats.reduce((max, cat) => Math.max(max, String(cat).length), 0)
})

const isNarrowMode = ref(false)
const updateNarrowMode = () => {
  const w = props.chart?.getDom()?.clientWidth || 0
  isNarrowMode.value = w > 0 && w < 600
}

const autoIntervalOptions = computed(() => ({
  enabled: props.autoInterval,
  containerWidth: props.chart?.getDom()?.clientWidth || 0,
  marginLeft: tablePosition.marginLeft,
  totalColumns: visibleCategories.value?.length || 0,
  maxTextLength: maxTextLength.value,
  categoryLayout: effectiveCategoryLayout.value,
  categoryTiltAngle: effectiveTiltAngle.value,
  fontSize: textDivStyle.value.fontSize,
  originWidth: tablePosition.width,
  narrowMode: isNarrowMode.value
}))

const { autoColumnWidth, isColumnVisible, calculateVisibleColumns } =
  useAutoInterval(autoIntervalOptions)

// narrowMode dense grid for vertical rows and merge base
const denseIntervalOptions = computed(() => ({
  enabled: props.autoInterval && isNarrowMode.value,
  containerWidth: props.chart?.getDom()?.clientWidth || 0,
  marginLeft: tablePosition.marginLeft,
  totalColumns: visibleCategories.value?.length || 0,
  maxTextLength: maxTextLength.value,
  categoryLayout: 'vertical' as const,
  categoryTiltAngle: 0,
  fontSize: textDivStyle.value.fontSize,
  originWidth: tablePosition.width,
  narrowMode: true
}))

const {
  autoColumnWidth: denseColumnWidth,
  isColumnVisible: isDenseColumnVisible,
  calculateVisibleColumns: calculateDenseVisibleColumns
} = useAutoInterval(denseIntervalOptions)

// narrowMode sparse grid for horizontal/tilted rows to compute merge count
const sparseIntervalOptions = computed(() => ({
  enabled: props.autoInterval && isNarrowMode.value,
  containerWidth: props.chart?.getDom()?.clientWidth || 0,
  marginLeft: tablePosition.marginLeft,
  totalColumns: visibleCategories.value?.length || 0,
  maxTextLength: maxTextLength.value,
  categoryLayout: 'tilted' as const,
  categoryTiltAngle: effectiveTiltAngle.value,
  fontSize: textDivStyle.value.fontSize,
  originWidth: tablePosition.width,
  narrowMode: true
}))

const { autoColumnWidth: sparseColumnWidth } = useAutoInterval(sparseIntervalOptions)

const groupSize = computed(() => {
  if (!isNarrowMode.value || denseColumnWidth.value <= 0) return 1
  return Math.max(1, Math.round(sparseColumnWidth.value / denseColumnWidth.value))
})

const { observe } = useResizeObserver()

const computeCellHeight = (text: string, width: number, layout: 'horizontal' | 'vertical' | 'tilted', angle: number) => {
  return getDynamicCellStyle(text, width, layout, angle, textDivStyle.value.fontSize).height as number
}

const getCellGroups = (yAxis: YAxisTableItem, header: TableHeader) => {
  const values = getVisibleValues(yAxis.values)
  const groups: { text: string; width: number }[] = []
  const size = groupSize.value
  const cols = visibleCategories.value.map((_, idx) => idx).filter(idx => isDenseColumnVisible(idx))
  for (let i = 0; i < cols.length; i += size) {
    const chunk = cols.slice(i, i + size)
    const firstIdx = chunk[0]
    const text = String(values?.[firstIdx]?.[header.value] || '')
    groups.push({
      text,
      width: denseColumnWidth.value * chunk.length
    })
  }
  return groups
}

const getRowHeight = (yAxis: YAxisTableItem, header: TableHeader) => {
  const layout = getHeaderLayout(header.value)
  const angle = getHeaderTiltAngle(header.value)
  let maxH = computeCellHeight(header.label, tablePosition.marginLeft, layout, angle)
  const values = getVisibleValues(yAxis.values)
  if (isNarrowMode.value && layout !== 'vertical') {
    const groups = getCellGroups(yAxis, header)
    groups.forEach((g) => {
      const h = computeCellHeight(g.text, g.width, layout, angle)
      if (h > maxH) maxH = h
    })
  } else {
    const visibleFn = isNarrowMode.value ? isDenseColumnVisible : isColumnVisible
    const width = isNarrowMode.value ? denseColumnWidth.value : autoColumnWidth.value
    visibleCategories.value.forEach((_, idx) => {
      if (!visibleFn(idx)) return
      const text = String(values?.[idx]?.[header.value] || '')
      const h = computeCellHeight(text, width, layout, angle)
      if (h > maxH) maxH = h
    })
  }
  return maxH
}

const rowHeights = computed(() => {
  const heights: Record<string, number> = {}
  props.yAxisList?.forEach((yAxis, yIndex) => {
    yAxis.headers?.forEach((header) => {
      const key = `${yIndex}-${header.value}`
      heights[key] = getRowHeight(yAxis, header)
    })
  })
  return heights
})

const hideChartXAxis = () => {
  props.chart?.setOption({
    xAxis: {
      axisLabel: { show: false },
      axisTick: { show: false },
      axisLine: { show: false }
    }
  })
}

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

watch(
  () => props.chart,
  (chart) => {
    if (chart?.getDom()) {
      updateNarrowMode()
      observe(chart.getDom(), () => {
        calculateVisibleColumns()
        calculateDenseVisibleColumns()
        updateNarrowMode()
      })
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
