<template>
  <div
    v-if="xAxisPosition.width > 0 && groupByData.length > 0"
    :style="{
      position: 'relative',
      left: `${xAxisPosition.left}px`,
      width: `${xAxisPosition.width}px`,
      transform: `translateY(-${xAxisPosition.transform}px)`
    }"
  >
    <div v-for="(data, index) in groupByData" :key="index">
      <div
        v-if="data.length > 0"
        class="x-axis-item"
        :style="{
          gap: `${(1 / (showAxisCount - 1 || 1)) * 100}%`
        }"
      >
        <div
          v-for="(item, index) in data"
          :key="item.value"
          class="div-group"
          :style="{
            flex: `0 0 ${((item.count - 1) / (showAxisCount - 1)) * 100}%`
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
  left: 0,
  top: 0,
  transform: 0
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
  const tranformPx = getConfiguredGridPx(props.chart, 0, 'bottom')

  xAxisPosition.left = point.left
  xAxisPosition.width = point.width
  xAxisPosition.transform = tranformPx
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

watch(
  () => [props.chart, props.chartData, props.groupBy, props.sortBy],
  () => {
    if (props.chart && props.chartData?.length) {
      hideChartXAxis()
      setXAxisPosition()
      setGroupByDataFn(props.chartData)
      showAxisCount.value = props.chartData.length
    } else {
      groupByData.value = []
    }
  },
  {
    immediate: true
  }
)
</script>

<style scoped>
.chart-container {
  padding: 20px;
}

.chart {
  width: 100%;
  height: 500px;
  min-height: 400px;
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
