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
import { useChartDemo } from '@/composables/useChartDemo'
import { ref } from 'vue'
import TableXAxis from './TableXAxis.vue'

const chartRef = ref(null)
const { chartInstance, setChartOption } = useECharts(chartRef)

/**
 * 生成演示数据：30 条 categories + 带 sum/avg 统计字段的 values
 */
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
  return { categories, values }
}

// 使用 Composable 统一处理数据生成和图表 option 设置
const { chartData } = useChartDemo(
  setChartOption,
  '折线图示例',
  generateData
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
</style>
