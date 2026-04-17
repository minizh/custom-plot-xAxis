import type {
  ChartDataItem,
  GroupResult,
  VisibleDomRange
} from '@/types/echarts'
import type { ECharts } from 'echarts'

/**
 * 对列表按指定字段排序后分组计数
 * @param list - 待分组的数据列表
 * @param sortBy - 排序字段
 * @param groupKey - 分组字段
 * @param isSorted - 是否已排序（若未排序则自动排序）
 * @returns 分组结果数组
 */
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

/**
 * 将百分比字符串或像素值转换为像素数值
 * @param val - 原始值（如 '20%'、'20px'、20）
 * @param base - 百分比计算时的基准值
 * @returns 像素数值
 */
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

/**
 * 获取 ECharts grid 组件某一边距的像素值
 * @param chart - ECharts 实例
 * @param gridIndex - grid 索引
 * @param position - 边距属性名（如 'left'、'right'、'top'、'bottom'）
 * @returns 像素数值
 */
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

/**
 * 获取 X 轴当前可见范围的 DOM 像素位置
 * @param chart - ECharts 实例
 * @param xAxisIndex - X 轴索引
 * @returns 可见范围的 left 和 width
 */
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

/**
 * 通过临时 DOM 元素测量文本的像素宽度
 * @param text - 待测量文本
 * @param fontSize - 字体大小
 * @returns 文本像素宽度
 */
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

/**
 * 计算在最多显示 max 个标签时的最佳均匀采样索引序列
 * @param N - 总标签数
 * @param max - 最大可显示数量
 * @returns 应显示的索引数组
 */
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

/**
 * 根据文本内容、布局方式和容器宽度动态计算单元格样式
 * @param text - 单元格文本
 * @param width - 单元格宽度
 * @param layout - 文本布局方式
 * @param tiltAngle - 倾斜角度
 * @param fontSize - 字体大小
 * @param forcedHeight - 强制指定的高度（可选）
 * @returns 包含 width、minHeight、height、padding 的对象
 */
export const getDynamicCellStyle = (
  text: string,
  width: number,
  layout: 'horizontal' | 'vertical' | 'tilted',
  tiltAngle: number,
  fontSize: number,
  forcedHeight?: number
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
  const clearance = 2
  const minHeight = fontSize
  const targetHeight = Math.max(minHeight, Math.ceil(contentHeight + clearance * 2))
  const finalHeight = forcedHeight ? Math.max(targetHeight, forcedHeight) : targetHeight
  const padding = Math.max(0, Math.round((finalHeight - contentHeight) / 2))
  return {
    width: `${width}px`,
    minHeight: `${finalHeight}px`,
    height: finalHeight,
    padding: `${padding}px 0`
  }
}
