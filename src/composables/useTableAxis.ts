import { useAutoInterval } from '@/composables/useAutoInterval'
import { useChartPosition } from '@/composables/useChartPosition'
import { useResizeObserver } from '@/composables/useResizeObserver'
import { useHeaderLayout } from '@/composables/useHeaderLayout'
import type { ChartDataItem, HeaderLayout, TableHeader } from '@/types/echarts'
import type { ECharts } from 'echarts'
import { computed, nextTick, ref, watch, type Ref } from 'vue'
import { getDynamicCellStyle } from '@/utils/chart-util'
import { hideChartXAxis } from '@/composables/useChartCommon'

export interface TableAxisOptions {
  chart: Ref<ECharts | undefined>
  categories: Ref<string[]>
  headers: Ref<TableHeader[]>
  labelLayout?: Ref<'horizontal' | 'vertical' | 'tilted'>
  labelTiltAngle?: Ref<number>
  categoryLayout?: Ref<'horizontal' | 'vertical' | 'tilted'>
  categoryTiltAngle?: Ref<number>
  headerLayouts?: Ref<Record<string, HeaderLayout>>
  autoInterval?: Ref<boolean>
  maxCellTextLength?: Ref<number>
}

/**
 * Composable: 封装表格轴（TableXAxis / MultiYAxisTable）的复杂布局计算逻辑
 * 包括：图表网格位置同步、窄屏模式判定、自动间隔列宽计算、单元格合并分组、行高计算等
 */
