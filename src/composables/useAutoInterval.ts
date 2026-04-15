import { computed, ref, watch, type Ref } from 'vue'

export interface AutoIntervalOptions {
  enabled: boolean
  containerWidth: number
  marginLeft: number
  totalColumns: number
  maxTextLength: number
  categoryLayout: 'horizontal' | 'vertical' | 'tilted'
  categoryTiltAngle: number
  fontSize: number
  originWidth: number
}

export function useAutoInterval(options: Ref<AutoIntervalOptions>) {
  const visibleColumns = ref<number[]>([])
  const autoColumnWidth = ref(0)

  const charWidth = computed(() => options.value.fontSize * 0.55)
  const charHeight = computed(() => options.value.fontSize)

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

  const calculateVisibleColumns = () => {
    const opts = options.value
    if (!opts.enabled || opts.totalColumns <= 0) {
      visibleColumns.value = []
      autoColumnWidth.value = opts.originWidth
      return
    }

    const labelWidth = calculateLabelWidth(
      opts.categoryLayout,
      opts.categoryTiltAngle,
      opts.maxTextLength
    )

    const availableWidth = opts.containerWidth - opts.marginLeft - 20
    const minCellWidth = labelWidth + 4

    if (opts.totalColumns * minCellWidth <= availableWidth) {
      visibleColumns.value = Array.from(
        { length: opts.totalColumns },
        (_, i) => i
      )
      autoColumnWidth.value = opts.originWidth
      return
    }

    const maxVisibleColumns = Math.floor(availableWidth / minCellWidth)
    const visibleCount = Math.max(1, maxVisibleColumns)

    const selectedIndices: number[] = []
    const step = (opts.totalColumns - 1) / (visibleCount - 1)

    for (let i = 0; i < visibleCount; i++) {
      if (i === visibleCount - 1) {
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
      labelWidth,
      Math.floor(availableWidth / visibleCount)
    )
  }

  const isColumnVisible = (index: number): boolean => {
    if (!options.value.enabled || visibleColumns.value.length === 0) {
      return true
    }
    return visibleColumns.value.includes(index)
  }

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
