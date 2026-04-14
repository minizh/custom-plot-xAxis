<template>
  <div class="chart-container">
    <!-- 配置面板 -->
    <div class="config-panel">
      <h3>文本旋转配置</h3>
      
      <!-- GroupXAxis 配置 -->
      <div class="config-section">
        <h4>GroupXAxis 标签旋转</h4>
        <div class="config-item">
          <label>旋转方向：</label>
          <select v-model="groupXAxisConfig.labelLayout">
            <option value="horizontal">水平 (horizontal)</option>
            <option value="vertical">垂直 (vertical)</option>
            <option value="tilted">倾斜 (tilted)</option>
          </select>
        </div>
        <div class="config-item" v-if="groupXAxisConfig.labelLayout === 'tilted'">
          <label>倾斜角度：</label>
          <input 
            type="number" 
            v-model.number="groupXAxisConfig.labelTiltAngle" 
            min="0" 
            max="90" 
          />
          <span>° (逆时针旋转)</span>
        </div>
      </div>

      <!-- TableXAxis 配置 -->
      <div class="config-section">
        <h4>TableXAxis 标签旋转</h4>
        
        <!-- 自动间隔显示 -->
        <div class="config-item">
          <label>自动间隔显示：</label>
          <input 
            type="checkbox" 
            v-model="tableXAxisConfig.autoInterval" 
          />
          <span>（空间不足时自动间隔显示）</span>
        </div>

        <!-- 类别行配置 -->
        <div class="config-subsection">
          <h5>类别行 (categories)</h5>
          <div class="config-item">
            <label>旋转方向：</label>
            <select v-model="tableXAxisConfig.categoryLayout">
              <option value="horizontal">水平 (horizontal)</option>
              <option value="vertical">垂直 (vertical)</option>
              <option value="tilted">倾斜 (tilted)</option>
            </select>
          </div>
          <div class="config-item" v-if="tableXAxisConfig.categoryLayout === 'tilted'">
            <label>倾斜角度：</label>
            <input 
              type="number" 
              v-model.number="tableXAxisConfig.categoryTiltAngle" 
              min="0" 
              max="90" 
            />
            <span>° (逆时针旋转)</span>
          </div>
        </div>

        <!-- 每个 Header 独立配置 -->
        <div class="config-subsection" v-for="header in tableHeaders" :key="header.value">
          <h5>{{ header.label }} 行</h5>
          <div class="config-item">
            <label>旋转方向：</label>
            <select v-model="tableXAxisConfig.headerLayouts[header.value].layout">
              <option value="horizontal">水平 (horizontal)</option>
              <option value="vertical">垂直 (vertical)</option>
              <option value="tilted">倾斜 (tilted)</option>
            </select>
          </div>
          <div class="config-item" v-if="tableXAxisConfig.headerLayouts[header.value].layout === 'tilted'">
            <label>倾斜角度：</label>
            <input 
              type="number" 
              v-model.number="tableXAxisConfig.headerLayouts[header.value].tiltAngle" 
              min="0" 
              max="90" 
            />
            <span>° (逆时针旋转)</span>
          </div>
        </div>
      </div>
    </div>

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
        :label-layout="groupXAxisConfig.labelLayout"
        :label-tilt-angle="groupXAxisConfig.labelTiltAngle"
      />
      
      <!-- 统计值表格X轴 -->
      <TableXAxis
        :chart="chartInstance"
        :chart-data="chartData"
        :headers="tableHeaders"
        :category-layout="tableXAxisConfig.categoryLayout"
        :category-tilt-angle="tableXAxisConfig.categoryTiltAngle"
        :header-layouts="tableXAxisConfig.headerLayouts"
        :auto-interval="tableXAxisConfig.autoInterval"
      />
    </div>
  </div>
</template>

<script setup>
import * as echarts from 'echarts'
import { onBeforeUnmount, onMounted, ref, reactive } from 'vue'
import GroupXAxis from '../GroupXAxis/GroupXAxis.vue'
import TableXAxis from '../TableXAxis/TableXAxis.vue'

const chartRef = ref(null)
const chartData = ref()
const chartInstance = ref()
const xAxisData = ref()

// Table headers 配置
const tableHeaders = [
  { value: 'sum', label: 'sum' },
  { value: 'avg', label: 'avg' },
  { value: 'max', label: 'max' },
  { value: 'min', label: 'min' }
]

// GroupXAxis 配置
const groupXAxisConfig = reactive({
  labelLayout: 'horizontal',
  labelTiltAngle: 45
})

// TableXAxis 配置
const tableXAxisConfig = reactive({
  autoInterval: true,
  categoryLayout: 'horizontal',
  categoryTiltAngle: 45,
  headerLayouts: {
    sum: { layout: 'horizontal', tiltAngle: 45 },
    avg: { layout: 'vertical', tiltAngle: 45 },
    max: { layout: 'tilted', tiltAngle: 45 },
    min: { layout: 'tilted', tiltAngle: 30 }
  }
})

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

.config-panel {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.config-panel h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #303133;
}

.config-panel h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

.config-panel h5 {
  margin: 0 0 8px 0;
  font-size: 13px;
  color: #909399;
  font-weight: 500;
}

.config-section {
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e4e7ed;
}

.config-section:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.config-subsection {
  margin-bottom: 12px;
  padding: 8px;
  background: #fff;
  border-radius: 4px;
}

.config-item {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.config-item:last-child {
  margin-bottom: 0;
}

.config-item label {
  width: 120px;
  font-size: 14px;
  color: #606266;
}

.config-item select {
  padding: 6px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 14px;
}

.config-item input[type="number"] {
  width: 80px;
  padding: 6px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 14px;
}

.config-item input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.config-item span {
  margin-left: 8px;
  font-size: 14px;
  color: #909399;
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
