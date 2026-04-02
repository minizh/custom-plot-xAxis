<template>
  <div
    :style="{
      position: 'relative'
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
        :style="{
          width: `${tablePosition.marginLeft}px`,
          height: `${textDivStyle.height}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
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
    headers?: { value: string; label: string }[]
    chartData?: { categories: string[]; values: any[] }
    chart?: any
  }>(),
  {
    headers: () => []
  }
)

const tablePosition = ref({
  marginLeft: 0,
  width: 0
})

const visibleData = ref(null)

const textDivStyle = {
  layout: 'horizontal',
  height: 32,
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

  // 处理只有一条数据的情况
  let width = center2 - center1
  let marginLeft = left - width / 2
  if (visibleData.value?.categories?.length === 1 || !center2) {
    // 只有一条数据时，使用 grid 的宽度作为列宽，从 grid 左边缘开始
    const gridLeft = getConfiguredGridPx(chart, 0, 'left')
    const gridRight = getConfiguredGridPx(chart, 0, 'right')
    const chartWidth = chart.getDom().clientWidth
    width = chartWidth - gridLeft - gridRight
    marginLeft = gridLeft
  }

  tablePosition.value = {
    width: width,
    marginLeft: marginLeft
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
      width: 0
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
