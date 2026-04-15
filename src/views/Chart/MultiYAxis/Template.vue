<template>
  <div class="chart-container">
    <el-button class="config-btn" type="primary" @click="dialogVisible = true">
      配置统计值表格
    </el-button>

    <div ref="chartRef" class="chart"></div>
    <MultiYAxisTable
      :chart="chartInstance"
      :categories="categories"
      :y-axis-list="computedYAxisList"
      :header-layouts="computedHeaderLayouts"
      :auto-interval="true"
      :show-category-row="false"
    />

    <el-dialog
      v-model="dialogVisible"
      title="统计值表格配置"
      width="720px"
      :close-on-click-modal="false"
    >
      <el-form label-position="top">
        <div class="config-section-title">统计值配置</div>
        <div
          v-for="(item, index) in statConfigs"
          :key="index"
          class="stat-config-row"
        >
          <div class="row-index">{{ index + 1 }}</div>
          <el-form-item label="Stat Func" class="flex-item">
            <el-select v-model="item.statFunc" style="width: 130px">
              <el-option
                v-for="opt in statFuncOptions"
                :key="opt"
                :label="opt"
                :value="opt"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="Orientation" class="flex-item">
            <el-radio-group v-model="item.orientation" size="small">
              <el-radio-button label="horizontal">Horizontal</el-radio-button>
              <el-radio-button label="vertical">Vertical</el-radio-button>
              <el-radio-button label="tilted">Stanted</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item
            v-if="item.orientation === 'tilted'"
            label="Angle"
            class="flex-item angle-item"
          >
            <el-input-number
              v-model="item.customAngle"
              :min="0"
              :max="90"
              size="small"
              style="width: 100px"
            />
          </el-form-item>
          <el-button
            type="danger"
            size="small"
            :disabled="statConfigs.length <= 1"
            @click="removeStatConfig(index)"
          >
            删除
          </el-button>
        </div>
        <el-button type="primary" size="small" @click="addStatConfig">
          + 新增配置
        </el-button>

        <div class="config-section-title" style="margin-top: 24px">
          背景色配置
        </div>
        <el-form-item>
          <el-radio-group v-model="bgColorMode">
            <el-radio label="gray">Gray</el-radio>
            <el-radio label="legend">Legend Color</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="dialogVisible = false">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { useECharts } from '@/composables/useECharts'
import { computed, onMounted, ref, watch } from 'vue'
import MultiYAxisTable from './MultiYAxisTable.vue'

const chartRef = ref(null)
const chartInstance = ref()
const { chartInstance: echartInstance, setChartOption } = useECharts(chartRef)

watch(echartInstance, (val) => {
  chartInstance.value = val
})

const categories = ref([])
const rawValues = ref([])
const dialogVisible = ref(false)
const bgColorMode = ref('gray')

const statFuncOptions = [
  'svg',
  'StdDev',
  'min',
  'max',
  'sum',
  'avg',
  'count',
  'uniqueCount'
]

const statConfigs = ref([
  { statFunc: 'sum', orientation: 'horizontal', customAngle: 45 },
  { statFunc: 'avg', orientation: 'horizontal', customAngle: 45 },
  { statFunc: 'max', orientation: 'horizontal', customAngle: 45 },
  { statFunc: 'min', orientation: 'horizontal', customAngle: 45 }
])

const legendColors = ['#5470c6', '#91cc75']

const addStatConfig = () => {
  statConfigs.value.push({
    statFunc: 'sum',
    orientation: 'horizontal',
    customAngle: 45
  })
}

const removeStatConfig = (index) => {
  if (statConfigs.value.length <= 1) return
  statConfigs.value.splice(index, 1)
}

const computedHeaders = computed(() => {
  return statConfigs.value.map((cfg, index) => ({
    value: cfg.statFunc + '_' + index,
    label: cfg.statFunc
  }))
})

