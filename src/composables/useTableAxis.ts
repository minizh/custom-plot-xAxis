import { useAutoInterval } from '@/composables/useAutoInterval'
import { useChartPosition } from '@/composables/useChartPosition'
import { useResizeObserver } from '@/composables/useResizeObserver'
import type { ChartDataItem, HeaderLayout, TableHeader } from '@/types/echarts'
import type { ECharts } from 'echarts'
import { computed, ref, toRef, type Ref } from 'vue'
import { getDynamicCellStyle } from '@/utils/chart-util'
import { hideChartXAxis } from '@/composables/useChartCommon'

/**
 * Y轴表格项（用于 MultiYAxisTable）
 */
export interface YAxisTableItem {
  name: string
  headers: TableHeader[]
  values: ChartDataItem[]
  bgColor?: string
}

/**
 * useTableAxis 配置选项
 */
export interface TableAxisOptions {
  /** 图表实例 */
  chart: Ref<ECharts | undefined>
  /** 可见的类别数组 */
  categories: Ref<string[]>
  /** 表头配置 */
  headers: Ref<TableHeader[]>
  /** 全局标签布局 */
  labelLayout?: Ref<'horizontal' | 'vertical' | 'tilted'>
  /** 全局标签倾斜角度 */
  labelTiltAngle?: Ref<number>
  /** 类别行布局 */
  categoryLayout?: Ref<'horizontal' | 'vertical' | 'tilted'>
  /** 类别行倾斜角度 */
  categoryTiltAngle?: Ref<number>
  /** 各表头的独立布局配置 */
  headerLayouts?: Ref<Record<string, HeaderLayout>>
  /** 是否开启自动间隔 */
  autoInterval?: Ref<boolean>
  /** 单元格内容的最大文本长度（用于 autoInterval 计算列宽） */
  maxCellTextLength?: Ref<number>
}

/**
 * 提取 TableXAxis / MultiYAxisTable 中通用的复杂逻辑到 Composable
 * 包括：自适应列宽、窄屏模式、行高计算、单元格合并分组等
 */
