<template>
  <div :class="`layout-${categoryLayout}`" :style="{ position: 'relative' }">
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
        <template
          v-for="(item, index) in visibleData.categories"
          :key="`header-${item}-${index}`"
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
    <template v-if="headers.length">
      <div
        v-for="item in headers"
        :key="item.value"
        :style="{ display: 'flex' }"
      >
        <div
          class="table-cell-div table-label-cell"
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
            v-for="(category, index) in visibleData?.categories || []"
            :key="`cell-${category}-${item.value}-${index}`"
          >
            <div
              v-if="isColumnVisible(index)"
              class="table-cell-div"
              :style="{ width: `${autoColumnWidth}px` }"
            >
              <TextDiv
                :text="String(visibleData.values?.[index]?.[item.value] || '')"
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

<script setup lang="ts">
import TextDiv from '@/components/TextDiv/TextDiv.vue'
import { useAutoInterval } from '@/composables/useAutoInterval'
import { useChartDataZoom } from '@/composables/useChartDataZoom'
import { useChartPosition } from '@/composables/useChartPosition'
import { useResizeObserver } from '@/composables/useResizeObserver'
import type { HeaderLayout, TableChartData, TableHeader } from '@/types/echarts'
import type { ECharts } from 'echarts'
import { computed, toRef, watch } from 'vue'

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

const maxTextLength = computed(() => {
  const cats = visibleData.value?.categories || []
  return cats.reduce((max, cat) => Math.max(max, String(cat).length), 0)
})

const autoIntervalOptions = computed(() => ({
  enabled: props.autoInterval,
  containerWidth: props.chart?.getDom()?.clientWidth || 0,
  marginLeft: tablePosition.marginLeft,
  totalColumns: visibleData.value?.categories?.length || 0,
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
  visibleData,
  (data) => {
    if (props.chart && data?.categories?.length) {
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
</style>
