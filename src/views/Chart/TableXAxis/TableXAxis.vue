<template>
  <div
    :style="{
      position: 'relative'
    }"
  >
    <div v-if="visibleData?.categories?.length" :style="{ display: 'flex' }">
      <div
        :style="{
          display: 'flex',
          marginLeft: `${tablePosition.marginLeft}px`
        }"
      >
        <template v-for="(item, index) in visibleData.categories" :key="`header-${item}-${index}`">
          <div
            v-if="isColumnVisible(index)"
            class="table-cell-div"
            :style="{
              width: `${autoColumnWidth}px`
            }"
          >
            <TextDiv
              :text="item"
              :layout="categoryLayout"
              :width="autoColumnWidth"
              :height="32"
              :fontSize="textDivStyle.fontSize"
              :tiltAngle="categoryTiltAngle"
            />
          </div>
        </template>
      </div>
    </div>
    <div
      v-if="headers.length"
      v-for="item in headers"
      :key="item.value"
      :style="{ display: 'flex' }"
    >
      <div
        class="table-cell-div table-label-cell"
        :style="{
          width: `${tablePosition.marginLeft}px`
        }"
      >
        <TextDiv
          :text="item.label"
          :layout="getHeaderLayout(item.value)"
          :width="tablePosition.marginLeft"
          :height="32"
          :fontSize="textDivStyle.fontSize"
          :tiltAngle="getHeaderTiltAngle(item.value)"
        />
      </div>
      <div :style="{ display: 'flex' }">
        <template v-for="(category, index) in visibleData?.categories || []" :key="`cell-${category}-${item.value}-${index}`">
          <div
            v-if="isColumnVisible(index)"
            class="table-cell-div"
            :style="{
              width: `${autoColumnWidth}px`
            }"
          >
            <TextDiv
              :text="String(visibleData.values?.[index]?.[item.value] || '')"
              :layout="getHeaderLayout(item.value)"
              :width="autoColumnWidth"
              :height="32"
              :fontSize="textDivStyle.fontSize"
              :tiltAngle="getHeaderTiltAngle(item.value)"
            />
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import TextDiv from '@/components/TextDiv/TextDiv.vue'
import {
  getConfiguredGridPx,
  getXAxisVisibleDomRange
} from '@/utils/chart-util'
import { ref, watch, computed, onBeforeUnmount } from 'vue'

const props = withDefaults(
  defineProps<{
    headers?: { value: string; label: string }[]
    chartData?: { categories: string[]; values: any[] }
    chart?: any
    labelLayout?: 'horizontal' | 'vertical' | 'tilted'
    labelTiltAngle?: number
    categoryLayout?: 'horizontal' | 'vertical' | 'tilted'
    categoryTiltAngle?: number
    headerLayouts?: { [key: string]: { layout?: 'horizontal' | 'vertical' | 'tilted'; tiltAngle?: number } }
    autoInterval?: boolean
  }>(),
  {
    headers: () => [],
    labelLayout: 'horizontal',
    labelTiltAngle: 45,
    categoryLayout: 'horizontal',
    categoryTiltAngle: 45,
    headerLayouts: () => ({}),
    autoInterval: true
  }
)

const tablePosition = ref({
  marginLeft: 0,
  width: 0
})

const visibleData = ref(null)
const visibleColumns = ref<number[]>([])
const autoColumnWidth = ref(0)

// ResizeObserver 实例
let resizeObserver: ResizeObserver | null = null
// requestAnimationFrame ID
let rafId: number | null = null

const textDivStyle = computed(() => ({
  fontSize: 12
}))

// 计算单个字符在水平方向的投影宽度
const getCharWidth = () => {
  return textDivStyle.value.fontSize * 0.55
}

// 计算标签旋转后的实际占用宽度
const calculateLabelWidth = (layout: string, tiltAngle: number, text: string) => {
  const textLength = String(text).length
  const charWidth = getCharWidth()
  const charHeight = textDivStyle.value.fontSize

  switch (layout) {
    case 'vertical':
      // 垂直布局：旋转90°，水平占用 = 字符高度
      return charHeight
    case 'tilted':
      // 倾斜布局：文本倾斜后的水平投影
      const radian = (tiltAngle * Math.PI) / 180
      // 水平投影 = 文本长度 * cos(角度) + 字符高度 * sin(角度)
      const horizontalProjection = textLength * charWidth * Math.cos(radian) + charHeight * Math.sin(radian)
      return horizontalProjection
    case 'horizontal':
    default:
      // 水平布局：直接使用文本宽度
      return textLength * charWidth
  }
}

// 计算需要显示的列
const calculateVisibleColumns = () => {
  if (!props.autoInterval || !visibleData.value?.categories?.length) {
    visibleColumns.value = []
    autoColumnWidth.value = tablePosition.value.width
    return
  }

  // 获取最长标签的长度
  let maxTextLength = 0
  visibleData.value.categories.forEach(cat => {
    if (String(cat).length > maxTextLength) {
      maxTextLength = String(cat).length
    }
  })

  // 计算单个标签旋转后的实际占用宽度
  const labelWidth = calculateLabelWidth(props.categoryLayout, props.categoryTiltAngle, ' '.repeat(maxTextLength))
  
  // 计算容器可用宽度
  const containerWidth = props.chart?.getDom()?.clientWidth || 0
  const marginLeft = tablePosition.value.marginLeft
  const availableWidth = containerWidth - marginLeft - 20 // 留 20px 边距

  // 计算总列数
  const totalColumns = visibleData.value.categories.length

  // 计算单个单元格需要的最小宽度
  const minCellWidth = labelWidth + 4 // 加上边框宽度

  if (totalColumns * minCellWidth <= availableWidth) {
    // 空间足够，所有列显示，列宽用原始宽度
    visibleColumns.value = visibleData.value.categories.map((_, i) => i)
    autoColumnWidth.value = tablePosition.value.width
    return
  }

  // 空间不足，计算能显示多少列
  // 可显示的最大列数
  const maxVisibleColumns = Math.floor(availableWidth / minCellWidth)
  const visibleCount = Math.max(1, maxVisibleColumns)

  // 选择均匀分布的列索引
  const selectedIndices: number[] = []
  const step = (totalColumns - 1) / (visibleCount - 1)
  
  for (let i = 0; i < visibleCount; i++) {
    if (i === visibleCount - 1) {
      // 最后一列一定显示
      selectedIndices.push(totalColumns - 1)
    } else {
      const index = Math.round(i * step)
      if (!selectedIndices.includes(index)) {
        selectedIndices.push(index)
      }
    }
  }

  visibleColumns.value = selectedIndices.sort((a, b) => a - b)

  // 调整列宽为可用宽度除以可见列数
  autoColumnWidth.value = Math.max(labelWidth, Math.floor(availableWidth / visibleCount))
}

