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
import * as echarts from 'echarts'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import TableXAxis from './TableXAxis.vue'

const chartRef = ref(null)
const chartData = ref()
const chartInstance = ref()

// 生成30条随机数据
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

const initChart = () => {
  if (!chartRef.value) return
  // 初始化图表实例
  chartInstance.value = echarts.init(chartRef.value)
  const { categories, values } = chartData.value
  console.log(chartData)
  // 配置选项
  const option = {
    title: {
      text: '折线图示例',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      },
      formatter: (params) => {
        const { name, value } = params[0]
        return `waferId:${name},value:${value}`
      }
    },

    legend: {
      data: ['数值'],
      top: 30
    },
    grid: {
      left: '4%',
      right: '4%',
      bottom: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      // boundaryGap: false,
      data: categories,
      axisLabel: {
        rotate: 45
      }
    },
    yAxis: {
      type: 'value',
      name: '数值'
    },
    dataZoom: [
      {
        type: 'inside',
        xAxisIndex: 0,
        zoomOnMouseWheel: true, // 滚轮缩放（可关）
        moveOnMouseWheel: true, // 滚轮平移（重点）
        moveOnMouseMove: true,
        throttle: 100
      }
    ],
    series: [
      {
        name: '数值',
        type: 'line',
        data: values.map((item) => item.value),
        itemStyle: {
          color: '#409eff'
        }
      }
    ]
  }

  // 设置配置项并渲染图表
  chartInstance.value.setOption(option)
  // 响应式调整
  window.addEventListener('resize', handleResize)
}

const handleResize = () => {
  if (chartInstance.value) {
    chartInstance.value.resize()
  }
}

onMounted(() => {
  generateData()
  initChart()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  if (chartInstance.value) {
    chartInstance.value.dispose()
    chartInstance.value = null
  }
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
