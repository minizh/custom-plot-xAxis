<template>
  <div
    v-if="groupPosition.width > 0 && groupByData.length > 0"
    class="group-x-axis"
    :style="{
      marginLeft: `${groupPosition.left}px`,
      width: `${groupPosition.width}px`
    }"
  >
    <div v-for="(data, index) in groupByData" :key="index">
      <div
        v-if="data.length > 0"
        class="x-axis-item"
        :style="{
          gap: showAxisCount <= 1 ? '0%' : `${(1 / (showAxisCount - 1)) * 100}%`
        }"
      >
        <div
          v-for="item in data"
          :key="String(item.value)"
          class="div-group"
          :style="{
            flex:
              showAxisCount <= 1
                ? '0 0 100%'
                : `0 0 ${((item.count - 1) / (showAxisCount - 1)) * 100}%`
          }"
        >
          <div class="div-group-line" style="width: 100%"></div>
          <div
            class="div-center-text"
            :class="`layout-${labelLayout}`"
            :style="{
              width: '100%',
              transform:
                labelLayout === 'tilted'
                  ? `rotate(-${labelTiltAngle}deg)`
                  : undefined
            }"
          >
            <span class="div-center-text-span" :title="String(item.value)">
              {{ item.value }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useChartDataZoom } from '@/composables/useChartDataZoom'
import { useChartPosition } from '@/composables/useChartPosition'
import { useGroupByData } from '@/composables/useGroupByData'
import { hideChartXAxis } from '@/composables/useChartCommon'
import type { ChartDataItem } from '@/types/echarts'
import type { ECharts } from 'echarts'
import { computed, toRef, watch, type Ref } from 'vue'

const props = withDefaults(
  defineProps<{
    groupBy: string[]
    sortBy?: string
    chartData?: ChartDataItem[]
    chart?: ECharts
    labelLayout?: 'horizontal' | 'vertical' | 'tilted'
    labelTiltAngle?: number
  }>(),
  {
    groupBy: () => [],
    sortBy: undefined,
    chartData: () => [],
    chart: undefined,
    labelLayout: 'horizontal',
    labelTiltAngle: 45
  }
)

const chartRef = toRef(props, 'chart')
const chartDataRef = toRef(props, 'chartData') as Ref<ChartDataItem[]>
const groupByRef = toRef(props, 'groupBy')
const sortByRef = toRef(props, 'sortBy')

// 监听 dataZoom，获取当前可见的数据切片
const { visibleData } = useChartDataZoom(chartRef, chartDataRef)

// 对可见数据按 groupBy 字段进行分组计数
const { groupByData } = useGroupByData(groupByRef, sortByRef, visibleData)

// 同步图表网格位置，用于精确定位自定义分组轴的 left/width
const { groupPosition } = useChartPosition(
  chartRef,
  computed(() => (visibleData.value as ChartDataItem[])?.length || 0)
)

// 当前可见的数据点数量
const showAxisCount = computed(
  () => (visibleData.value as ChartDataItem[])?.length || 0
)

// 当有可见数据时，隐藏 ECharts 原生的 X 轴标签/刻度/轴线
watch(
  visibleData,
  (data) => {
    if (props.chart && data && (data as ChartDataItem[]).length > 0) {
      hideChartXAxis(props.chart)
    } else {
      groupByData.value = []
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.group-x-axis {
  position: relative;
  box-sizing: border-box;
}

.x-axis-item {
  display: flex;
  width: 100%;
}

.div-group {
  min-width: 0;
  box-sizing: border-box;
  margin-bottom: 4px;
}

.div-group-line {
  height: 10px;
  min-width: 0;
  margin-bottom: 4px;
  background-color: inherit;
  border: 1px solid #000;
  border-top: none;
}

.div-center-text {
  min-width: 0;
  display: flex;
  justify-content: center;
  align-items: center;
}

.layout-horizontal .div-center-text-span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.layout-vertical {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  justify-content: flex-start;
}

.layout-vertical .div-center-text-span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.layout-tilted {
  justify-content: flex-end;
  align-items: flex-start;
  padding-top: 4px;
}

.layout-tilted .div-center-text-span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
