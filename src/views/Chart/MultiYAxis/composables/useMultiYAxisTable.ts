import { useDataZoomState } from '@/composables/useChartCommon'
import { useTableAxis, type HeaderColumnConfig } from '@/composables/useTableAxis'
import type { ChartDataItem, HeaderLayout, TableHeader } from '@/types/echarts'
import type { ECharts } from 'echarts'
import { computed, watch, type Ref } from 'vue'
import { calculateColumnState } from '@/utils/chart-util'
import type { YAxisTableItem } from '../MultiYAxisTable.vue'

export interface MultiYAxisTableOptions {
  chart: Ref<ECharts | undefined>
  categories: Ref<string[]>
  yAxisList: Ref<YAxisTableItem[]>
  labelLayout: Ref<'horizontal' | 'vertical' | 'tilted'>
  labelTiltAngle: Ref<number>
  categoryLayout: Ref<'horizontal' | 'vertical' | 'tilted'>
  categoryTiltAngle: Ref<number>
  headerLayouts: Ref<Record<string, HeaderLayout>>
  autoInterval: Ref<boolean>
  isColorByMode: Ref<boolean>
}

export function useMultiYAxisTable(options: MultiYAxisTableOptions) {
  const chartRef = options.chart
  const { dataZoomState } = useDataZoomState(chartRef)
  const totalCount = computed(() => options.categories.value?.length || 0)

  const getSliceRange = () => {
    if (!dataZoomState.value || !chartRef.value) {
      return { start: 0, end: totalCount.value - 1 }
    }
    const total = totalCount.value
    const start = Math.max(
      0,
      Math.round((dataZoomState.value.start / 100) * (total - 1))
    )
    const end = Math.min(
      total - 1,
      Math.round((dataZoomState.value.end / 100) * (total - 1))
    )
    return { start, end }
  }

  const visibleCategories = computed(() => {
    const { start, end } = getSliceRange()
    return (options.categories.value || []).slice(start, end + 1)
  })

  const getVisibleValues = (values: ChartDataItem[]) => {
    const { start, end } = getSliceRange()
    return values.slice(start, end + 1)
  }

  const visibleStartIndex = computed(() => getSliceRange().start)

  const maxCellTextLength = computed(() => {
    let max = 0
    options.yAxisList.value?.forEach((yAxis) => {
      const visibleValues = getVisibleValues(yAxis.values)
      yAxis.headers?.forEach((h) => {
        visibleValues.forEach((item) => {
          const text = String(item[h.value] ?? '')
          if (text.length > max) max = text.length
        })
      })
    })
    return max
  })

  const {
    tablePosition,
    textDivStyle,
    getHeaderLayout,
    getHeaderTiltAngle,
    isNarrowMode,
    bindResizeObserver,
    autoColumnWidth,
    denseColumnWidth,
    sparseColumnWidth,
    isColumnVisible,
    isDenseColumnVisible,
    getCellGroups,
    getHeaderCellGroups,
    groupSize,
    buildHeaderColumnConfigs,
    buildRowHeights,
    maxTextLength
  } = useTableAxis({
    chart: chartRef,
    categories: computed(() => visibleCategories.value),
    headers: computed(() => {
      const map = new Map<string, TableHeader>()
      options.yAxisList.value?.forEach((yAxis) => {
        yAxis.headers?.forEach((h) => {
          if (!map.has(h.value)) map.set(h.value, h)
        })
      })
      return Array.from(map.values())
    }),
    maxCellTextLength,
    labelLayout: options.labelLayout,
    labelTiltAngle: options.labelTiltAngle,
    categoryLayout: options.categoryLayout,
    categoryTiltAngle: options.categoryTiltAngle,
    headerLayouts: options.headerLayouts,
    autoInterval: options.autoInterval
  })

  const isNarrowCell = computed(() => {
    return isNarrowMode.value && !options.isColorByMode.value
  })

  const perHeaderConfigs = computed<Record<string, HeaderColumnConfig>>(() => {
    if (options.isColorByMode.value) return {}
    const result: Record<string, HeaderColumnConfig> = {}
    options.yAxisList.value?.forEach((yAxis, yIndex) => {
      const visibleValues = getVisibleValues(yAxis.values)
      const configs = buildHeaderColumnConfigs(visibleValues)
      Object.entries(configs).forEach(([key, config]) => {
        result[`${yIndex}-${key}`] = config
      })
    })
    return result
  })

  const getRowConfig = (
    yIndex: number,
    headerValue: string
  ): HeaderColumnConfig | null => {
    if (options.isColorByMode.value) return null
    return perHeaderConfigs.value[`${yIndex}-${headerValue}`] ?? null
  }

  const getRowIsNarrow = (
    yIndex: number,
    headerValue: string
  ): boolean => {
    if (!isNarrowCell.value) return isNarrowCell.value
    return getRowConfig(yIndex, headerValue)?.isNarrowMode ?? false
  }

  const getRowColumnWidth = (
    yIndex: number,
    headerValue: string,
    isVertical: boolean
  ): number => {
    if (!isNarrowCell.value) return autoColumnWidth.value
    const config = getRowConfig(yIndex, headerValue)
    if (!config) return autoColumnWidth.value
    return config.isNarrowMode && isVertical
      ? config.denseColumnWidth
      : config.autoColumnWidth
  }

  const isRowCellVisible = (
    yIndex: number,
    headerValue: string,
    index: number,
    isVertical: boolean
  ): boolean => {
    if (!isNarrowCell.value) return isColumnVisible(index)
    const config = getRowConfig(yIndex, headerValue)
    if (!config) return isColumnVisible(index)
    return config.isNarrowMode && isVertical
      ? config.denseVisibleColumns.includes(index)
      : config.visibleColumns.includes(index)
  }

  const getRowCellGroups = (
    yIndex: number,
    yAxis: YAxisTableItem,
    header: TableHeader
  ) => {
    const values = getVisibleValues(yAxis.values)
    if (!isNarrowCell.value) return getCellGroups(values, header)
    const config = getRowConfig(yIndex, header.value)
    if (!config) return getCellGroups(values, header)
    return getHeaderCellGroups({ [header.value]: config }, values, header)
  }

  const getRowGroupBgColor = (
    yAxis: YAxisTableItem,
    gIdx: number,
    yIndex: number,
    headerValue: string
  ) => {
    if (!yAxis.cellBgColors?.length) return yAxis.bgColor ?? 'transparent'
    const config = getRowConfig(yIndex, headerValue)
    if (!config || !isNarrowCell.value) {
      const size = groupSize.value
      const cols = (options.categories.value || [])
        .map((_, idx) => idx)
        .filter((idx) => isDenseColumnVisible(idx))
      const firstIdx = cols[gIdx * size]
      if (firstIdx === undefined) return yAxis.bgColor ?? 'transparent'
      return yAxis.cellBgColors[firstIdx] ?? yAxis.bgColor ?? 'transparent'
    }

    const cols = config.denseVisibleColumns
    const angle = getHeaderTiltAngle(headerValue)
    const total = options.categories.value?.length || 0
    const containerWidth = chartRef.value?.getDom()?.clientWidth || 0
    const availableWidth =
      tablePosition.width > 0
        ? tablePosition.width * total
        : containerWidth - tablePosition.marginLeft - 20

    let rowMaxCellTextLength = 0
    getVisibleValues(yAxis.values).forEach((item) => {
      const text = String(item[headerValue] ?? '')
      if (text.length > rowMaxCellTextLength) rowMaxCellTextLength = text.length
    })

    const sparseState = calculateColumnState({
      enabled: true,
      totalColumns: total,
      originWidth: tablePosition.width,
      containerWidth,
      marginLeft: tablePosition.marginLeft,
      maxTextLength: maxTextLength.value,
      maxCellTextLength: rowMaxCellTextLength,
      categoryLayout: 'tilted',
      categoryTiltAngle: angle,
      fontSize: textDivStyle.fontSize,
      narrowMode: true
    })

    const size =
      config.denseColumnWidth > 0
        ? Math.max(
            1,
            Math.round(sparseState.autoColumnWidth / config.denseColumnWidth)
          )
        : 1

    const firstIdx = cols[gIdx * size]
    if (firstIdx === undefined) return yAxis.bgColor ?? 'transparent'
    return yAxis.cellBgColors[firstIdx] ?? yAxis.bgColor ?? 'transparent'
  }

  const rowHeights = computed(() => {
    const heights: Record<string, number> = {}
    options.yAxisList.value?.forEach((yAxis, yIndex) => {
      const visibleValues = getVisibleValues(yAxis.values)
      const axisHeights = buildRowHeights(
        visibleValues,
        (header) => `${yIndex}-${header.value}`
      )
      Object.assign(heights, axisHeights)
    })
    return heights
  })

  watch(chartRef, (chart) => {
    if (chart) {
      bindResizeObserver()
    }
  })

  return {
    visibleCategories,
    getVisibleValues,
    visibleStartIndex,
    maxCellTextLength,
    tablePosition,
    textDivStyle,
    getHeaderLayout,
    getHeaderTiltAngle,
    isNarrowMode,
    isNarrowCell,
    autoColumnWidth,
    denseColumnWidth,
    sparseColumnWidth,
    isColumnVisible,
    isDenseColumnVisible,
    groupSize,
    getCellGroups,
    getHeaderCellGroups,
    getRowConfig,
    getRowIsNarrow,
    getRowColumnWidth,
    isRowCellVisible,
    getRowCellGroups,
    getRowGroupBgColor,
    rowHeights,
    bindResizeObserver
  }
}
