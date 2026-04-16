<template>
  <div class="chart-container">
    <el-button class="config-btn" type="primary" @click="dialogVisible = true">
      配置
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
      title="多Y轴统计值表格配置"
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
          <el-form-item label="Format" class="flex-item">
            <el-input-number
              v-model="item.format"
              :min="0"
              :precision="0"
              size="small"
              style="width: 90px"
              placeholder="小数位"
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
          Y轴配置
        </div>
        <div
          v-for="(label, index) in yAxisLabels"
          :key="index"
          class="yaxis-config-row"
        >
          <div class="row-index">{{ index + 1 }}</div>
          <el-form-item label="Y轴 Label" class="flex-item">
            <el-input v-model="yAxisLabels[index]" style="width: 200px" />
          </el-form-item>
          <el-button
            type="danger"
            size="small"
            :disabled="yAxisLabels.length <= 1"
            @click="removeYAxisLabel(index)"
          >
            删除
          </el-button>
        </div>
        <el-button type="primary" size="small" @click="addYAxisLabel">
          + 新增Y轴
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

        <div class="config-section-title" style="margin-top: 24px">
          Color By 配置
        </div>
        <template v-if="yAxisLabels.length > 1">
          <div class="colorby-config-row">
            <div class="row-index">1</div>
            <el-form-item label="字段" class="flex-item">
              <el-select v-model="colorByDisabledValue" disabled style="width: 200px">
                <el-option label="Y-Axis" value="Y-Axis" />
              </el-select>
            </el-form-item>
          </div>
        </template>
        <template v-else>
          <div
            v-for="(item, index) in colorByConfigs"
            :key="index"
            class="colorby-config-row"
          >
            <div class="row-index">{{ index + 1 }}</div>
            <el-form-item label="字段" class="flex-item">
              <el-select v-model="item.field" style="width: 200px">
                <el-option
                  v-for="opt in colorByFieldOptions"
                  :key="opt"
                  :label="opt"
                  :value="opt"
                />
              </el-select>
            </el-form-item>
            <el-button
              type="danger"
              size="small"
              @click="removeColorByConfig(index)"
            >
              删除
            </el-button>
          </div>
          <el-button type="primary" size="small" @click="addColorByConfig">
            + 新增 Color By
          </el-button>
        </template>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleConfirm">确定</el-button>
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

// 将 echarts 实例同步到本地 ref，供子组件（MultiYAxisTable）使用
watch(echartInstance, (val) => {
  chartInstance.value = val
})

const categories = ref([])
const rawValues = ref([])
const dialogVisible = ref(false)
const bgColorMode = ref('gray')

// 可选的统计函数列表
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

// 统计列配置（决定 MultiYAxisTable 中显示哪些列及其布局）
const statConfigs = ref([
  { statFunc: 'sum', orientation: 'horizontal', customAngle: 45, format: undefined },
  { statFunc: 'avg', orientation: 'horizontal', customAngle: 45, format: undefined },
  { statFunc: 'max', orientation: 'horizontal', customAngle: 45, format: undefined },
  { statFunc: 'min', orientation: 'horizontal', customAngle: 45, format: undefined }
])

// Y轴标签配置
const yAxisLabels = ref(['数值', '比率'])

// ECharts 默认色系，用于多 Y 轴的配色
const legendColors = [
  '#5470c6',
  '#91cc75',
  '#fac858',
  '#ee6666',
  '#73c0de',
  '#3ba272',
  '#fc8452',
  '#9a60b4'
]

// ========== 颜色生成算法 ==========
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 0, g: 0, b: 0 }
}

const rgbToHex = (r, g, b) => {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = Math.round(x).toString(16)
        return hex.length === 1 ? '0' + hex : hex
      })
      .join('')
  )
}

const rgbToHsl = (r, g, b) => {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h, s
  const l = (max + min) / 2

  if (max === min) {
    h = s = 0
  } else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h /= 6
  }
  return { h: h * 360, s: s * 100, l: l * 100 }
}

const hslToRgb = (h, s, l) => {
  h /= 360
  s /= 100
  l /= 100
  let r, g, b
  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }
  return { r: r * 255, g: g * 255, b: b * 255 }
}

/**
 * 以基准色谱生成足够数量的颜色
 * 超出基准色数量的部分，按色谱从左到右依次生成深浅交替的变体
 */
const generateColors = (count) => {
  if (count <= legendColors.length) return legendColors.slice(0, count)
  const result = [...legendColors]
  let round = 1
  while (result.length < count) {
    for (let i = 0; i < legendColors.length && result.length < count; i++) {
      const rgb = hexToRgb(legendColors[i])
      const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
      const delta = round * 12
      if (round % 2 === 1) {
        hsl.l = Math.max(10, hsl.l - delta)
      } else {
        hsl.l = Math.min(90, hsl.l + delta)
      }
      const newRgb = hslToRgb(hsl.h, hsl.s, hsl.l)
      result.push(rgbToHex(newRgb.r, newRgb.g, newRgb.b))
    }
    round++
  }
  return result
}
// =================================

