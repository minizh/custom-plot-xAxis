import type {
  ChartDataItem,
  GroupResult,
  VisibleDomRange
} from '@/types/echarts'
import type { ECharts } from 'echarts'

export const sortAndGroupCount = (
  list: unknown,
  sortBy: string,
  groupKey: string,
  isSorted = true
): GroupResult[] => {
  if (!Array.isArray(list)) return []
  const sorted = isSorted
    ? [...list]
    : [...list].sort((a: ChartDataItem, b: ChartDataItem) => {
        if (a[sortBy] == null) return 1
        if (b[sortBy] == null) return -1
        return a[sortBy] > b[sortBy] ? 1 : -1
      })
  const result: GroupResult[] = []
  let currentGroup: GroupResult | null = null

  for (const item of sorted) {
    const dataItem = item as ChartDataItem
    const val = dataItem[groupKey]

    if (!currentGroup || currentGroup.value !== val) {
      currentGroup = {
        count: 0,
        value: val,
        originVal: dataItem
      }
      result.push(currentGroup)
    }

    currentGroup.count++
  }
  return result
}

export const parsePercentToPx = (
  val: string | number | null | undefined,
  base: number
): number => {
  if (val == null) return 0
  if (typeof val === 'number') return val
  const s = String(val).trim()
  if (s.endsWith('%')) return (parseFloat(s) / 100) * base
  // fallback: '20' / '20px'
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : 0
}

export const getConfiguredGridPx = (
  chart: ECharts,
  gridIndex: number,
  position: string
): number => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gridModel = (chart as any).getModel().getComponent('grid', gridIndex)
  const positionValue = gridModel?.get(position) as string | number | undefined
  const base = ['bottom', 'top'].includes(position)
    ? chart.getDom().clientHeight
    : chart.getDom().clientWidth
  return parsePercentToPx(positionValue, base)
}

export function getXAxisVisibleDomRange(
  chart: ECharts,
  xAxisIndex = 0
): VisibleDomRange {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const xAxisModel = (chart as any).getModel().getComponent('xAxis', xAxisIndex)
  const scale = xAxisModel?.axis?.scale
  if (!scale) {
    return { point: { left: 0, width: 0 } }
  }
  const [minV, maxV] = scale.getExtent() as [number, number]
  const firstIdx = Math.ceil(minV)
  const lastIdx = Math.floor(maxV)

  const firstCenter = chart.convertToPixel({ xAxisIndex }, firstIdx) as number
  const lastCenter = chart.convertToPixel({ xAxisIndex }, lastIdx) as number

  const left_pointRange = Math.min(firstCenter, lastCenter)
  const width_pointRange = Math.abs(lastCenter - firstCenter)

  return {
    point: { left: left_pointRange, width: width_pointRange }
  }
}

export const measureByDOM = (text: string, fontSize: number): number => {
  const span = document.createElement('span')
  span.style.visibility = 'hidden'
  span.style.position = 'absolute'
  span.style.whiteSpace = 'nowrap'
  span.style.fontSize = fontSize + 'px'
  span.innerText = text
  document.body.appendChild(span)
  const width = span.offsetWidth
  document.body.removeChild(span)
  return width
}

export const calculateLabelDisplay = (N: number, max: number): number[] => {
  if (N <= 0) return []
  if (N === 1) return [0]
  if (max <= 1) return [0]

  let bestSeq: number[] = []

  for (const T of [N - 1, N - 2]) {
    if (T < 0) continue
    if (T === 0) {
      if (bestSeq.length < 1) bestSeq = [0]
      continue
    }

    for (let S = 1; S <= T; S++) {
      if (T % S === 0) {
        const length = T / S + 1
        if (length <= max) {
          if (length > bestSeq.length) {
            const seq: number[] = []
            for (let i = 0; i <= T; i += S) {
              seq.push(i)
            }
            bestSeq = seq
          }
          break
        }
      }
    }
  }

  return bestSeq.length > 0 ? bestSeq : [0]
}

export const getDynamicCellStyle = (
  text: string,
  width: number,
  layout: 'horizontal' | 'vertical' | 'tilted',
  tiltAngle: number,
  fontSize: number
) => {
  const charWidth = fontSize * 0.55
  const textWidth = String(text).length * charWidth
  let contentHeight = fontSize
  if (layout === 'vertical') {
    contentHeight = textWidth
  } else if (layout === 'tilted') {
    const radian = (tiltAngle * Math.PI) / 180
    contentHeight = textWidth * Math.sin(radian)
  }
  const clearance = layout === 'horizontal' ? 2 : 3
  const minHeight = layout === 'horizontal' ? fontSize : 28
  const targetHeight = Math.max(minHeight, Math.ceil(contentHeight + clearance * 2))
  const padding = Math.max(0, Math.round((targetHeight - contentHeight) / 2))
  return {
    width: `${width}px`,
    minHeight: `${targetHeight}px`,
    height: targetHeight,
    padding: `${padding}px 0`
  }
}
