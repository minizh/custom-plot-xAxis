<template>
  <div :class="[`layout-${categoryLayout}`, { 'narrow-mode': isNarrowMode }]" :style="{ position: 'relative' }">
    <div
      v-if="showCategoryRow && visibleData?.categories?.length"
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
            v-for="(item, index) in visibleData.categories"
            :key="`header-${item}-${index}`"
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
            v-for="(item, index) in visibleData.categories"
            :key="`header-${item}-${index}`"
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
    <template v-if="headers.length">
      <div
        v-for="item in headers"
        :key="item.value"
        :style="{ display: 'flex' }"
      >
        <div
          class="table-cell-div table-label-cell"
          :style="getDynamicCellStyle(item.label, tablePosition.marginLeft, getHeaderLayout(item.value), getHeaderTiltAngle(item.value), textDivStyle.fontSize, rowHeights[item.value])"
        >
          <TextDiv
            :text="item.label"
            :layout="getHeaderLayout(item.value)"
            :width="tablePosition.marginLeft"
            :height="getDynamicCellStyle(item.label, tablePosition.marginLeft, getHeaderLayout(item.value), getHeaderTiltAngle(item.value), textDivStyle.fontSize, rowHeights[item.value]).height"
            :font-size="textDivStyle.fontSize"
            :tilt-angle="getHeaderTiltAngle(item.value)"
            :truncate="false"
          />
        </div>
        <div :style="{ display: 'flex' }">
          <template v-if="!isNarrowMode || getHeaderLayout(item.value) === 'vertical' || getHeaderLayout(item.value) === 'horizontal'">
            <template
              v-for="(category, index) in visibleData?.categories || []"
              :key="`cell-${category}-${item.value}-${index}`"
            >
              <div
                v-if="isNarrowMode ? isDenseColumnVisible(index) : isColumnVisible(index)"
                class="table-cell-div"
                :style="getDynamicCellStyle(String(visibleData.values?.[index]?.[item.value] || ''), isNarrowMode ? denseColumnWidth : autoColumnWidth, getHeaderLayout(item.value), getHeaderTiltAngle(item.value), textDivStyle.fontSize, rowHeights[item.value])"
              >
                <TextDiv
                  :text="String(visibleData.values?.[index]?.[item.value] || '')"
                  :layout="getHeaderLayout(item.value)"
                  :width="isNarrowMode ? denseColumnWidth : autoColumnWidth"
                  :height="getDynamicCellStyle(String(visibleData.values?.[index]?.[item.value] || ''), isNarrowMode ? denseColumnWidth : autoColumnWidth, getHeaderLayout(item.value), getHeaderTiltAngle(item.value), textDivStyle.fontSize, rowHeights[item.value]).height"
                  :font-size="textDivStyle.fontSize"
                  :tilt-angle="getHeaderTiltAngle(item.value)"
                  :truncate="false"
                />
              </div>
            </template>
          </template>
          <template v-else>
            <div
              v-for="(group, gIdx) in getCellGroups(item)"
              :key="`group-${item.value}-${gIdx}`"
              class="table-cell-div"
              :style="{
                ...getDynamicCellStyle(group.text, group.width, getHeaderLayout(item.value), getHeaderTiltAngle(item.value), textDivStyle.fontSize, rowHeights[item.value]),
                width: `${group.width}px`
              }"
            >
              <TextDiv
                :text="group.text"
                :layout="getHeaderLayout(item.value)"
                :width="group.width"
                :height="getDynamicCellStyle(group.text, group.width, getHeaderLayout(item.value), getHeaderTiltAngle(item.value), textDivStyle.fontSize, rowHeights[item.value]).height"
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

<script setup lang="ts">
import TextDiv from '@/components/TextDiv/TextDiv.vue'
import { useAutoInterval } from '@/composables/useAutoInterval'
import { useChartDataZoom } from '@/composables/useChartDataZoom'
import { useChartPosition } from '@/composables/useChartPosition'
import { useResizeObserver } from '@/composables/useResizeObserver'
import type { HeaderLayout, TableChartData, TableHeader } from '@/types/echarts'
import type { ECharts } from 'echarts'
import { computed, toRef, watch } from 'vue'
import { getDynamicCellStyle } from '@/utils/chart-util'

const props = withDefaults(
  defineProps<{
    headers?: TableHeader[]
    chartData?: TableChartData
    chart?: ECharts
    labelLayout?: 'horizontal' | 'vertical' | 'tilted'
    labelTiltAngle?: number
    categoryLayout?: 'horizontal' | 'vertical' | 'tilted'
    categoryTiltAngle?: number
    headerLayouts?: Record<string, HeaderLayout>
    autoInterval?: boolean
    showCategoryRow?: boolean
  }>(),
  {
    headers: () => [],
    chartData: undefined,
    chart: undefined,
    labelLayout: 'horizontal',
    labelTiltAngle: 45,
    categoryLayout: 'horizontal',
    categoryTiltAngle: 45,
    headerLayouts: () => ({}),
    autoInterval: true,
    showCategoryRow: true
  }
)