const addStatConfig = () => {
  statConfigs.value.push({
    statFunc: 'sum',
    orientation: 'horizontal',
    customAngle: 45,
    format: undefined
  })
}

const removeStatConfig = (index) => {
  if (statConfigs.value.length <= 1) return
  statConfigs.value.splice(index, 1)
}

const addYAxisLabel = () => {
  yAxisLabels.value.push(`Y轴${yAxisLabels.value.length + 1}`)
}

const removeYAxisLabel = (index) => {
  if (yAxisLabels.value.length <= 1) return
  yAxisLabels.value.splice(index, 1)
}

// Color By 配置
const colorByConfigs = ref([])
const colorByFieldOptions = ['productId', 'lotId', 'waferId', 'parameter', 'testProgram']
const colorByDisabledValue = ref('Y-Axis')

const addColorByConfig = () => {
  const defaultField = colorByFieldOptions[0] || ''
  colorByConfigs.value.push({ field: defaultField })
}

const removeColorByConfig = (index) => {
  colorByConfigs.value.splice(index, 1)
}

/**
 * 计算传给表格组件的 headers（基于 statConfigs）
 */
const computedHeaders = computed(() => {
  return statConfigs.value.map((cfg, index) => ({
    value: cfg.statFunc + '_' + index,
    label: cfg.statFunc,
    format: cfg.format
  }))
})

/**
 * 判断是否处于 Color By 模式
 */
const isColorByMode = computed(() => {
  return yAxisLabels.value.length === 1 && colorByConfigs.value.length > 0
})

/**
 * 根据 colorByConfigs 提取一条数据的分组 key
 */
const getColorByKey = (item) => {
  return colorByConfigs.value
    .map((cfg) => String(item[cfg.field] ?? ''))
    .join(' | ')
}

/**
 * 计算 Color By 分组映射
 * 相同字段组合的数据分配同一种颜色，不同组合按顺序循环使用图例色
 */
const colorByGroupMap = computed(() => {
  if (!isColorByMode.value || !rawValues.value.length) return null
  const map = new Map() // key -> colorIndex
  rawValues.value.forEach((item) => {
    const key = getColorByKey(item)
    if (!map.has(key)) {
      map.set(key, map.size)
    }
  })
  return map
})

/**
 * 计算 Color By 分段背景色
 */
const computedCellBgColors = computed(() => {
  if (!colorByGroupMap.value || !rawValues.value.length) return undefined
  const map = colorByGroupMap.value
  const resolvedColors = generateColors(map.size)
  return rawValues.value.map((item) => {
    const key = getColorByKey(item)
    const colorIndex = map.get(key) ?? 0
    return resolvedColors[colorIndex]
  })
})

/**
 * 计算 Color By 图例分组
 */
const computedColorByGroups = computed(() => {
  if (!colorByGroupMap.value) return []
  const map = colorByGroupMap.value
  const resolvedColors = generateColors(map.size)
  const groups = []
  map.forEach((colorIndex, key) => {
    groups.push({ name: key, color: resolvedColors[colorIndex] })
  })
  return groups
})

/**
 * 计算传给表格组件的各列布局配置
 */
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

/**
 * 计算多 Y 轴表格所需的数据列表
 * 每个 Y 轴对应一组 values 和背景色
 */
const computedYAxisList = computed(() => {
  const headers = computedHeaders.value
  const baseValues = rawValues.value
  const labels = yAxisLabels.value
  if (!baseValues.length || !headers.length || !labels.length) return []

  const resolvedColors = generateColors(labels.length)

  return labels.map((label, idx) => {
    const values = baseValues.map((item) => {
      const obj = { name: item.name }
      headers.forEach((h) => {
        const raw = item[h.label] ?? 0
        // 为不同 Y 轴引入差异化数据，使折线不重叠
        let val = Math.floor(raw * (1 + idx * 0.3)) + idx * 10
        if (h.format !== undefined && h.format !== null) {
          val = Number(val).toFixed(h.format)
        }
        obj[h.value] = val
      })
      return obj
    })

    const bgColor =
      bgColorMode.value === 'gray'
        ? '#f5f5f5'
        : resolvedColors[idx]

    return {
      name: label,
      headers,
      values,
      bgColor,
      cellBgColors: bgColorMode.value === 'legend' ? computedCellBgColors.value : undefined
    }
  })
})

const generateBoxData = (center) => {
  const spread = Math.floor(Math.random() * 15) + 5
  const min = Math.max(0, center - spread * 2)
  const max = center + spread * 2
  const q1 = Math.floor(min + (center - min) * 0.25)
  const median = center
  const q3 = Math.floor(center + (max - center) * 0.25)
  return { min, q1, median, q3, max }
}

/**
 * 生成演示数据：15 条测试数据，附带各类统计字段
 */