// 判断列是否应该显示
const isColumnVisible = (index: number) => {
  if (!props.autoInterval || visibleColumns.value.length === 0) {
    return true
  }
  return visibleColumns.value.includes(index)
}

// 获取单个 header 的布局配置
const getHeaderLayout = (headerValue: string) => {
  if (props.headerLayouts && props.headerLayouts[headerValue]) {
    return props.headerLayouts[headerValue].layout || props.labelLayout
  }
  return props.labelLayout
}

// 获取单个 header 的倾斜角度
const getHeaderTiltAngle = (headerValue: string) => {
  if (props.headerLayouts && props.headerLayouts[headerValue]) {
    return props.headerLayouts[headerValue].tiltAngle ?? props.labelTiltAngle
  }
  return props.labelTiltAngle
}

const hideChartXAxis = (chart) => {
  if (chart) {
    chart.setOption({
      xAxis: {
        axisLabel: { show: false },
        axisTick: { show: false },
        axisLine: { show: false }
      }
    })
  }
}

const setTablePosition = (chart) => {
  // 第一个点到最后一个点的距离
  const chartWidthRange = getXAxisVisibleDomRange(chart)
  const { point } = chartWidthRange
  const { left } = point
  const center1 = chart.convertToPixel({ xAxisIndex: 0 }, 0)
  const center2 = chart.convertToPixel({ xAxisIndex: 0 }, 1)

  // 处理只有一条数据的情况
  let width = center2 - center1
  let marginLeft = left - width / 2
  if (visibleData.value?.categories?.length === 1 || !center2) {
    // 只有一条数据时，使用 grid 的宽度作为列宽，从 grid 左边缘开始
    const gridLeft = getConfiguredGridPx(chart, 0, 'left')
    const gridRight = getConfiguredGridPx(chart, 0, 'right')
    const chartWidth = chart.getDom().clientWidth
    width = chartWidth - gridLeft - gridRight
    marginLeft = gridLeft
  }

  tablePosition.value = {
    width: width,
    marginLeft: marginLeft
  }
}

const updateVisibleData = () => {
  if (!props.chart || !props.chartData?.categories?.length) {
    visibleData.value = props.chartData
    return
  }

  const opt = props.chart.getOption()
  const dz = opt.dataZoom?.[0]

  if (!dz || dz.start == null || dz.end == null) {
    visibleData.value = props.chartData
  } else {
    const start = dz.start
    const end = dz.end
    const total = props.chartData.categories.length

    const startIndex = Math.max(0, Math.round((start / 100) * (total - 1)))
    const endIndex = Math.min(total - 1, Math.round((end / 100) * (total - 1)))

    visibleData.value = {
      categories: props.chartData.categories.slice(startIndex, endIndex + 1),
      values: props.chartData.values.slice(startIndex, endIndex + 1)
    }
  }
}

const syncTable = () => {
  updateVisibleData()
  if (props.chart && visibleData.value?.categories?.length) {
    hideChartXAxis(props.chart)
    setTablePosition(props.chart)
    calculateVisibleColumns()
  } else {
    tablePosition.value = {
      marginLeft: 0,
      width: 0
    }
    visibleColumns.value = []
    autoColumnWidth.value = 0
  }
}

// 使用 ResizeObserver + requestAnimationFrame 优化 resize 处理
const setupResizeObserver = () => {
  if (typeof ResizeObserver === 'undefined') return
  
  // 取消之前的 RAF
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
  
  resizeObserver = new ResizeObserver(() => {
    // 使用 requestAnimationFrame 节流
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
    }
    rafId = requestAnimationFrame(() => {
      if (props.chart) {
        calculateVisibleColumns()
      }
    })
  })
  
  // 监听 chart DOM 变化
  if (props.chart?.getDom()) {
    resizeObserver.observe(props.chart.getDom())
  }
}

watch(
  () => props.chart,
  (chart, oldChart, onCleanup) => {
    if (chart) {
      chart.on('dataZoom', syncTable)
      syncTable()
      setupResizeObserver()
      onCleanup(() => {
        chart.off('dataZoom', syncTable)
        // 清理 ResizeObserver
        if (resizeObserver) {
          resizeObserver.disconnect()
          resizeObserver = null
        }
        // 取消 RAF
        if (rafId !== null) {
          cancelAnimationFrame(rafId)
          rafId = null
        }
      })
    }
  }
)

watch(
  () => [props.chartData, props.headers],
  () => {
    console.log(props.chartData)
    syncTable()
  },
  {
    immediate: true
  }
)

// 组件销毁时清理
onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
})
</script>

<style scoped>
.table-cell-div {
  border: 1px solid #000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.table-label-cell {
  overflow: hidden;
}
</style>
