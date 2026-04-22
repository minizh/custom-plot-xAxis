<template>
  <div :class="[`layout-${categoryLayout}`, { 'narrow-mode': isNarrowMode }]" :style="{ position: 'relative' }">
    <!-- 类别行（categories） -->
    <div
      v-if="showCategoryRow && visibleData?.categories?.length"
      :style="{ display: 'flex' }"
    >
      <div
        :style="{
          display: 'flex',
          marginLeft: `${tablePosition.marginLeft}px`
        }"
      >
        <!-- 非窄屏模式：按普通自动间隔显示 -->
        <template v-if="!isNarrowMode">
          <template
            v-for="(item, index) in visibleData.categories"
            :key="`header-${item}-${index}`"
          >
            <div
              v-if="isColumnVisible(index)"
              class="table-cell-div"
              :style="getDynamicCellStyle(String(item), autoColumnWidth, categoryLayout, categoryTiltAngle, textDivStyle.fontSize)"
            >
              <TextDiv
                :text="item"
                :layout="categoryLayout"
                :width="autoColumnWidth"
                :height="getDynamicCellStyle(String(item), autoColumnWidth, categoryLayout, categoryTiltAngle, textDivStyle.fontSize).height"
                :font-size="textDivStyle.fontSize"
                :tilt-angle="categoryTiltAngle"
                :truncate="false"
              />
            </div>
          </template>
        </template>
        <!-- 窄屏模式：按密集自动间隔显示 -->
        <template v-else>
          <template
            v-for="(item, index) in visibleData.categories"
            :key="`header-${item}-${index}`"
          >
            <div
              v-if="isDenseColumnVisible(index)"
              class="table-cell-div"
              :style="getDynamicCellStyle(String(item), denseColumnWidth, categoryLayout, categoryTiltAngle, textDivStyle.fontSize)"
            >
              <TextDiv
                :text="item"
                :layout="categoryLayout"
                :width="denseColumnWidth"
                :height="getDynamicCellStyle(String(item), denseColumnWidth, categoryLayout, categoryTiltAngle, textDivStyle.fontSize).height"
                :font-size="textDivStyle.fontSize"
                :tilt-angle="categoryTiltAngle"
                :truncate="false"
              />
            </div>
          </template>
        </template>
      </div>
    </div>

    <!-- 数据行（headers） -->
    <template v-if="headers.length">
      <div
        v-for="item in headers"
        :key="item.value"
        :style="{ display: 'flex' }"
      >
        <!-- 左侧标签列 -->
        <div
          class="table-cell-div table-label-cell"
          :style="getDynamicCellStyle(item.label, tablePosition.marginLeft, getHeaderLayout(item.value), getHeaderTiltAngle(item.value), textDivStyle.fontSize, rowHeights[item.value])"
        >
          <TextDiv
            :text="item.label"
            :layout="getHeaderLayout(item.value)"
            :width="tablePosition.marginLeft"
            :height="getDynamicCellStyle(item.label, tablePosition.marginLeft, getHeaderLayout(item.value), getHeaderTiltAngle(item.value), textDivStyle.fontSize, rowHeights[item.value]).height"
            :font-size="textDivStyle.fontSize"
            :tilt-angle="getHeaderTiltAngle(item.value)"
            :truncate="false"
          />
        </div>
        <!-- 右侧数据列 -->
        <div :style="{ display: 'flex' }">
          <!-- 正常显示或竖排/横排窄屏显示 -->
          <template v-if="!headerColumnConfigs[item.value]?.isNarrowMode || getHeaderLayout(item.value) === 'vertical' || getHeaderLayout(item.value) === 'horizontal'">
            <template
              v-for="(category, index) in visibleData?.categories || []"
              :key="`cell-${category}-${item.value}-${index}`"
            >
              <div
                v-if="headerColumnConfigs[item.value]?.isNarrowMode ? headerColumnConfigs[item.value]?.denseVisibleColumns?.includes(index) : headerColumnConfigs[item.value]?.visibleColumns?.includes(index)"
                class="table-cell-div"
                :style="getDynamicCellStyle(String(visibleData.values?.[index]?.[item.value] || ''), headerColumnConfigs[item.value]?.isNarrowMode ? headerColumnConfigs[item.value]?.denseColumnWidth : headerColumnConfigs[item.value]?.autoColumnWidth, getHeaderLayout(item.value), getHeaderTiltAngle(item.value), textDivStyle.fontSize, rowHeights[item.value])"
              >
                <TextDiv
                  :text="String(visibleData.values?.[index]?.[item.value] || '')"
                  :layout="getHeaderLayout(item.value)"
                  :width="headerColumnConfigs[item.value]?.isNarrowMode ? headerColumnConfigs[item.value]?.denseColumnWidth : headerColumnConfigs[item.value]?.autoColumnWidth"
                  :height="getDynamicCellStyle(String(visibleData.values?.[index]?.[item.value] || ''), headerColumnConfigs[item.value]?.isNarrowMode ? headerColumnConfigs[item.value]?.denseColumnWidth : headerColumnConfigs[item.value]?.autoColumnWidth, getHeaderLayout(item.value), getHeaderTiltAngle(item.value), textDivStyle.fontSize, rowHeights[item.value]).height"
                  :font-size="textDivStyle.fontSize"
                  :tilt-angle="getHeaderTiltAngle(item.value)"
                  :truncate="false"
                />
              </div>
            </template>
          </template>
          <!-- 窄屏 tilted 布局：按 groupSize 合并单元格显示 -->
          <template v-else>
            <div
              v-for="(group, gIdx) in getHeaderCellGroups(headerColumnConfigs, visibleData.values || [], item)"
              :key="`group-${item.value}-${gIdx}`"
              class="table-cell-div"
              :style="{
                ...getDynamicCellStyle(group.text, group.width, getHeaderLayout(item.value), getHeaderTiltAngle(item.value), textDivStyle.fontSize, rowHeights[item.value]),
                width: `${group.width}px`
              }"
            >
              <TextDiv
                :text="group.text"
                :layout="getHeaderLayout(item.value)"
                :width="group.width"
                :height="getDynamicCellStyle(group.text, group.width, getHeaderLayout(item.value), getHeaderTiltAngle(item.value), textDivStyle.fontSize, rowHeights[item.value]).height"
                :font-size="textDivStyle.fontSize"
                :tilt-angle="getHeaderTiltAngle(item.value)"
                :truncate="false"
              />
            </div>
          </template>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import TextDiv from '@/components/TextDiv/TextDiv.vue'
