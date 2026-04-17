/**
 * 颜色工具函数集
 * 提供 HEX / RGB / HSL 之间的相互转换，以及基于基准色谱生成扩展颜色的能力
 */

// ECharts 默认色系，作为生成颜色的基准
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

/**
 * 将 HEX 颜色字符串转换为 RGB 对象
 * @param hex - 形如 #RRGGBB 的颜色字符串
 * @returns 包含 r/g/b 数值的对象
 */
export const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 0, g: 0, b: 0 }
}

/**
 * 将 RGB 数值转换为 HEX 颜色字符串
 * @param r - 红色通道 0-255
 * @param g - 绿色通道 0-255
 * @param b - 蓝色通道 0-255
 * @returns 形如 #RRGGBB 的颜色字符串
 */
export const rgbToHex = (r: number, g: number, b: number): string => {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = Math.round(x).toString(16)
        return hex.length === 1 ? '0' + hex : hex
      })
      .join('')
  )
}

/**
 * 将 RGB 颜色转换为 HSL 颜色空间
 * @param r - 红色通道 0-255
 * @param g - 绿色通道 0-255
 * @param b - 蓝色通道 0-255
 * @returns 包含 h(0-360)/s(0-100)/l(0-100) 的对象
 */
export const rgbToHsl = (
  r: number,
  g: number,
  b: number
): { h: number; s: number; l: number } => {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h /= 6
  }
  return { h: h * 360, s: s * 100, l: l * 100 }
}

/**
 * 将 HSL 颜色转换为 RGB 颜色空间
 * @param h - 色相 0-360
 * @param s - 饱和度 0-100
 * @param l - 亮度 0-100
 * @returns 包含 r/g/b 数值的对象
 */
export const hslToRgb = (
  h: number,
  s: number,
  l: number
): { r: number; g: number; b: number } => {
  h /= 360
  s /= 100
  l /= 100
  let r = 0
  let g = 0
  let b = 0
  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }
  return { r: r * 255, g: g * 255, b: b * 255 }
}

/**
 * 以基准色谱生成足够数量的颜色
 * 超出基准色数量的部分，按色谱从左到右依次生成深浅交替的变体
 * @param count - 需要生成的颜色数量
 * @returns HEX 颜色字符串数组
 */
export const generateColors = (count: number): string[] => {
  if (count <= legendColors.length) return legendColors.slice(0, count)
  const result = [...legendColors]
  let round = 1
  while (result.length < count) {
    for (let i = 0; i < legendColors.length && result.length < count; i++) {
      const rgb = hexToRgb(legendColors[i])
      const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
      const delta = round * 12
      if (round % 2 === 1) {
        hsl.l = Math.max(10, hsl.l - delta)
      } else {
        hsl.l = Math.min(90, hsl.l + delta)
      }
      const newRgb = hslToRgb(hsl.h, hsl.s, hsl.l)
      result.push(rgbToHex(newRgb.r, newRgb.g, newRgb.b))
    }
    round++
  }
  return result
}
