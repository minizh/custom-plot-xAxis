export const sortAndGroupCount = (list, sortBy, groupKey, isSorted = true) => {
  if (!Array.isArray(list)) return []
  const sorted = isSorted
    ? [...list]
    : [...list].sort((a, b) => {
        if (a[sortBy] == null) return 1
        if (b[sortBy] == null) return -1
        return a[sortBy] > b[sortBy] ? 1 : -1
      })
  const result = []
  let currentGroup = null

  for (const item of sorted) {
    const val = item[groupKey]

    if (!currentGroup || currentGroup.value !== val) {
      currentGroup = {
        count: 0,
        value: val,
        originVal: item
      }
      result.push(currentGroup)
    }

    currentGroup.count++
    // currentGroup.items.push(item)
  }
  return result
}

export const parsePercentToPx = (val, base) => {
  if (val == null) return 0
  if (typeof val === 'number') return val
  const s = String(val).trim()
  if (s.endsWith('%')) return (parseFloat(s) / 100) * base
  // 兜底：'20' / '20px'
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : 0
}

export const getConfiguredGridPx = (chart, gridIndex, position) => {
  const gridModel = chart.getModel().getComponent('grid', gridIndex)
  const positionValue = gridModel?.get(position) // 可能是 '2%' 或 20
  // 用 chart 的实际内容高度做基准（clientHeight 会包含 padding，所以最好保证 chartDom 无 padding）
  const base = ['bottom', 'top'].includes(position)
    ? chart.getDom().clientHeight
    : chart.getDom().clientWidth
  return parsePercentToPx(positionValue, base)
}

export function getXAxisVisibleDomRange(chart, xAxisIndex = 0) {
  const xAxisModel = chart.getModel().getComponent('xAxis', xAxisIndex)
  const scale = xAxisModel.axis.scale
  const [minV, maxV] = scale.getExtent() // category 下通常是 index 范围
  const firstIdx = Math.ceil(minV)
  const lastIdx = Math.floor(maxV)

  // https://juejin.cn/post/7567768197685624859  将坐标数据转换为像素数据
  const firstCenter = chart.convertToPixel({ xAxisIndex }, firstIdx)
  const lastCenter = chart.convertToPixel({ xAxisIndex }, lastIdx)

  // 1) 若你想对齐「点落点范围」：left=firstCenter，width=lastCenter-firstCenter
  const left_pointRange = Math.min(firstCenter, lastCenter)
  const width_pointRange = Math.abs(lastCenter - firstCenter)

  return {
    point: { left: left_pointRange, width: width_pointRange }
  }
}

export const measureByDOM = (text, fontSize) => {
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

export const calculateLabelDisplay = (N, max) => {
  if (N <= 0) return []
  if (N === 1) return [0]
  if (max <= 1) return [0]

  let bestSeq = []

  // 尝试以 N-1 和 N-2 作为最后一项 (Target)
  for (const T of [N - 1, N - 2]) {
    if (T < 0) continue
    if (T === 0) {
      if (bestSeq.length < 1) bestSeq = [0]
      continue
    }

    // 寻找最小的正整数步长 S，使得 T % S === 0 且生成的长度 (T/S + 1) <= max
    // 最小步长能保证在满足 max 限制下获得最长的等差数列
    for (let S = 1; S <= T; S++) {
      if (T % S === 0) {
        const length = T / S + 1
        if (length <= max) {
          // 如果这个方案生成的长度比之前的更好，则采纳
          if (length > bestSeq.length) {
            const seq = []
            for (let i = 0; i <= T; i += S) {
              seq.push(i)
            }
            bestSeq = seq
          }
          break // 已经找到该 Target 下的最小步长，跳出当前 S 循环
        }
      }
    }
  }

  return bestSeq.length > 0 ? bestSeq : [0]
}