import { useChartDataZoom } from '@/composables/useChartDataZoom'
import { useTableAxis, type HeaderColumnConfig } from '@/composables/useTableAxis'
import type { HeaderLayout, TableChartData, TableHeader } from '@/types/echarts'
import type { ECharts } from 'echarts'
import { computed, toRef, watch } from 'vue'
import { getDynamicCellStyle } from '@/utils/chart-util'

const props = withDefaults(
  defineProps<{
    headers?: TableHeader[]
    chartData?: TableChartData
    chart?: ECharts
    labelLayout?: 'horizontal' | 'vertical' | 'tilted'
    labelTiltAngle?: number
    categoryLayout?: 'horizontal' | 'vertical' | 'tilted'
    categoryTiltAngle?: number
    headerLayouts?: Record<string, HeaderLayout>
    autoInterval?: boolean
    showCategoryRow?: boolean
  }>(),
  {
    headers: () => [],
    chartData: undefined,
    chart: undefined,
    labelLayout: 'horizontal',
    labelTiltAngle: 45,
    categoryLayout: 'horizontal',
    categoryTiltAngle: 45,
    headerLayouts: () => ({}),
    autoInterval: true,
    showCategoryRow: true
  }
)

const chartRef = toRef(props, 'chart')
const chartDataRef = toRef(props, 'chartData')

// 通过 dataZoom 同步获取当前可见的数据切片
const { visibleData } = useChartDataZoom(chartRef, chartDataRef)

/**
 * 计算当前可见数据中，单元格内容的最大文本长度
 */
const maxCellTextLength = computed(() => {
  let max = 0
  const values = visibleData.value?.values || []
  const headers = props.headers || []
  values.forEach((item) => {
    headers.forEach((h) => {
      const text = String(item[h.value] ?? '')
      if (text.length > max) max = text.length
    })
  })
  return max
})

// 提取 TableXAxis 中复杂的布局计算逻辑到 Composable
const {
  tablePosition,
  textDivStyle,
  getHeaderLayout,
  getHeaderTiltAngle,
  isNarrowMode,
  bindResizeObserver,
  autoColumnWidth,
  denseColumnWidth,
  isColumnVisible,
  isDenseColumnVisible,
  calculateVisibleColumns,
  calculateDenseVisibleColumns,
  getCellGroups,
  buildHeaderColumnConfigs,
  getHeaderCellGroups,
  buildRowHeights,
  hideChartXAxis
} = useTableAxis({
  chart: chartRef,
  categories: computed(() => visibleData.value?.categories || []),
  headers: computed(() => props.headers),
  maxCellTextLength,
  labelLayout: computed(() => props.labelLayout),
  labelTiltAngle: computed(() => props.labelTiltAngle),
  categoryLayout: computed(() => props.categoryLayout),
  categoryTiltAngle: computed(() => props.categoryTiltAngle),
  headerLayouts: computed(() => props.headerLayouts),
  autoInterval: computed(() => props.autoInterval)
})

// 行高：为每个 header 计算最大所需高度，保证整行对齐
const rowHeights = computed(() => {
  return buildRowHeights(visibleData.value?.values || [], (header) => header.value)
})

// 按表头独立计算的列宽与可见列配置
const headerColumnConfigs = computed<Record<string, HeaderColumnConfig>>(() => {
  return buildHeaderColumnConfigs(visibleData.value?.values || [])
})

// 数据变化时：隐藏原生 X 轴并重新计算列宽
watch(
  visibleData,
  (data) => {
    if (props.chart && data?.categories?.length) {
      hideChartXAxis()
      calculateVisibleColumns()
      calculateDenseVisibleColumns()
    }
  },
  { immediate: true }
)

// 监听 chart 实例，绑定 ResizeObserver
watch(
  () => props.chart,
  (chart) => {
    if (chart) {
      bindResizeObserver()
    }
  }
)
</script>

<style scoped>
.table-cell-div {
  border: 1px solid #000;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.table-label-cell {
  overflow: hidden;
}

.narrow-mode .table-cell-div {
  border-left: none;
  border-right: none;
}
</style>
