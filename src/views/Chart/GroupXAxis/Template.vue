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
import { useChartDemo } from '@/composables/useChartDemo'
import { ref, computed } from 'vue'
import GroupXAxis from './GroupXAxis.vue'

const chartRef = ref(null)
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

/**
 * 生成演示数据：categories + 带 waferId 等附加信息的 values
 */
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
  return { categories, values }
}

// 使用封装好的 Composable 处理数据生成和图表挂载
const { chartData, generateData: demoGenerateData } = useChartDemo(
  setChartOption,
  '折线图示例',
  generateData
)

// xAxisData 取 values 数组传给 GroupXAxis
const xAxisData = computed(() => chartData.value?.values || [])
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
