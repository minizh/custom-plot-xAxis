import type { HeaderLayout, TableHeader } from '@/types/echarts'
import { computed, type Ref } from 'vue'

export interface HeaderLayoutOptions {
  headers: Ref<TableHeader[]>
  labelLayout?: Ref<'horizontal' | 'vertical' | 'tilted'>
  labelTiltAngle?: Ref<number>
  categoryLayout?: Ref<'horizontal' | 'vertical' | 'tilted'>
  categoryTiltAngle?: Ref<number>
  headerLayouts?: Ref<Record<string, HeaderLayout>>
}

/**
 * Composable: 管理表格轴表头的布局配置
 * 处理独立 header 布局与全局布局的合并、以及类别行的有效布局推断
 */
export function useHeaderLayout(options: HeaderLayoutOptions) {
  const headersRef = options.headers
  const labelLayout = options.labelLayout ?? { value: 'horizontal' } as Ref<'horizontal' | 'vertical' | 'tilted'>
  const labelTiltAngle = options.labelTiltAngle ?? { value: 45 } as Ref<number>
  const categoryLayout = options.categoryLayout ?? { value: 'horizontal' } as Ref<'horizontal' | 'vertical' | 'tilted'>
  const categoryTiltAngle = options.categoryTiltAngle ?? { value: 45 } as Ref<number>
  const headerLayouts = options.headerLayouts ?? { value: {} } as Ref<Record<string, HeaderLayout>>

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

  return {
    getHeaderLayout,
    getHeaderTiltAngle,
    effectiveCategoryLayout,
    effectiveTiltAngle
  }
}
