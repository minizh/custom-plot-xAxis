<template>
  <div class="chart-container">
    <el-button class="config-btn" type="primary" @click="dialogVisible = true">配置</el-button>
    <div ref="chartRef" class="chart"></div>
    <MultiYAxisTable
      :chart="chartInstance"
      :categories="categories"
      :y-axis-list="computedYAxisList"
      :header-layouts="computedHeaderLayouts"
      :auto-interval="true"
      :show-category-row="false"
    />
    <el-dialog v-model="dialogVisible" title="多Y轴统计值表格配置" width="720px" :close-on-click-modal="false">
      <el-form label-position="top">
        <div class="config-section-title">统计值配置</div>
        <div v-for="(item, index) in statConfigs" :key="index" class="stat-config-row">
          <div class="row-index">{{ index + 1 }}</div>
          <el-form-item label="Stat Func" class="flex-item"><el-select v-model="item.statFunc" style="width: 130px"><el-option v-for="opt in statFuncOptions" :key="opt" :label="opt" :value="opt"/></el-select></el-form-item>
          <el-form-item label="Orientation" class="flex-item"><el-radio-group v-model="item.orientation" size="small"><el-radio-button label="horizontal">Horizontal</el-radio-button><el-radio-button label="vertical">Vertical</el-radio-button><el-radio-button label="tilted">Stanted</el-radio-button></el-radio-group></el-form-item>
          <el-form-item v-if="item.orientation === 'tilted'" label="Angle" class="flex-item angle-item"><el-input-number v-model="item.customAngle" :min="0" :max="90" size="small" style="width: 100px"/></el-form-item>
          <el-form-item label="Format" class="flex-item"><el-input-number v-model="item.format" :min="0" :precision="0" size="small" style="width: 90px" placeholder="小数位"/></el-form-item>
          <el-button type="danger" size="small" :disabled="statConfigs.length <= 1" @click="removeStatConfig(index)">删除</el-button>
        </div>
        <el-button type="primary" size="small" @click="addStatConfig">+ 新增配置</el-button>
        <div class="config-section-title" style="margin-top: 24px">Y轴配置</div>
        <div v-for="(_label, index) in yAxisLabels" :key="index" class="yaxis-config-row">
          <div class="row-index">{{ index + 1 }}</div>
          <el-form-item label="Y轴 Label" class="flex-item"><el-input v-model="yAxisLabels[index]" style="width: 200px"/></el-form-item>
          <el-button type="danger" size="small" :disabled="yAxisLabels.length <= 1" @click="removeYAxisLabel(index)">删除</el-button>
        </div>
        <el-button type="primary" size="small" @click="addYAxisLabel">+ 新增Y轴</el-button>
        <div class="config-section-title" style="margin-top: 24px">背景色配置</div>
        <el-form-item><el-radio-group v-model="bgColorMode"><el-radio label="gray">Gray</el-radio><el-radio label="legend">Legend Color</el-radio></el-radio-group></el-form-item>
        <div class="config-section-title" style="margin-top: 24px">Color By 配置</div>
        <template v-if="yAxisLabels.length > 1">
          <div class="colorby-config-row"><div class="row-index">1</div><el-form-item label="字段" class="flex-item"><el-select v-model="colorByDisabledValue" disabled style="width: 200px"><el-option label="Y-Axis" value="Y-Axis"/></el-select></el-form-item></div>
        </template>
        <template v-else>
          <div v-for="(item, index) in colorByConfigs" :key="index" class="colorby-config-row">
            <div class="row-index">{{ index + 1 }}</div>
            <el-form-item label="字段" class="flex-item"><el-select v-model="item.field" style="width: 200px"><el-option v-for="opt in colorByFieldOptions" :key="opt" :label="opt" :value="opt"/></el-select></el-form-item>
            <el-button type="danger" size="small" @click="removeColorByConfig(index)">删除</el-button>
          </div>
          <el-button type="primary" size="small" @click="addColorByConfig">+ 新增 Color By</el-button>
        </template>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleConfirm">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { useECharts } from '@/composables/useECharts'
import { useMultiYAxisChart, type StatConfig } from '@/composables/useMultiYAxisChart'
import { onMounted, ref, watch } from 'vue'
import MultiYAxisTable from './MultiYAxisTable.vue'

const chartRef = ref<HTMLElement | null>(null)
const chartInstance = ref()
const { chartInstance: echartInstance, setChartOption } = useECharts(chartRef)
watch(echartInstance, (val) => { chartInstance.value = val })

const categories = ref<string[]>([])
const rawValues = ref<Record<string, unknown>[]>([])
const dialogVisible = ref(false)
const bgColorMode = ref<'gray' | 'legend'>('gray')

