<template>
  <div class="chart-container">
    <div ref="chartRef" class="chart"></div>
    <GroupXAxis
      :chart="chartInstance"
      :chart-data="xAxisData || []"
      :group-by="['waferId', 'lotId', 'productId']"
      :sort-by="'waferId'"
    />
  </div>
</template>

<script setup>
import { useECharts } from '@/composables/useECharts'
import { onMounted, ref } from 'vue'
import GroupXAxis from './GroupXAxis.vue'

const chartRef = ref(null)
const chartData = ref()
const xAxisData = ref()
const { chartInstance, setChartOption } = useECharts(chartRef)

const testData = [
  { productId: '0001A', lotId: '0001', waferId: '0001A01' },
  { productId: '0001A', lotId: '0001', waferId: '0001A02' },
  { productId: '0001A', lotId: '0002', waferId: '0001A03' },
  { productId: '0001A', lotId: '0002', waferId: '0001A04' },
  { productId: '0002A', lotId: '0003', waferId: '0001A05' },
  { productId: '0002A', lotId: '0003', waferId: '0001A06' },
  { productId: '0002A', lotId: '0003', waferId: '0001A07' },
  { productId: '0002A', lotId: '0003', waferId: '0001A08' },
  { productId: '0002A', lotId: '0004', waferId: '0001A09' },
  { productId: '0002A', lotId: '0004', waferId: '0001A10' }
]

const generateData = () => {
  const categories = []
  const values = []
  for (let i = 1; i <= 10; i++) {
    categories.push(`测试数据${i}`)
    values.push({
      ...testData[i - 1],
      value: Math.floor(Math.random() * 100) + 20
    })
  }
  chartData.value = { categories, values }
  xAxisData.value = values
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