export function useTableAxis(options: TableAxisOptions) {
  const chartRef = options.chart
  const categoriesRef = options.categories
  const headersRef = options.headers
  const autoInterval = options.autoInterval ?? ref(true)

  // 固定字体大小为 12px，用于单元格高度估算
  const textDivStyle = { fontSize: 12 }

  // 同步 ECharts 图表的网格位置，用于对齐左侧标签列和计算单列宽度
  const { tablePosition, syncPosition } = useChartPosition(
    chartRef,
    computed(() => categoriesRef.value.length || 0)
  )

  // 表头布局相关计算（独立配置 / 全局配置 / 类别行有效布局推断）
  const {
    getHeaderLayout,
    getHeaderTiltAngle,
    effectiveCategoryLayout,
    effectiveTiltAngle
  } = useHeaderLayout(options)

  // 窄屏模式：图表容器宽度 < 600px 时开启
  const isNarrowMode = ref(false)
  const updateNarrowMode = () => {
    const w = chartRef.value?.getDom()?.clientWidth || 0
    isNarrowMode.value = w > 0 && w < 600
  }

  // 当前可见类别中的最大文本长度
  const maxTextLength = computed(() =>
    categoriesRef.value.reduce(
      (max, cat) => Math.max(max, String(cat).length),
      0
    )
  )

  // 单元格内容的最大文本长度
  const maxCell = computed(() => options.maxCellTextLength?.value || 0)

  const chartContainerWidth = ref<number>(
    chartRef.value?.getDom()?.clientWidth || 0
  )
  const updateChartContainerWidth = () => {
    chartContainerWidth.value = chartRef.value?.getDom()?.clientWidth || 0
  }

  /**
   * 普通自动间隔配置：用于类别行和非窄屏模式下的数据行
   * 根据 effectiveCategoryLayout 动态计算列宽
   */
  const autoIntervalOptions = computed(() => ({
    enabled: autoInterval.value,
    containerWidth: chartContainerWidth.value,
    marginLeft: tablePosition.marginLeft,
    totalColumns: categoriesRef.value.length || 0,
    maxTextLength: maxTextLength.value,
    maxCellTextLength: maxCell.value,
    categoryLayout: 'horizontal' as const,
    categoryTiltAngle: effectiveTiltAngle.value,
    fontSize: textDivStyle.fontSize,
    originWidth: tablePosition.width,
    narrowMode: isNarrowMode.value
  }))

  /**
   * 密集自动间隔配置：窄屏模式下用于 vertical / horizontal 行
   * 强制按 vertical 布局计算最小列宽，以显示最多列
   */
  const denseIntervalOptions = computed(() => ({
    enabled: autoInterval.value && isNarrowMode.value,
    containerWidth: chartContainerWidth.value,
    marginLeft: tablePosition.marginLeft,
    totalColumns: categoriesRef.value.length || 0,
    maxTextLength: maxTextLength.value,
    maxCellTextLength: maxCell.value,
    categoryLayout: 'vertical' as const,
    categoryTiltAngle: 0,
    fontSize: textDivStyle.fontSize,
    originWidth: tablePosition.width,
    narrowMode: true
  }))

  /**
   * 稀疏自动间隔配置：窄屏模式下用于 tilted 行
   * 按 tilted 布局计算列宽，实现比 dense 更疏的合并效果
   */
  const sparseIntervalOptions = computed(() => ({
    enabled: autoInterval.value && isNarrowMode.value,
    containerWidth: chartContainerWidth.value,
    marginLeft: tablePosition.marginLeft,
    totalColumns: categoriesRef.value.length || 0,
    maxTextLength: maxTextLength.value,
    maxCellTextLength: maxCell.value,
    categoryLayout: 'tilted' as const,
    categoryTiltAngle: effectiveTiltAngle.value,
    fontSize: textDivStyle.fontSize,
    originWidth: tablePosition.width,
    narrowMode: true
  }))

  // 注册三个 useAutoInterval 实例，分别对应普通 / 密集 / 稀疏三种列宽策略
  const { autoColumnWidth, isColumnVisible, calculateVisibleColumns } =
    useAutoInterval(autoIntervalOptions)

  const {
    autoColumnWidth: denseColumnWidth,
    isColumnVisible: isDenseColumnVisible,
    calculateVisibleColumns: calculateDenseVisibleColumns
  } = useAutoInterval(denseIntervalOptions)

  const {
    autoColumnWidth: sparseColumnWidth,
    isColumnVisible: isSparseColumnVisible,
    calculateVisibleColumns: calculateSparseVisibleColumns
  } = useAutoInterval(sparseIntervalOptions)

  /**
   * 合并分组大小：在 narrowMode 下，tilted 行按此大小合并单元格
   * 计算方式为 sparse 列宽 / dense 列宽的比值（向上取整到最近整数）
   */
  const groupSize = computed(() => {
    if (!isNarrowMode.value || denseColumnWidth.value <= 0) return 1
    return Math.max(
      1,
      Math.round(sparseColumnWidth.value / denseColumnWidth.value)
    )
  })

  /**
   * 计算单元格内容所需高度
   */
  const computeCellHeight = (
    text: string,
    width: number,
    layout: 'horizontal' | 'vertical' | 'tilted',
    angle: number
  ): number =>
    getDynamicCellStyle(text, width, layout, angle, textDivStyle.fontSize)
      .height as number

  /**
   * 获取指定表头在窄屏模式下的合并单元格分组
   * 基于密集模式下的可见列，按 groupSize 进行合并
   */
  const getCellGroups = (values: ChartDataItem[], header: TableHeader) => {
    const groups: { text: string; width: number }[] = []
    const size = groupSize.value
    // 只取密集模式下可见的列索引
    const cols = categoriesRef.value
      .map((_, i) => i)
      .filter(isDenseColumnVisible)
    for (let i = 0; i < cols.length; i += size) {
      const chunk = cols.slice(i, i + size)
      groups.push({
        text: String(values?.[chunk[0]]?.[header.value] || ''),
        width: denseColumnWidth.value * chunk.length
      })
    }
    return groups
  }

  /**
   * 计算单行中某个表头的最大高度（确保整行统一高度）
   */
  const getRowHeight = (
    values: ChartDataItem[],
    header: TableHeader
  ): number => {
    const layout = getHeaderLayout(header.value)
    const angle = getHeaderTiltAngle(header.value)
    let maxH = computeCellHeight('', tablePosition.marginLeft, layout, angle)

    if (
      isNarrowMode.value &&
      layout !== 'vertical' &&
      layout !== 'horizontal'
    ) {
      // 窄屏 tilted 布局需要按合并分组计算高度
      getCellGroups(values, header).forEach((g) => {
        maxH = Math.max(maxH, computeCellHeight(g.text, g.width, layout, angle))
      })
    } else {
      const visibleFn = isNarrowMode.value
        ? isDenseColumnVisible
        : isColumnVisible
      const width = isNarrowMode.value
        ? denseColumnWidth.value
        : autoColumnWidth.value
      categoriesRef.value.forEach((_, idx) => {
        if (!visibleFn(idx)) return
        const text = String(values?.[idx]?.[header.value] || '')
        maxH = Math.max(maxH, computeCellHeight(text, width, layout, angle))
      })
    }
    return maxH
  }

  /**
   * 为 headers 中每个表头计算行高
   */
  const buildRowHeights = (
    values: ChartDataItem[],
    rowKeyFn: (header: TableHeader) => string
  ): Record<string, number> => {
    const heights: Record<string, number> = {}
    headersRef.value?.forEach((header) => {
      heights[rowKeyFn(header)] = getRowHeight(values, header)
    })
    return heights
  }

  // ResizeObserver：监听图表容器尺寸变化，重新计算列宽和窄屏模式
  const { observe } = useResizeObserver()

  const bindResizeObserver = () => {
    const dom = chartRef.value?.getDom()
    if (dom) {
      updateNarrowMode()
      observe(dom, async () => {
        // await nextTick()
        updateNarrowMode()
        updateChartContainerWidth()
        syncPosition()
      })
    }
  }

  return {
    tablePosition,
    textDivStyle,
    getHeaderLayout,
    getHeaderTiltAngle,
    effectiveCategoryLayout,
    effectiveTiltAngle,
    isNarrowMode,
    updateNarrowMode,
    bindResizeObserver,
    autoColumnWidth,
    denseColumnWidth,
    sparseColumnWidth,
    isColumnVisible,
    isDenseColumnVisible,
    calculateVisibleColumns,
    calculateDenseVisibleColumns,
    calculateSparseVisibleColumns,
    groupSize,
    getCellGroups,
    computeCellHeight,
    getRowHeight,
    buildRowHeights,
    hideChartXAxis
  }
}
