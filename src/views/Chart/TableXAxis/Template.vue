<template>
  <div class="chart-container">
    <div ref="chartRef" class="chart"></div>
    <TableXAxis
      :chart="chartInstance"
      :chart-data="chartData"
      :headers="[
        { value: 'sum', label: 'sum' },
        { value: 'avg', label: 'avg' }
      ]"
    />
  </div>
</template>

<script setup>
import { useECharts } from '@/composables/useECharts'
import { onMounted, ref } from 'vue'
import TableXAxis from './TableXAxis.vue'

const chartRef = ref(null)
const chartData = ref()
const { chartInstance, setChartOption } = useECharts(chartRef)

const generateData = () => {
  const categories = []
  const values = []
  for (let i = 1; i <= 30; i++) {
    categories.push(`测试数据${i}`)
    values.push({
      name: `测试数据${i}`,
      value: Math.floor(Math.random() * 100) + 20,
      sum: Math.floor(Math.random() * 100),
      avg: Math.floor(Math.random() * 100)
    })
  }
  chartData.value = { categories, values }
}

const getOption = () => ({
  title: { text: '折线图示例', left: 'center' },
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'cross' },
    formatter: (params) => {
      const { name, value } = params[0]
      return `waferId:${name},value:${value}`
    }
  },
  legend: { data: ['数值'], top: 30 },
  grid: { left: '4%', right: '4%', bottom: '10%', containLabel: true },
  xAxis: {
    type: 'category',
    data: chartData.value.categories,
    axisLabel: { rotate: 45 }
  },
  yAxis: { type: 'value', name: '数值' },
  dataZoom: [
    {
      type: 'inside',
      xAxisIndex: 0,
      zoomOnMouseWheel: true,
      moveOnMouseWheel: true,
      moveOnMouseMove: true,
      throttle: 100
    }
  ],
  series: [
    {
      name: '数值',
      type: 'line',
      data: chartData.value.values.map((item) => item.value),
      itemStyle: { color: '#409eff' }
    }
  ]
})

onMounted(() => {
  generateData()
  setChartOption(getOption())
})
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
</style>
