<template>
  <div class="chart-container">
    <!-- 图表区域 -->
    <div class="chart-wrapper">
      <div ref="chartRef" class="chart"></div>
    </div>
    
    <!-- 自定义X轴区域 - 位于图表下方 -->
    <div class="x-axis-container">
      <!-- 分组X轴 -->
      <GroupXAxis
        :chart="chartInstance"
        :chart-data="xAxisData"
        :group-by="['productId', 'lotId']"
        :sort-by="'waferId'"
      />
      
      <!-- 统计值表格X轴 -->
      <TableXAxis
        :chart="chartInstance"
        :chart-data="chartData"
        :headers="[
          { value: 'sum', label: 'sum' },
          { value: 'avg', label: 'avg' },
          { value: 'max', label: 'max' },
          { value: 'min', label: 'min' }
        ]"
      />
    </div>
  </div>
</template>

<script setup>
import * as echarts from 'echarts'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import GroupXAxis from '../GroupXAxis/GroupXAxis.vue'
import TableXAxis from '../TableXAxis/TableXAxis.vue'

const chartRef = ref(null)
const chartData = ref()
const chartInstance = ref()
const xAxisData = ref()

// 测试数据
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
  { productId: '0002A', lotId: '0004', waferId: '0001A10' },
  { productId: '0003A', lotId: '0005', waferId: '0001A11' },
  { productId: '0003A', lotId: '0005', waferId: '0001A12' },
  { productId: '0003A', lotId: '0006', waferId: '0001A13' },
  { productId: '0003A', lotId: '0006', waferId: '0001A14' },
  { productId: '0003A', lotId: '0006', waferId: '0001A15' }
]

// 生成数据
const generateData = () => {
  const categories = []
  const values = []
  for (let i = 0; i < testData.length; i++) {
    categories.push(testData[i].waferId)
    values.push({
      ...testData[i],
      name: testData[i].waferId,
      value: Math.floor(Math.random() * 100) + 20,
      sum: Math.floor(Math.random() * 1000),
      avg: Math.floor(Math.random() * 100),
      max: Math.floor(Math.random() * 100) + 50,
      min: Math.floor(Math.random() * 50)
    })
  }

  chartData.value = { categories, values }
  xAxisData.value = values
}

const initChart = () => {
  if (!chartRef.value) return
  chartInstance.value = echarts.init(chartRef.value)
  const { categories, values } = chartData.value

  const option = {
    title: {
      text: '分组X轴 + 统计值表格 示例',
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
      data: categories,
      axisLabel: {
        show: false
      },
      axisTick: {
        show: false
      },
      axisLine: {
        show: false
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
        data: values.map((item) => item.value),
        itemStyle: {
          color: '#409eff'
        }
      }
    ]
  }

  chartInstance.value.setOption(option)
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
  display: flex;
  flex-direction: column;
}

.chart-wrapper {
  width: 100%;
  height: 400px;
}

.chart {
  width: 100%;
  height: 100%;
}

.x-axis-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
