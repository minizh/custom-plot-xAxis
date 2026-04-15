<template>
  <div class="chart-container">
    <div class="config-panel">
      <h3>文本旋转配置</h3>
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
        <div
          v-if="groupXAxisConfig.labelLayout === 'tilted'"
          class="config-item"
        >
          <label>倾斜角度：</label>
          <input
            v-model.number="groupXAxisConfig.labelTiltAngle"
            type="number"
            min="0"
            max="90"
          />
          <span>° (逆时针旋转)</span>
        </div>
      </div>
      <div class="config-section">
        <h4>TableXAxis 标签旋转</h4>
        <div class="config-item">
          <label>自动间隔显示：</label>
          <input v-model="tableXAxisConfig.autoInterval" type="checkbox" />
          <span>（空间不足时自动间隔显示）</span>
        </div>
        <div class="config-item">
          <label>显示类别行：</label>
          <input v-model="tableXAxisConfig.showCategoryRow" type="checkbox" />
          <span>（是否显示 category 行）</span>
        </div>
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
          <div
            v-if="tableXAxisConfig.categoryLayout === 'tilted'"
            class="config-item"
          >
            <label>倾斜角度：</label>
            <input
              v-model.number="tableXAxisConfig.categoryTiltAngle"
              type="number"
              min="0"
              max="90"
            />
            <span>° (逆时针旋转)</span>
          </div>
        </div>
        <div
          v-for="header in tableHeaders"
          :key="header.value"
          class="config-subsection"
        >
          <h5>{{ header.label }} 列</h5>
          <div class="config-item">
            <label>旋转方向：</label>
            <select
              v-model="tableXAxisConfig.headerLayouts[header.value].layout"
            >
              <option value="horizontal">水平 (horizontal)</option>
              <option value="vertical">垂直 (vertical)</option>
              <option value="tilted">倾斜 (tilted)</option>
            </select>
          </div>
          <div
            v-if="
              tableXAxisConfig.headerLayouts[header.value].layout === 'tilted'
            "
            class="config-item"
          >
            <label>倾斜角度：</label>
            <input
              v-model.number="
                tableXAxisConfig.headerLayouts[header.value].tiltAngle
              "
              type="number"
              min="0"
              max="90"
            />
            <span>° (逆时针旋转)</span>
          </div>
        </div>
      </div>
    </div>
    <div class="chart-wrapper">
      <div ref="chartRef" class="chart"></div>
    </div>
    <div class="x-axis-container">
      <GroupXAxis
        :chart="chartInstance"
        :chart-data="chartData?.values || []"
        :group-by="['productId', 'lotId']"
        :sort-by="'waferId'"
        :label-layout="groupXAxisConfig.labelLayout"
        :label-tilt-angle="groupXAxisConfig.labelTiltAngle"
      />
      <TableXAxis
        :chart="chartInstance"
        :chart-data="chartData"
        :headers="tableHeaders"
        :category-layout="tableXAxisConfig.categoryLayout"
        :category-tilt-angle="tableXAxisConfig.categoryTiltAngle"
        :header-layouts="tableXAxisConfig.headerLayouts"
        :auto-interval="tableXAxisConfig.autoInterval"
        :show-category-row="tableXAxisConfig.showCategoryRow"
      />
    </div>
  </div>
</template>

<script setup>
import { useECharts } from '@/composables/useECharts'
import { onMounted, reactive, ref, watch } from 'vue'
import GroupXAxis from '../GroupXAxis/GroupXAxis.vue'
import TableXAxis from '../TableXAxis/TableXAxis.vue'
import './styles.css'

const chartRef = ref(null)
const chartData = ref()
const chartInstance = ref()
const { chartInstance: echartInstance, setChartOption } = useECharts(chartRef)

watch(echartInstance, (val) => {
  chartInstance.value = val
})

const tableHeaders = [
  { value: 'sum', label: 'sum' },
  { value: 'avg', label: 'avg' },
  { value: 'max', label: 'max' },
  { value: 'min', label: 'min' }
]

const groupXAxisConfig = reactive({
  labelLayout: 'horizontal',
  labelTiltAngle: 45
})

const tableXAxisConfig = reactive({
  autoInterval: true,
  showCategoryRow: true,
  categoryLayout: 'horizontal',
  categoryTiltAngle: 45,
  headerLayouts: {
    sum: { layout: 'horizontal', tiltAngle: 45 },
    avg: { layout: 'vertical', tiltAngle: 45 },
    max: { layout: 'tilted', tiltAngle: 45 },
    min: { layout: 'tilted', tiltAngle: 30 }
  }
})

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
}

const getOption = () => ({
  title: { text: '分组X轴 + 统计值表示例', left: 'center' },
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
    axisLabel: { show: false },
    axisTick: { show: false },
    axisLine: { show: false }
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
