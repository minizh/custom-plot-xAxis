<template>
  <div :class="`layout-${categoryLayout}`" :style="{ position: 'relative' }">
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
            <template
              v-for="(item, index) in visibleCategories"
              :key="`header-${yIndex}-${item}-${index}`"
            >
              <div
                v-if="isColumnVisible(index)"
                class="table-cell-div"
                :style="{ width: `${autoColumnWidth}px` }"
              >
                <TextDiv
                  :text="item"
                  :layout="categoryLayout"
                  :width="autoColumnWidth"
                  :height="32"
                  :font-size="textDivStyle.fontSize"
                  :tilt-angle="categoryTiltAngle"
                  :truncate="false"
                />
              </div>
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
              :style="{ width: `${tablePosition.marginLeft}px` }"
            >
              <TextDiv
                :text="item.label"
                :layout="getHeaderLayout(item.value)"
                :width="tablePosition.marginLeft"
                :height="32"
                :font-size="textDivStyle.fontSize"
                :tilt-angle="getHeaderTiltAngle(item.value)"
              />
            </div>
            <div :style="{ display: 'flex' }">
              <template
                v-for="(category, index) in visibleCategories"
                :key="`cell-${yIndex}-${category}-${item.value}-${index}`"
              >
                <div
                  v-if="isColumnVisible(index)"
                  class="table-cell-div"
                  :style="{
                    width: `${autoColumnWidth}px`,
                    backgroundColor: yAxis.bgColor || 'transparent'
                  }"
                >
                  <TextDiv
                    :text="String(getVisibleValues(yAxis.values)?.[index]?.[item.value] || '')"
                    :layout="getHeaderLayout(item.value)"
                    :width="autoColumnWidth"
                    :height="32"
                    :font-size="textDivStyle.fontSize"
                    :tilt-angle="getHeaderTiltAngle(item.value)"
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

const maxTextLength = computed(() => {
  const cats = visibleCategories.value || []
  return cats.reduce((max, cat) => Math.max(max, String(cat).length), 0)
})

const autoIntervalOptions = computed(() => ({
  enabled: props.autoInterval,
  containerWidth: props.chart?.getDom()?.clientWidth || 0,
  marginLeft: tablePosition.marginLeft,
  totalColumns: visibleCategories.value?.length || 0,
  maxTextLength: maxTextLength.value,
  categoryLayout: props.categoryLayout,
  categoryTiltAngle: props.categoryTiltAngle,
  fontSize: textDivStyle.value.fontSize,
  originWidth: tablePosition.width
}))

const { autoColumnWidth, isColumnVisible, calculateVisibleColumns } =
  useAutoInterval(autoIntervalOptions)

const { observe } = useResizeObserver()

const getHeaderLayout = (
  headerValue: string
): 'horizontal' | 'vertical' | 'tilted' => {
  return props.headerLayouts[headerValue]?.layout || props.labelLayout
}

const getHeaderTiltAngle = (headerValue: string): number => {
  return props.headerLayouts[headerValue]?.tiltAngle ?? props.labelTiltAngle
}

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
    }
  },
  { immediate: true }
)

watch(
  () => props.chart,
  (chart) => {
    if (chart?.getDom()) {
      observe(chart.getDom(), calculateVisibleColumns)
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
  padding: 2px 0;
}

.layout-vertical .table-cell-div,
.layout-tilted .table-cell-div {
  padding: 6px 0;
}

.table-label-cell {
  overflow: hidden;
}

.table-cell-div.no-bg-no-border {
  background-color: transparent !important;
  border: none;
}
</style>