export function useTableAxis(options: TableAxisOptions) {
  const chartRef = options.chart
  const categoriesRef = options.categories
  const headersRef = options.headers
  const labelLayout = options.labelLayout ?? ref('horizontal')
  const labelTiltAngle = options.labelTiltAngle ?? ref(45)
  const categoryLayout = options.categoryLayout ?? ref('horizontal')
  const categoryTiltAngle = options.categoryTiltAngle ?? ref(45)
  const headerLayouts = options.headerLayouts ?? ref<Record<string, HeaderLayout>>({})
  const autoInterval = options.autoInterval ?? ref(true)

  const textDivStyle = computed(() => ({ fontSize: 12 }))

  // 使用 useChartPosition 同步图表网格位置
  const { tablePosition } = useChartPosition(
    chartRef,
    computed(() => categoriesRef.value.length || 0)
  )

  /**
   * 获取指定表头的布局方式，优先使用独立配置，否则回退到全局配置
   */
  const getHeaderLayout = (headerValue: string): 'horizontal' | 'vertical' | 'tilted' => {
    return headerLayouts.value[headerValue]?.layout || labelLayout.value
  }

  /**
   * 获取指定表头的倾斜角度
   */
  const getHeaderTiltAngle = (headerValue: string): number => {
    return headerLayouts.value[headerValue]?.tiltAngle ?? labelTiltAngle.value
  }

  /**
   * 根据所有表头的布局推断类别行的有效布局
   * 优先级：tilted > vertical > 全局 categoryLayout
   */
  const effectiveCategoryLayout = computed((): 'horizontal' | 'vertical' | 'tilted' => {
    let hasTilted = false
    let hasVertical = false
    headersRef.value?.forEach((header) => {
      const layout = getHeaderLayout(header.value)
      if (layout === 'tilted') hasTilted = true
      if (layout === 'vertical') hasVertical = true
    })
    if (hasTilted) return 'tilted'
    if (hasVertical) return 'vertical'
    return categoryLayout.value
  })

  /**
   * 根据所有表头的倾斜角度推断类别行的有效倾斜角度（取最大）
   */
  const effectiveTiltAngle = computed(() => {
    let maxAngle = categoryTiltAngle.value
    headersRef.value?.forEach((header) => {
      const layout = getHeaderLayout(header.value)
      if (layout === 'tilted') {
        const angle = getHeaderTiltAngle(header.value)
        if (angle > maxAngle) maxAngle = angle
      }
    })
    return maxAngle
  })

  /**
   * 当前可见类别中的最大文本长度（用于计算列宽）
   */
  const maxTextLength = computed(() => {
    return categoriesRef.value.reduce(
      (max, cat) => Math.max(max, String(cat).length),
      0
    )
  })

  /**
   * 窄屏模式：当图表容器宽度小于 600px 时开启
   */
  const isNarrowMode = ref(false)
  const updateNarrowMode = () => {
    const w = chartRef.value?.getDom()?.clientWidth || 0
    isNarrowMode.value = w > 0 && w < 600
  }

  /**
   * 普通模式下的自动间隔配置
   */
  const autoIntervalOptions = computed(() => ({
    enabled: autoInterval.value,
    containerWidth: chartRef.value?.getDom()?.clientWidth || 0,
    marginLeft: tablePosition.marginLeft,
    totalColumns: categoriesRef.value.length || 0,
    maxTextLength: maxTextLength.value,
    maxCellTextLength: options.maxCellTextLength?.value || 0,
    categoryLayout: effectiveCategoryLayout.value,
    categoryTiltAngle: effectiveTiltAngle.value,
    fontSize: textDivStyle.value.fontSize,
    originWidth: tablePosition.width,
    narrowMode: isNarrowMode.value
  }))

  const { autoColumnWidth, isColumnVisible, calculateVisibleColumns } =
    useAutoInterval(autoIntervalOptions)

  /**
   * 窄屏模式下的密集列宽配置（用于 vertical / horizontal 行）
   */
  const denseIntervalOptions = computed(() => ({
    enabled: autoInterval.value && isNarrowMode.value,
    containerWidth: chartRef.value?.getDom()?.clientWidth || 0,
    marginLeft: tablePosition.marginLeft,
    totalColumns: categoriesRef.value.length || 0,
    maxTextLength: maxTextLength.value,
    maxCellTextLength: options.maxCellTextLength?.value || 0,
    categoryLayout: 'vertical' as const,
    categoryTiltAngle: 0,
    fontSize: textDivStyle.value.fontSize,
    originWidth: tablePosition.width,
    narrowMode: true
  }))

  const {
    autoColumnWidth: denseColumnWidth,
    isColumnVisible: isDenseColumnVisible,
    calculateVisibleColumns: calculateDenseVisibleColumns
  } = useAutoInterval(denseIntervalOptions)

  /**
   * 窄屏模式下的稀疏列宽配置（用于 tilted 行，计算合并分组数）
   */
  const sparseIntervalOptions = computed(() => ({
    enabled: autoInterval.value && isNarrowMode.value,
    containerWidth: chartRef.value?.getDom()?.clientWidth || 0,
    marginLeft: tablePosition.marginLeft,
    totalColumns: categoriesRef.value.length || 0,
    maxTextLength: maxTextLength.value,
    maxCellTextLength: options.maxCellTextLength?.value || 0,
    categoryLayout: 'tilted' as const,
    categoryTiltAngle: effectiveTiltAngle.value,
    fontSize: textDivStyle.value.fontSize,
    originWidth: tablePosition.width,
    narrowMode: true
  }))

  const { autoColumnWidth: sparseColumnWidth } = useAutoInterval(sparseIntervalOptions)

  /**
   * 计算合并分组的大小：稀疏列宽 / 密集列宽
   */
  const groupSize = computed(() => {
    if (!isNarrowMode.value || denseColumnWidth.value <= 0) return 1
    return Math.max(1, Math.round(sparseColumnWidth.value / denseColumnWidth.value))
  })

  /**
   * 计算单元格内容所需高度
   */
  const computeCellHeight = (
    text: string,
    width: number,
    layout: 'horizontal' | 'vertical' | 'tilted',
    angle: number
  ): number => {
    return getDynamicCellStyle(text, width, layout, angle, textDivStyle.value.fontSize)
      .height as number
  }

  /**
   * 获取指定表头在窄屏模式下的合并单元格分组
   * @param values - 当前行对应的数据数组
   * @param header - 表头配置
   */
  const getCellGroups = (values: ChartDataItem[], header: TableHeader) => {
    const groups: { text: string; width: number }[] = []
    const size = groupSize.value
    // 只取密集模式下可见的列索引
    const cols = categoriesRef.value
      .map((_, idx) => idx)
      .filter((idx) => isDenseColumnVisible(idx))
    for (let i = 0; i < cols.length; i += size) {
      const chunk = cols.slice(i, i + size)
      const firstIdx = chunk[0]
      const text = String(values?.[firstIdx]?.[header.value] || '')
      groups.push({
        text,
        width: denseColumnWidth.value * chunk.length
      })
    }
    return groups
  }

  /**
   * 计算单行中某个表头的最大高度（确保整行统一高度）
   * @param values - 当前行数据
   * @param header - 表头配置
   */
  const getRowHeight = (values: ChartDataItem[], header: TableHeader): number => {
    const layout = getHeaderLayout(header.value)
    const angle = getHeaderTiltAngle(header.value)
    let maxH = computeCellHeight('', tablePosition.marginLeft, layout, angle)

    if (isNarrowMode.value && layout !== 'vertical' && layout !== 'horizontal') {
      // 窄屏 tilted 布局需要按合并分组计算高度
      const groups = getCellGroups(values, header)
      groups.forEach((g) => {
        const h = computeCellHeight(g.text, g.width, layout, angle)
        if (h > maxH) maxH = h
      })
    } else {
      const visibleFn = isNarrowMode.value ? isDenseColumnVisible : isColumnVisible
      const width = isNarrowMode.value ? denseColumnWidth.value : autoColumnWidth.value
      categoriesRef.value.forEach((_, idx) => {
        if (!visibleFn(idx)) return
        const text = String(values?.[idx]?.[header.value] || '')
        const h = computeCellHeight(text, width, layout, angle)
        if (h > maxH) maxH = h
      })
    }
    return maxH
  }

  /**
   * 为 headers 中每个表头计算行高（key 由外部传入，适应单表格/多 Y 轴场景）
   * @param values - 当前行数据
   * @param rowKey - 行高缓存 key（如 header.value 或 `${yIndex}-${header.value}`）
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
      observe(dom, () => {
        calculateVisibleColumns()
        calculateDenseVisibleColumns()
        updateNarrowMode()
      })
    }
  }

  return {
    // 位置与布局
    tablePosition,
    textDivStyle,
    // header 配置读取
    getHeaderLayout,
    getHeaderTiltAngle,
    effectiveCategoryLayout,
    effectiveTiltAngle,
    // 窄屏模式
    isNarrowMode,
    updateNarrowMode,
    bindResizeObserver,
    // 列宽
    autoColumnWidth,
    denseColumnWidth,
    sparseColumnWidth,
    isColumnVisible,
    isDenseColumnVisible,
    calculateVisibleColumns,
    calculateDenseVisibleColumns,
    // 单元格分组与高度
    groupSize,
    getCellGroups,
    computeCellHeight,
    getRowHeight,
    buildRowHeights,
    // 通用操作
    hideChartXAxis
  }
}