const generateData = () => {
  const cats = []
  const vals = []
  const productIds = ['P1', 'P2', 'P3']
  const lotIds = ['L1', 'L2', 'L3', 'L4']
  const waferIds = ['W1', 'W2', 'W3', 'W4', 'W5']
  const parameters = ['ParamA', 'ParamB', 'ParamC']
  const testPrograms = ['TP1', 'TP2']

  for (let i = 1; i <= 15; i++) {
    const baseValue = Math.floor(Math.random() * 100) + 20
    const item = {
      name: `测试数据${i}`,
      value: baseValue,
      productId: productIds[Math.floor(Math.random() * productIds.length)],
      lotId: lotIds[Math.floor(Math.random() * lotIds.length)],
      waferId: waferIds[Math.floor(Math.random() * waferIds.length)],
      parameter: parameters[Math.floor(Math.random() * parameters.length)],
      testProgram: testPrograms[Math.floor(Math.random() * testPrograms.length)],
      svg: Math.floor(Math.random() * 100),
      StdDev: Math.floor(Math.random() * 100),
      min: Math.floor(Math.random() * 50),
      max: Math.floor(Math.random() * 100) + 50,
      sum: Math.floor(Math.random() * 1000),
      count: Math.floor(Math.random() * 100),
      uniqueCount: Math.floor(Math.random() * 50),
      avg: Math.floor(Math.random() * 100)
    }
    for (let j = 0; j < 10; j++) {
      const center = Math.floor(baseValue * (1 + j * 0.3)) + j * 10
      const bd = generateBoxData(center)
      item[`box_${j}_min`] = bd.min
      item[`box_${j}_q1`] = bd.q1
      item[`box_${j}_median`] = bd.median
      item[`box_${j}_q3`] = bd.q3
      item[`box_${j}_max`] = bd.max
    }
    cats.push(`测试数据${i}`)
    vals.push(item)
  }
  categories.value = cats
  rawValues.value = vals
}

/**
 * 构建 ECharts option：包含多个 Y 轴和对应的 boxplot 系列
 * 使用 dataset 模式（对象数组）组织数据
 */
const getBoxEncode = (idx) => {
  return [
    `box_${idx}_min`,
    `box_${idx}_q1`,
    `box_${idx}_median`,
    `box_${idx}_q3`,
    `box_${idx}_max`
  ]
}

const getOption = () => {
  const labels = yAxisLabels.value

  // Color By 模式且使用 Legend Color：单 Y 轴 + 箱体按 Color By 着色 + 分组图例
  if (isColorByMode.value && bgColorMode.value === 'legend') {
    const colorByGroups = computedColorByGroups.value
    const series = [
      {
        name: labels[0],
        type: 'boxplot',
        datasetIndex: 0,
        encode: { x: 'name', y: getBoxEncode(0) },
        itemStyle: {
          color: (params) =>
            computedCellBgColors.value?.[params.dataIndex] || '#5470c6'
        }
      },
      ...colorByGroups.map((g) => ({
        name: g.name,
        type: 'line',
        data: [],
        itemStyle: { color: g.color }
      }))
    ]

    return {
      title: { text: '多Y轴 + 统计值表示例', left: 'center' },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' }
      },
      legend: { data: colorByGroups.map((g) => g.name), top: 30 },
      dataset: { source: rawValues.value },
      grid: { left: '4%', right: '4%', bottom: '10%', containLabel: true },
      xAxis: {
        type: 'category',
        axisLabel: { show: false },
        axisTick: { show: false },
        axisLine: { show: false }
      },
      yAxis: [
        {
          type: 'value',
          name: labels[0],
          position: 'left',
          axisLine: {
            show: true,
            lineStyle: { color: legendColors[0] }
          },
          axisLabel: { color: legendColors[0] }
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
      series
    }
  }

  // 默认多 Y 轴模式
  const resolvedColors = generateColors(labels.length)
  const yAxis = labels.map((label, idx) => ({
    type: 'value',
    name: label,
    position: idx % 2 === 0 ? 'left' : 'right',
    axisLine: {
      show: true,
      lineStyle: { color: resolvedColors[idx] }
    },
    axisLabel: { color: resolvedColors[idx] }
  }))

  const series = labels.map((label, idx) => ({
    name: label,
    type: 'boxplot',
    datasetIndex: 0,
    yAxisIndex: idx,
    encode: { x: 'name', y: getBoxEncode(idx) },
    itemStyle: { color: resolvedColors[idx] }
  }))

  return {
    title: { text: '多Y轴 + 统计值表示例', left: 'center' },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' }
    },
    legend: { data: labels, top: 30 },
    dataset: { source: rawValues.value },
    grid: { left: '4%', right: '4%', bottom: '10%', containLabel: true },
    xAxis: {
      type: 'category',
      axisLabel: { show: false },
      axisTick: { show: false },
      axisLine: { show: false }
    },
    yAxis,
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
    series
  }
}

// 配置确认后重新渲染图表（使用 notMerge 防止旧系列/Y轴残留）
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

.stat-config-row,
.yaxis-config-row,
.colorby-config-row {
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
