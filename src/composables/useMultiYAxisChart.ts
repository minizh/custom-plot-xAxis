import { HeaderLayout } from '@/types/echarts'
import { generateColors } from '@/utils/color-util'
import type { EChartsOption } from 'echarts'
import { computed, type Ref } from 'vue'

// ECharts 默认色系，用于多 Y 轴的默认配色
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

/** Color By 配置项 */
export interface ColorByConfig {
  field: string
}

/** 统计列配置项 */
export interface StatConfig {
  statFunc: string
  orientation: 'horizontal' | 'vertical' | 'tilted'
  customAngle: number
  format?: number
}

/** useMultiYAxisChart 的选项参数 */
export interface MultiYAxisChartOptions {
  yAxisLabels: Ref<string[]>
  rawValues: Ref<Record<string, unknown>[]>
  statConfigs: Ref<StatConfig[]>
  colorByConfigs: Ref<ColorByConfig[]>
  bgColorMode: Ref<'gray' | 'legend'>
}

/**
 * Composable: 封装多 Y 轴图表的配置计算逻辑
 * 包括：表头生成、Color By 分组、背景色计算、Y 轴数据列表生成、ECharts option 构建
 */
export function useMultiYAxisChart(options: MultiYAxisChartOptions) {
  const { yAxisLabels, rawValues, statConfigs, colorByConfigs, bgColorMode } = options

  /**
   * 根据 statConfigs 计算传给表格组件的表头配置
   */
  const computedHeaders = computed(() =>
    statConfigs.value.map((cfg, index) => ({
      value: cfg.statFunc + '_' + index,
      label: cfg.statFunc,
      format: cfg.format
    }))
  )

  /**
   * 判断是否处于 Color By 模式：单 Y 轴且配置了 Color By 字段
   */
  const isColorByMode = computed(() => {
    return yAxisLabels.value.length === 1 && colorByConfigs.value.length > 0
  })

  /**
   * 根据 colorByConfigs 提取单条数据的分组 key
   */
  const getColorByKey = (item: Record<string, unknown>) => {
    return colorByConfigs.value.map((cfg) => String(item[cfg.field] ?? '')).join(' | ')
  }

  /**
   * 计算 Color By 分组映射：key -> colorIndex
   * 相同字段组合的数据分配同一种颜色索引
   */
  const colorByGroupMap = computed(() => {
    if (!isColorByMode.value || !rawValues.value.length) return null
    const map = new Map<string, number>()
    rawValues.value.forEach((item) => {
      const key = getColorByKey(item)
      if (!map.has(key)) {
        map.set(key, map.size)
      }
    })
    return map
  })

  /**
   * 计算 Color By 模式下每个数据点对应的单元格背景色
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
   * 计算 Color By 图例分组列表（用于 ECharts legend 和空 series）
   */
  const computedColorByGroups = computed(() => {
    if (!colorByGroupMap.value) return []
    const map = colorByGroupMap.value
    const resolvedColors = generateColors(map.size)
    const groups: { name: string; color: string }[] = []
    map.forEach((colorIndex, key) => {
      groups.push({ name: key, color: resolvedColors[colorIndex] })
    })
    return groups
  })

  /**
   * 计算传给表格组件的各列布局配置（布局方式 + 倾斜角度）
   */
  const computedHeaderLayouts = computed(() => {
    const layouts: Record<string, HeaderLayout> = {}
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
   * 每个 Y 轴对应一组 values 和背景色，并为不同 Y 轴引入差异化数据避免折线重叠
   */
  const computedYAxisList = computed(() => {
    const headers = computedHeaders.value
    const baseValues = rawValues.value
    const labels = yAxisLabels.value
    if (!baseValues.length || !headers.length || !labels.length) return []

    const resolvedColors = generateColors(labels.length)

    return labels.map((label, idx) => {
      const values = baseValues.map((item) => {
        const obj: Record<string, unknown> = { name: item.name }
        headers.forEach((h) => {
          if (h.label === 'categoryRow') {
            obj[h.value] = String(item.name ?? '')
          } else {
            const raw = (item[h.label] as number) ?? 0
            // 为不同 Y 轴引入差异化数据，使折线不重叠
            let val: number | string =
              Math.floor(raw * (1 + idx * 0.3)) + idx * 10
            if (h.format !== undefined && h.format !== null) {
              val = Number(val).toFixed(h.format)
            }
            obj[h.value] = val
          }
        })
        return obj
      })

      const bgColor = bgColorMode.value === 'gray' ? '#f5f5f5' : resolvedColors[idx]

      return {
        name: label,
        headers,
        values,
        bgColor,
        cellBgColors: bgColorMode.value === 'legend' ? computedCellBgColors.value : undefined
      }
    })
  })

  /**
   * 获取第 idx 个 Y 轴对应的箱线图 dataset source 数据
   */
  const getBoxDatasetSource = (idx: number): [string | number, number, number, number, number, number][] => {
    return rawValues.value.map((item) => {
      const values = item.values as
        | [string | number, number, number, number, number, number][]
        | undefined
      const boxData = values?.[idx]
      return boxData ?? [String(item.name), 0, 0, 0, 0, 0]
    })
  }

  /**
   * 构建当前配置下的 ECharts option
   * 支持两种模式：
   * 1. Color By + Legend Color：单 Y 轴 + 箱体按 Color By 着色 + 空 line series 作为图例
   * 2. 默认多 Y 轴模式：左右交替布局的多 Y 轴 + 箱线图 series
   */
  const getOption = (): EChartsOption => {
    const labels = yAxisLabels.value

    // 构建每个 Y 轴对应的箱线图 dataset
    const boxDatasets = labels.map((_, idx) => ({
      source: getBoxDatasetSource(idx)
    }))

    // 模式一：Color By 模式且使用 Legend Color
    if (isColorByMode.value && bgColorMode.value === 'legend') {
      const colorByGroups = computedColorByGroups.value
      const series = [
        {
          name: labels[0],
          type: 'boxplot' as const,
          yAxisIndex: 0,
          datasetIndex: 0,
          encode: { x: 0, y: [1, 2, 3, 4, 5] },
          itemStyle: {
            color: (params: { dataIndex: number }) =>
              computedCellBgColors.value?.[params.dataIndex] || '#5470c6'
          }
        },
        ...colorByGroups.map((g) => ({
          name: g.name,
          type: 'line' as const,
          data: [],
          itemStyle: { color: g.color }
        }))
      ]

      return {
        title: { text: '多Y轴 + 统计值表示例', left: 'center' },
        tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
        legend: { data: colorByGroups.map((g) => g.name), top: 30 },
        dataset: boxDatasets.slice(0, 1),
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
            axisLine: { show: true, lineStyle: { color: legendColors[0] } },
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

    // 模式二：默认多 Y 轴模式
    const resolvedColors = generateColors(labels.length)
    const yAxis = labels.map((label, idx) => ({
      type: 'value' as const,
      name: label,
      position: (idx % 2 === 0 ? 'left' : 'right') as 'left' | 'right',
      axisLine: { show: true, lineStyle: { color: resolvedColors[idx] } },
      axisLabel: { color: resolvedColors[idx] }
    }))

    const series = labels.map((label, idx) => ({
      name: label,
      type: 'boxplot' as const,
      yAxisIndex: idx,
      datasetIndex: idx,
      encode: { x: 0, y: [1, 2, 3, 4, 5] } as any,
      itemStyle: { color: resolvedColors[idx] }
    }))

    return {
      title: { text: '多Y轴 + 统计值表示例', left: 'center' },
      tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
      legend: { data: labels, top: 30 },
      dataset: boxDatasets,
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

  return {
    computedHeaders,
    computedHeaderLayouts,
    computedYAxisList,
    computedCellBgColors,
    computedColorByGroups,
    isColorByMode,
    getOption,
    getBoxDatasetSource
  }
}