const computedHeaderLayouts = computed(() => {
  const layouts = {}
  statConfigs.value.forEach((cfg, index) => {
    const key = cfg.statFunc + '_' + index
    layouts[key] = {
      layout: cfg.orientation,
      tiltAngle: cfg.orientation === 'tilted' ? cfg.customAngle || 0 : 0
    }
  })
  return layouts
})

const computedYAxisList = computed(() => {
  const headers = computedHeaders.value
  const baseValues = rawValues.value
  if (!baseValues.length || !headers.length) return []

  const values1 = baseValues.map((item) => {
    const obj = { name: item.name }
    headers.forEach((h) => {
      obj[h.value] = item[h.label] ?? ''
    })
    return obj
  })

  const values2 = baseValues.map((item) => {
    const obj = { name: item.name }
    headers.forEach((h) => {
      const raw = item[h.label] ?? 0
      obj[h.value] = Math.floor(raw * 1.5) + 10
    })
    return obj
  })

  const bg1 = bgColorMode.value === 'gray' ? '#f5f5f5' : legendColors[0]
  const bg2 = bgColorMode.value === 'gray' ? '#f5f5f5' : legendColors[1]

  return [
    {
      name: 'Y轴1-数值',
      headers,
      values: values1,
      bgColor: bg1
    },
    {
      name: 'Y轴2-比率',
      headers,
      values: values2,
      bgColor: bg2
    }
  ]
})

const generateData = () => {
  const cats = []
  const vals = []
  for (let i = 1; i <= 15; i++) {
    cats.push(`测试数据${i}`)
    vals.push({
      name: `测试数据${i}`,
      value: Math.floor(Math.random() * 100) + 20,
      svg: Math.floor(Math.random() * 100),
      StdDev: Math.floor(Math.random() * 100),
      min: Math.floor(Math.random() * 50),
      max: Math.floor(Math.random() * 100) + 50,
      sum: Math.floor(Math.random() * 1000),
      count: Math.floor(Math.random() * 100),
      uniqueCount: Math.floor(Math.random() * 50),
      avg: Math.floor(Math.random() * 100)
    })
  }
  categories.value = cats
  rawValues.value = vals
}

const getOption = () => ({
  title: { text: '多Y轴 + 统计值表示例', left: 'center' },
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'cross' }
  },
  legend: { data: ['数值', '比率'], top: 30 },
  grid: { left: '4%', right: '4%', bottom: '10%', containLabel: true },
  xAxis: {
    type: 'category',
    data: categories.value,
    axisLabel: { show: false },
    axisTick: { show: false },
    axisLine: { show: false }
  },
  yAxis: [
    {
      type: 'value',
      name: '数值',
      position: 'left',
      axisLine: { show: true, lineStyle: { color: legendColors[0] } },
      axisLabel: { color: legendColors[0] }
    },
    {
      type: 'value',
      name: '比率',
      position: 'right',
      axisLine: { show: true, lineStyle: { color: legendColors[1] } },
      axisLabel: { color: legendColors[1] }
    }
  ],
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
      yAxisIndex: 0,
      data: rawValues.value.map((item) => item.value),
      itemStyle: { color: legendColors[0] }
    },
    {
      name: '比率',
      type: 'line',
      yAxisIndex: 1,
      data: rawValues.value.map((item) => Math.floor(item.value * 1.8) + 20),
      itemStyle: { color: legendColors[1] }
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

.config-btn {
  margin-bottom: 12px;
}

.chart {
  width: 100%;
  height: 500px;
  min-height: 400px;
}

.config-section-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #303133;
}

.stat-config-row {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  margin-bottom: 12px;
  padding: 12px;
  background: #fafafa;
  border-radius: 4px;
}

.row-index {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e4e7ed;
  border-radius: 50%;
  font-weight: bold;
  font-size: 13px;
  margin-bottom: 18px;
  flex-shrink: 0;
}

.flex-item {
  margin-bottom: 0;
}

.angle-item {
  width: 100px;
}
</style>