const statFuncOptions = ['svg', 'StdDev', 'min', 'max', 'sum', 'avg', 'count', 'uniqueCount']
const statConfigs = ref<StatConfig[]>([
  { statFunc: 'sum', orientation: 'vertical', customAngle: 0, format: undefined },
  { statFunc: 'avg', orientation: 'horizontal', customAngle: 45, format: 4 },
  { statFunc: 'max', orientation: 'tilted', customAngle: 45, format: 3 },
  { statFunc: 'min', orientation: 'horizontal', customAngle: 45, format: undefined }
])
const yAxisLabels = ref<string[]>(['数值', '比率'])
const colorByConfigs = ref<{ field: string }[]>([])
const colorByFieldOptions = ['productId', 'lotId', 'waferId', 'parameter', 'testProgram']
const colorByDisabledValue = ref('Y-Axis')

const addStatConfig = () => { statConfigs.value.push({ statFunc: 'sum', orientation: 'horizontal', customAngle: 45, format: undefined }) }
const removeStatConfig = (index: number) => { if (statConfigs.value.length > 1) statConfigs.value.splice(index, 1) }
const addYAxisLabel = () => { yAxisLabels.value.push(`Y轴${yAxisLabels.value.length + 1}`) }
const removeYAxisLabel = (index: number) => { if (yAxisLabels.value.length > 1) yAxisLabels.value.splice(index, 1) }
const addColorByConfig = () => { colorByConfigs.value.push({ field: colorByFieldOptions[0] || '' }) }
const removeColorByConfig = (index: number) => { colorByConfigs.value.splice(index, 1) }

const { computedYAxisList, computedHeaderLayouts, getOption } = useMultiYAxisChart({
  yAxisLabels, rawValues, statConfigs, colorByConfigs, bgColorMode
})

const generateBoxData = (center: number) => {
  const spread = Math.floor(Math.random() * 15) + 5
  const min = Math.max(0, center - spread * 2)
  const max = center + spread * 2
  return {
    min,
    q1: Math.floor(min + (center - min) * 0.25),
    median: center,
    q3: Math.floor(center + (max - center) * 0.25),
    max
  }
}

const generateData = () => {
  const cats: string[] = []
  const vals: Record<string, unknown>[] = []
  const productIds = ['P1', 'P2', 'P3']
  const lotIds = ['L1', 'L2', 'L3', 'L4']
  const waferIds = ['W1', 'W2', 'W3', 'W4', 'W5']
  const parameters = ['ParamA', 'ParamB', 'ParamC']
  const testPrograms = ['TP1', 'TP2']
  for (let i = 1; i <= 15; i++) {
    const baseValue = Math.floor(Math.random() * 100) + 20
    const item: Record<string, unknown> = {
      name: `测试数据${i}`, value: baseValue,
      productId: productIds[Math.floor(Math.random() * productIds.length)],
      lotId: lotIds[Math.floor(Math.random() * lotIds.length)],
      waferId: waferIds[Math.floor(Math.random() * waferIds.length)],
      parameter: parameters[Math.floor(Math.random() * parameters.length)],
      testProgram: testPrograms[Math.floor(Math.random() * testPrograms.length)],
      svg: Math.floor(Math.random() * 100), StdDev: Math.floor(Math.random() * 100),
      min: Math.floor(Math.random() * 50), max: Math.floor(Math.random() * 100) + 50,
      sum: Math.floor(Math.random() * 1000), count: Math.floor(Math.random() * 100),
      uniqueCount: Math.floor(Math.random() * 50), avg: Math.floor(Math.random() * 100)
    }
    const values: [string, number, number, number, number, number][] = []
    for (let j = 0; j < 10; j++) {
      const center = Math.floor(baseValue * (1 + j * 0.3)) + j * 10
      const bd = generateBoxData(center)
      values.push([`测试数据${i}`, bd.min, bd.q1, bd.median, bd.q3, bd.max])
    }
    item.values = values
    cats.push(`测试数据${i}`)
    vals.push(item)
  }
  categories.value = cats
  rawValues.value = vals
}

const handleConfirm = () => {
  setChartOption(getOption(), true)
  dialogVisible.value = false
}

onMounted(() => {
  generateData()
  setChartOption(getOption())
})
</script>

<style scoped>
.chart-container { padding: 20px; }
.config-btn { margin-bottom: 12px; }
.chart { width: 100%; height: 500px; min-height: 400px; }
.config-section-title { font-size: 16px; font-weight: 600; margin-bottom: 12px; color: #303133; }
.stat-config-row, .yaxis-config-row, .colorby-config-row {
  display: flex; align-items: flex-end; gap: 12px; margin-bottom: 12px; padding: 12px; background: #fafafa; border-radius: 4px;
}
.row-index {
  width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
  background: #e4e7ed; border-radius: 50%; font-weight: bold; font-size: 13px; margin-bottom: 18px; flex-shrink: 0;
}
.flex-item { margin-bottom: 0; }
.angle-item { width: 100px; }
</style>