const chartRef = toRef(props, 'chart')
const chartDataRef = toRef(props, 'chartData')

const { visibleData } = useChartDataZoom(chartRef, chartDataRef)
const { tablePosition } = useChartPosition(
  chartRef,
  computed(() => visibleData.value?.categories?.length || 0)
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
  props.headers?.forEach((header) => {
    const layout = getHeaderLayout(header.value)
    if (layout === 'tilted') hasTilted = true
    if (layout === 'vertical') hasVertical = true
  })
  if (hasTilted) return 'tilted'
  if (hasVertical) return 'vertical'
  return props.categoryLayout
})

const effectiveTiltAngle = computed(() => {
  let maxAngle = props.categoryTiltAngle
  props.headers?.forEach((header) => {
    const layout = getHeaderLayout(header.value)
    if (layout === 'tilted') {
      const angle = getHeaderTiltAngle(header.value)
      if (angle > maxAngle) maxAngle = angle
    }
  })
  return maxAngle
})

const maxTextLength = computed(() => {
  const cats = visibleData.value?.categories || []
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
  totalColumns: visibleData.value?.categories?.length || 0,
  maxTextLength: maxTextLength.value,
  categoryLayout: effectiveCategoryLayout.value,
  categoryTiltAngle: effectiveTiltAngle.value,
  fontSize: textDivStyle.value.fontSize,
  originWidth: tablePosition.width,
  narrowMode: isNarrowMode.value
}))

const { autoColumnWidth, isColumnVisible, calculateVisibleColumns } =
  useAutoInterval(autoIntervalOptions)

// narrowMode dense grid
const denseIntervalOptions = computed(() => ({
  enabled: props.autoInterval && isNarrowMode.value,
  containerWidth: props.chart?.getDom()?.clientWidth || 0,
  marginLeft: tablePosition.marginLeft,
  totalColumns: visibleData.value?.categories?.length || 0,
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

// narrowMode sparse grid for merge count
const sparseIntervalOptions = computed(() => ({
  enabled: props.autoInterval && isNarrowMode.value,
  containerWidth: props.chart?.getDom()?.clientWidth || 0,
  marginLeft: tablePosition.marginLeft,
  totalColumns: visibleData.value?.categories?.length || 0,
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

const getCellGroups = (header: TableHeader) => {
  const groups: { text: string; width: number }[] = []
  const size = groupSize.value
  const cols = (visibleData.value?.categories || []).map((_, idx) => idx).filter(idx => isDenseColumnVisible(idx))
  for (let i = 0; i < cols.length; i += size) {
    const chunk = cols.slice(i, i + size)
    const firstIdx = chunk[0]
    const text = String(visibleData.value?.values?.[firstIdx]?.[header.value] || '')
    groups.push({
      text,
      width: denseColumnWidth.value * chunk.length
    })
  }
  return groups
}

const getRowHeight = (header: TableHeader) => {
  const layout = getHeaderLayout(header.value)
  const angle = getHeaderTiltAngle(header.value)
  let maxH = computeCellHeight('', tablePosition.marginLeft, layout, angle)
  if (isNarrowMode.value && layout !== 'vertical' && layout !== 'horizontal') {
    const groups = getCellGroups(header)
    groups.forEach((g) => {
      const h = computeCellHeight(g.text, g.width, layout, angle)
      if (h > maxH) maxH = h
    })
  } else {
    const visibleFn = isNarrowMode.value ? isDenseColumnVisible : isColumnVisible
    const width = isNarrowMode.value ? denseColumnWidth.value : autoColumnWidth.value
    const cats = visibleData.value?.categories || []
    cats.forEach((_, idx) => {
      if (!visibleFn(idx)) return
      const text = String(visibleData.value?.values?.[idx]?.[header.value] || '')
      const h = computeCellHeight(text, width, layout, angle)
      if (h > maxH) maxH = h
    })
  }
  return maxH
}

const rowHeights = computed(() => {
  const heights: Record<string, number> = {}
  props.headers?.forEach((header) => {
    heights[header.value] = getRowHeight(header)
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
  visibleData,
  (data) => {
    if (props.chart && data?.categories?.length) {
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
.table-cell-div {
  border: 1px solid #000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.table-label-cell {
  overflow: hidden;
}

.narrow-mode .table-cell-div {
  border-left: none;
  border-right: none;
}
</style>
