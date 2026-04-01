<template>
  <div
    :style="{
      transform: `translateY(-${tablePosition.transform}px)`
    }"
  >
    <div v-if="visibleData?.categories?.length" :style="{ display: 'flex' }">
      <div
        :style="{
          display: 'flex',
          marginLeft: `${tablePosition.marginLeft}px`
        }"
      >
        <div
          v-for="(item, index) in visibleData.categories"
          :key="`header-${item}-${index}`"
          class="table-cell-div"
          :style="{
            width: `${tablePosition.width}px`,
            height: `${textDivStyle.height}px`
          }"
        >
          <TextDiv
            :text="item"
            :layout="textDivStyle.layout"
            :width="tablePosition.width"
            :height="textDivStyle.height"
            :fontSize="textDivStyle.fontSize"
          />
        </div>
      </div>
    </div>
    <div
      v-if="headers.length"
      v-for="item in headers"
      :key="item.value"
      :style="{ display: 'flex' }"
    >
      <div
        class="table-cell-div"
        :style="{
          width: `${tablePosition.marginLeft}px`
        }"
      >
        {{ item.label }}
      </div>
      <div :style="{ display: 'flex' }">
        <div
          v-for="(category, index) in visibleData?.categories || []"
          :key="`cell-${category}-${item.value}-${index}`"
          class="table-cell-div"
          :style="{
            width: `${tablePosition.width}px`,
            height: `${textDivStyle.height}px`
          }"
        >
          <TextDiv
            :text="String(visibleData.values?.[index]?.[item.value] || '')"
            :layout="textDivStyle.layout"
            :width="tablePosition.width"
            :height="textDivStyle.height"
            :fontSize="textDivStyle.fontSize"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import TextDiv from '@/components/TextDiv/TextDiv.vue'
import {
  getConfiguredGridPx,
  getXAxisVisibleDomRange
} from '@/utils/chart-util'
import { ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    headers?: string[]
    chartData?: object
    chart?: any
  }>(),
  {
    headers: () => []
  }
)

const tablePosition = ref({
  marginLeft: 0,
  width: 0,
  transform: 0
})

const visibleData = ref(null)

const textDivStyle = {
  layout: 'vertical',
  height: 80,
  fontSize: 12
}

const hideChartXAxis = (chart) => {
  if (chart) {
    chart.setOption({
      xAxis: {
        axisLabel: { show: false },
        axisTick: { show: false },
        axisLine: { show: false }
      }
    })
  }
}

const setTablePosition = (chart) => {
  // 第一个点到最后一个点的距离
  const chartWidthRange = getXAxisVisibleDomRange(chart)
  const { point } = chartWidthRange
  const { left } = point
  const center1 = chart.convertToPixel({ xAxisIndex: 0 }, 0)
  const center2 = chart.convertToPixel({ xAxisIndex: 0 }, 1)
  const tranformPx = getConfiguredGridPx(chart, 0, 'bottom')

  console.log(tranformPx)
  tablePosition.value = {
    width: center2 - center1,
    marginLeft: left - (center2 - center1) / 2,
    transform: tranformPx
  }
}

const updateVisibleData = () => {
  if (!props.chart || !props.chartData?.categories?.length) {
    visibleData.value = props.chartData
    return
  }

  const opt = props.chart.getOption()
  const dz = opt.dataZoom?.[0]

  if (!dz || dz.start == null || dz.end == null) {
    visibleData.value = props.chartData
  } else {
    const start = dz.start
    const end = dz.end
    const total = props.chartData.categories.length

    const startIndex = Math.max(0, Math.round((start / 100) * (total - 1)))
    const endIndex = Math.min(total - 1, Math.round((end / 100) * (total - 1)))

    visibleData.value = {
      categories: props.chartData.categories.slice(startIndex, endIndex + 1),
      values: props.chartData.values.slice(startIndex, endIndex + 1)
    }
  }
}

const syncTable = () => {
  updateVisibleData()
  if (props.chart && visibleData.value?.categories?.length) {
    hideChartXAxis(props.chart)
    setTablePosition(props.chart)
  } else {
    tablePosition.value = {
      marginLeft: 0,
      width: 0,
      transform: 0
    }
  }
}

watch(
  () => props.chart,
  (chart, oldChart, onCleanup) => {
    if (chart) {
      chart.on('dataZoom', syncTable)
      syncTable()
      onCleanup(() => {
        chart.off('dataZoom', syncTable)
      })
    }
  }
)

watch(
  () => [props.chartData, props.headers],
  () => {
    console.log(props.chartData)
    syncTable()
  },
  {
    immediate: true
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
</style>
