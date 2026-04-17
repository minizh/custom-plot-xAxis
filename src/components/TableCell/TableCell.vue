<template>
  <!--
    表格单元格通用组件
    封装了动态计算单元格样式（宽度、高度、padding）以及 TextDiv 渲染逻辑，
    用于替代 TableXAxis 和 MultiYAxisTable 中大量重复的单元格模板代码。
  -->
  <div class="table-cell-div" :class="cellClass" :style="computedStyle">
    <TextDiv
      :text="String(text)"
      :layout="layout"
      :width="width"
      :height="cellHeight"
      :font-size="fontSize"
      :tilt-angle="tiltAngle"
      :truncate="truncate"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import TextDiv from '@/components/TextDiv/TextDiv.vue'
import { getDynamicCellStyle } from '@/utils/chart-util'

const props = withDefaults(
  defineProps<{
    /** 单元格显示的文本内容 */
    text: string | number
    /** 文本布局方式：水平 / 垂直 / 倾斜 */
    layout: 'horizontal' | 'vertical' | 'tilted'
    /** 单元格宽度（像素） */
    width: number
    /** 字体大小（像素） */
    fontSize: number
    /** 倾斜角度（仅在 layout 为 tilted 时有效） */
    tiltAngle?: number
    /** 强制指定的高度（用于统一行高） */
    forcedHeight?: number
    /** 是否对溢出文本进行截断显示省略号 */
    truncate?: boolean
    /** 额外的 CSS 类名 */
    cellClass?: string
    /** 额外的内联样式（如 backgroundColor） */
    extraStyle?: Record<string, string | number>
  }>(),
  {
    tiltAngle: 45,
    forcedHeight: undefined,
    truncate: false,
    cellClass: '',
    extraStyle: () => ({})
  }
)

/**
 * 根据文本内容、布局、宽度等参数动态计算单元格样式
 */
const cellStyle = computed(() =>
  getDynamicCellStyle(
    String(props.text),
    props.width,
    props.layout,
    props.tiltAngle,
    props.fontSize,
    props.forcedHeight
  )
)

/**
 * 提取计算后的单元格高度，传递给 TextDiv 组件
 */
const cellHeight = computed(() => cellStyle.value.height as number)

/**
 * 合并动态样式与外部传入的额外样式
 */
const computedStyle = computed(() => ({
  width: cellStyle.value.width,
  minHeight: cellStyle.value.minHeight,
  height: cellStyle.value.height + 'px',
  padding: cellStyle.value.padding,
  ...props.extraStyle
}))
</script>

<style scoped>
.table-cell-div {
  border: 1px solid #000;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
</style>
