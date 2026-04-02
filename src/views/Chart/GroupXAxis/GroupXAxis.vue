<template>
  <div
    v-if="xAxisPosition.width > 0 && groupByData.length > 0"
    class="group-x-axis"
    :style="{
      marginLeft: `${xAxisPosition.left}px`,
      width: `${xAxisPosition.width}px`
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
          v-for="(item, index) in data"
          :key="item.value"
          class="div-group"
          :style="{
            flex: showAxisCount <= 1 ? '0 0 100%' : `0 0 ${((item.count - 1) / (showAxisCount - 1)) * 100}%`
          }"
        >
          <div class="div-group-line" style="width: 100%"></div>
          <div class="div-center-text" style="width: 100%">
            <span class="div-center-text-span">
              {{ item.value }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  getConfiguredGridPx,
  getXAxisVisibleDomRange,
  sortAndGroupCount
} from '@/utils/chart-util'
import { reactive, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    groupBy: string[]
    sortBy?: string
    chartData?: any[]
    chart?: any
  }>(),
  {
    groupBy: () => []
  }
)

const xAxisPosition = reactive({
  width: 0,
  left: 0
})
const groupByData = ref([])
const showAxisCount = ref()

const setGroupByDataFn = (data) => {
  // groupBy
  // 这块可以交给后端来做
  console.log(data)
  const newGroupByData = []
  props.groupBy.forEach((item) => {
    const newData = sortAndGroupCount(
      [...data],
      'waferId',
      item,
      !!props.sortBy
    )
    newGroupByData.push(newData)
  })
  console.log(newGroupByData)
  groupByData.value = newGroupByData
}

const setXAxisPosition = () => {
  if (!props.chart) return
  // 判断是否显示
  const { point } = getXAxisVisibleDomRange(props.chart, 0)

  let width = point.width
  let left = point.left

  // 处理只有一条数据的情况
  if (props.chartData?.length === 1 || width === 0) {
    const gridLeft = getConfiguredGridPx(props.chart, 0, 'left')
    const gridRight = getConfiguredGridPx(props.chart, 0, 'right')
    const chartWidth = props.chart.getDom().clientWidth
    width = chartWidth - gridLeft - gridRight
    left = gridLeft
  }

  xAxisPosition.left = left
  xAxisPosition.width = width
}

const hideChartXAxis = () => {
  if (props.chart) {
    props.chart.setOption({
      xAxis: {
        axisLabel: { show: false },
        axisTick: { show: false },
        axisLine: { show: false }
      }
    })
  }
}

const updateVisibleData = () => {
  if (!props.chart || !props.chartData?.length) {
    return props.chartData || []
  }

  const opt = props.chart.getOption()
  const dz = opt.dataZoom?.[0]

  if (!dz || dz.start == null || dz.end == null) {
    return props.chartData
  }

  const start = dz.start
  const end = dz.end
  const total = props.chartData.length

  const startIndex = Math.max(0, Math.round((start / 100) * (total - 1)))
  const endIndex = Math.min(total - 1, Math.round((end / 100) * (total - 1)))

  return props.chartData.slice(startIndex, endIndex + 1)
}

const syncGroupXAxis = () => {
  if (props.chart && props.chartData?.length) {
    hideChartXAxis()
    setXAxisPosition()
    const visibleData = updateVisibleData()
    setGroupByDataFn(visibleData)
    showAxisCount.value = visibleData.length
  } else {
    groupByData.value = []
  }
}

watch(
  () => props.chart,
  (chart, oldChart, onCleanup) => {
    if (chart) {
      chart.on('dataZoom', syncGroupXAxis)
      syncGroupXAxis()
      onCleanup(() => {
        chart.off('dataZoom', syncGroupXAxis)
      })
    }
  }
)

watch(
  () => [props.chartData, props.groupBy, props.sortBy],
  () => {
    syncGroupXAxis()
  },
  {
    immediate: true
  }
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
    /* 水平居中 */
    align-items: center;

    /* transform: rotate(90deg); */
  }
}
</style>
