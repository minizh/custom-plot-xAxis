import { computed, ref, watch, type Ref } from 'vue'

export interface AutoIntervalOptions {
  enabled: boolean
  containerWidth: number
  marginLeft: number
  totalColumns: number
  maxTextLength: number
  maxCellTextLength?: number
  categoryLayout: 'horizontal' | 'vertical' | 'tilted'
  categoryTiltAngle: number
  fontSize: number
  originWidth: number
  narrowMode?: boolean
}

/**
 * Composable: 根据容器宽度和标签布局自动计算可见列索引与列宽
 * 用于表格轴/自定义 X 轴在空间不足时自动间隔显示，防止标签重叠
 */
export function useAutoInterval(options: Ref<AutoIntervalOptions>) {
  // 当前可见的列索引数组
  const visibleColumns = ref<number[]>([])
  // 计算后的单列宽度（像素）
  const autoColumnWidth = ref(0)

  // 单个字符的估算宽度（按字体大小的 0.55 倍）
  const charWidth = computed(() => options.value.fontSize * 0.55)
  // 字符高度直接等于字体大小
  const charHeight = computed(() => options.value.fontSize)

  /**
   * 根据布局方式计算标签的占位宽度
   * - horizontal: 文本总宽度
   * - vertical: 字符高度（即竖排时占用的水平宽度）
   * - tilted: 倾斜后文本在水平方向的投影宽度 + 高度投影
   */
  const calculateLabelWidth = (
    layout: 'horizontal' | 'vertical' | 'tilted',
    tiltAngle: number,
    textLength: number
  ): number => {
    const cw = charWidth.value
    const ch = charHeight.value

    switch (layout) {
      case 'vertical':
        return ch
      case 'tilted': {
        const radian = (tiltAngle * Math.PI) / 180
        return textLength * cw * Math.cos(radian) + ch * Math.sin(radian)
      }
      case 'horizontal':
      default:
        return textLength * cw
    }
  }

  /**
   * 核心计算：在可用宽度内均匀选取可见列，保证列宽至少能容纳标签
   */
  const calculateVisibleColumns = () => {
    const opts = options.value
    if (!opts.enabled || opts.totalColumns <= 0) {
      visibleColumns.value = []
      autoColumnWidth.value = opts.originWidth
      return
    }

    const textLength = Math.max(
      opts.maxTextLength,
      opts.maxCellTextLength || 0
    )

    const labelWidth = calculateLabelWidth(
      opts.categoryLayout,
      opts.categoryTiltAngle,
      textLength
    )

    // 可用宽度 = 容器宽 - 左边距 - 预留边距
    const availableWidth = opts.containerWidth - opts.marginLeft - 20
    let minCellWidth = labelWidth + 4
    if (opts.narrowMode) {
      if (opts.categoryLayout === 'tilted') {
        minCellWidth = Math.ceil(labelWidth * 1.2 + 4)
      } else if (opts.categoryLayout === 'vertical') {
        minCellWidth = labelWidth
      }
      // narrowMode 下，兜底约束 horizontal 布局的单元格文本宽度
      // 防止数据行因列宽过小而文本重叠
      if (opts.maxCellTextLength && opts.maxCellTextLength > 0) {
        const horizontalWidth = opts.maxCellTextLength * charWidth.value + 4
        if (horizontalWidth > minCellWidth) {
          minCellWidth = horizontalWidth
        }
      }
    }

    // 若所有列都能放下，则全部显示
    if (opts.totalColumns * minCellWidth <= availableWidth) {
      visibleColumns.value = Array.from(
        { length: opts.totalColumns },
        (_, i) => i
      )
      autoColumnWidth.value = opts.originWidth
      return
    }

    // 否则计算最多能显示多少列，并均匀采样
    const maxVisibleColumns = Math.floor(availableWidth / minCellWidth)
    const visibleCount = Math.max(1, maxVisibleColumns)

    const selectedIndices: number[] = []
    const step = (opts.totalColumns - 1) / (visibleCount - 1)

    for (let i = 0; i < visibleCount; i++) {
      if (i === visibleCount - 1) {
        // 最后一列固定取末尾，保证范围完整
        selectedIndices.push(opts.totalColumns - 1)
      } else {
        const index = Math.round(i * step)
        if (!selectedIndices.includes(index)) {
          selectedIndices.push(index)
        }
      }
    }

    visibleColumns.value = selectedIndices.sort((a, b) => a - b)
    autoColumnWidth.value = Math.max(
      Math.ceil(labelWidth),
      Math.floor(availableWidth / visibleCount)
    )
  }

  /**
   * 判断指定列索引是否在可见列表中
   */
  const isColumnVisible = (index: number): boolean => {
    if (!options.value.enabled || visibleColumns.value.length === 0) {
      return true
    }
    return visibleColumns.value.includes(index)
  }

  // 监听配置变化，自动重新计算
  watch(
    () => options.value,
    () => {
      calculateVisibleColumns()
    },
    { deep: true }
  )

  return {
    visibleColumns,
    autoColumnWidth,
    calculateVisibleColumns,
    isColumnVisible
  }
}
