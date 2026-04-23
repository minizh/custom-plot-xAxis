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
 * 列宽计算选项
 */
export interface ColumnStateOptions {
  enabled: boolean
  totalColumns: number
  originWidth: number
  containerWidth: number
  marginLeft: number
  maxTextLength: number
  maxCellTextLength?: number
  categoryLayout: 'horizontal' | 'vertical' | 'tilted'
  categoryTiltAngle: number
  fontSize: number
  narrowMode?: boolean
}

/**
 * 列宽计算结果
 */
export interface ColumnStateResult {
  visibleColumns: number[]
  autoColumnWidth: number
}

/**
 * 根据布局方式计算标签的占位宽度
 * - horizontal: 文本总宽度
 * - vertical: 字符高度（即竖排时占用的水平宽度）
 * - tilted: 倾斜后文本在水平方向的投影宽度 + 高度投影
 */
const calculateLabelWidth = (
  layout: 'horizontal' | 'vertical' | 'tilted',
  tiltAngle: number,
  textLength: number,
  fontSize: number
): number => {
  const cw = fontSize * 0.55
  const ch = fontSize

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
 * 纯函数：根据容器宽度和标签布局计算可见列索引与列宽
 * 用于表格轴/自定义 X 轴在空间不足时自动间隔显示
 */
export const calculateColumnState = (
  options: ColumnStateOptions
): ColumnStateResult => {
  if (!options.enabled || options.totalColumns <= 0) {
    return { visibleColumns: [], autoColumnWidth: options.originWidth }
  }

  const textLength = Math.max(
    options.maxTextLength,
    options.maxCellTextLength || 0
  )

  const labelWidth = calculateLabelWidth(
    options.categoryLayout,
    options.categoryTiltAngle,
    textLength,
    options.fontSize
  )

  const availableWidth =
    options.originWidth > 0
      ? options.originWidth * options.totalColumns
      : options.containerWidth - options.marginLeft - 20

  let minCellWidth = labelWidth + 4
  if (options.narrowMode) {
    if (options.categoryLayout === 'tilted') {
      minCellWidth = Math.ceil(labelWidth * 1.2 + 4)
    } else if (options.categoryLayout === 'vertical') {
      minCellWidth = labelWidth
    }
    if (
      options.categoryLayout !== 'vertical' &&
      options.maxCellTextLength &&
      options.maxCellTextLength > 0
    ) {
      const charWidth = options.fontSize * 0.55
      const horizontalWidth = options.maxCellTextLength * charWidth + 4
      if (horizontalWidth > minCellWidth) {
        minCellWidth = horizontalWidth
      }
    }
  }

  // 若所有列都能放下，则全部显示
  if (options.totalColumns * minCellWidth <= availableWidth) {
    return {
      visibleColumns: Array.from(
        { length: options.totalColumns },
        (_, i) => i
      ),
      autoColumnWidth: availableWidth / options.totalColumns
    }
  }

  // 否则计算最多能显示多少列，并均匀采样
  const maxVisibleColumns = Math.floor(availableWidth / minCellWidth)
  const visibleCount = Math.max(1, maxVisibleColumns)

  const selectedIndices: number[] = []
  const step = (options.totalColumns - 1) / (visibleCount - 1)

  for (let i = 0; i < visibleCount; i++) {
    if (i === visibleCount - 1) {
      selectedIndices.push(options.totalColumns - 1)
    } else {
      const index = Math.round(i * step)
      if (!selectedIndices.includes(index)) {
        selectedIndices.push(index)
      }
    }
  }

  return {
    visibleColumns: selectedIndices.sort((a, b) => a - b),
    autoColumnWidth: availableWidth / visibleCount
  }
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
 * 判断字符是否为全角字符（CJK、全角标点、日文假名、韩文等）
 */
const isFullWidthChar = (char: string): boolean => {
  const code = char.charCodeAt(0)
  // CJK Unified Ideographs (常用汉字)
  if (code >= 0x4e00 && code <= 0x9fff) return true
  // CJK Unified Ideographs Extension A
  if (code >= 0x3400 && code <= 0x4dbf) return true
  // CJK Symbols and Punctuation
  if (code >= 0x3000 && code <= 0x303f) return true
  // Hiragana / Katakana
  if (code >= 0x3040 && code <= 0x30ff) return true
  // Fullwidth ASCII variants
  if (code >= 0xff01 && code <= 0xff5e) return true
  // Halfwidth Katakana
  if (code >= 0xff65 && code <= 0xff9f) return true
  // Hangul Syllables
  if (code >= 0xac00 && code <= 0xd7af) return true
  return false
}

/**
 * 根据字符类型估算文本像素宽度
 * - 中文/全角字符：按 fontSize 计算
 * - 空格：按 fontSize * 0.3 计算
 * - 其他半角字符（英文、数字、-、_、(、)、/ 等）：按 fontSize * 0.55 计算
 */
export const measureTextWidth = (text: string, fontSize: number): number => {
  let totalWidth = 0
  for (const char of text) {
    if (char === ' ') {
      totalWidth += fontSize * 0.3
    } else if (isFullWidthChar(char)) {
      totalWidth += fontSize
    } else {
      totalWidth += fontSize * 0.55
    }
  }
  return totalWidth
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
  const textWidth = measureTextWidth(String(text), fontSize)
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
