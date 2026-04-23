<template>
  <!--
    文本渲染容器组件
    支持三种布局方式：水平(horizontal)、垂直(vertical)、倾斜(tilted)
    根据布局方式自动计算容器尺寸和文本旋转样式
  -->
  <div
    class="text-div-container"
    :class="`layout-${layout}`"
    :style="containerStyle"
  >
    <div class="text-content" :style="getTextStyle()" :title="text">
      {{ String(text) }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { measureTextWidth } from '@/utils/chart-util'
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    /** 显示的文本内容 */
    text: string
    /** 容器宽度（像素） */
    width: number
    /** 容器高度（像素） */
    height: number
    /** 文本布局方式 */
    layout: 'horizontal' | 'vertical' | 'tilted'
    /** 字体大小（像素） */
    fontSize: number
    /** 倾斜角度（仅在 tilted 布局时有效） */
    tiltAngle?: number
    /** 是否对溢出文本截断显示省略号 */
    truncate?: boolean
  }>(),
  {
    layout: 'horizontal',
    tiltAngle: 45,
    truncate: true
  }
)

/**
 * 计算容器的外层样式（宽度、高度、字体大小）
 * vertical 布局时：容器高度等于文本所需宽度
 * tilted 布局时：容器高度需要容纳倾斜后的文本
 */
const containerStyle = computed(() => {
  if (props.layout === 'vertical') {
    const textWidth = measureTextWidth(String(props.text), props.fontSize)
    return {
      width: `${props.width}px`,
      height: `${textWidth}px`,
      fontSize: `${props.fontSize}px`
    }
  }

  if (props.layout === 'tilted') {
    const textWidth = measureTextWidth(String(props.text), props.fontSize)
    const tiltRadian = (props.tiltAngle * Math.PI) / 180
    const verticalSpace = textWidth * Math.sin(tiltRadian)
    const extraHeight = Math.max(0, verticalSpace - props.width * 0.3)
    return {
      width: `${props.width}px`,
      height: `${Math.max(props.height, extraHeight + 8)}px`,
      fontSize: `${props.fontSize}px`
    }
  }

  // horizontal
  return {
    width: `${props.width}px`,
    height: `${props.height}px`,
    fontSize: `${props.fontSize}px`
  }
})

/**
 * 计算文本内容的内联样式（旋转、对齐、截断等）
 */
const getTextStyle = () => {
  if (props.layout === 'vertical') {
    const base: Record<string, string> = {
      width: `${props.height - 4}px`,
      whiteSpace: 'nowrap',
      textAlign: 'center',
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%) rotate(-90deg)',
      transformOrigin: 'center center'
    }
    if (props.truncate) {
      base.whiteSpace = 'nowrap'
      base.overflow = 'hidden'
      base.textOverflow = 'ellipsis'
    }
    return base
  }

  if (props.layout === 'tilted') {
    const base: Record<string, string> = {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: `translate(-50%, -50%) rotate(-${props.tiltAngle}deg)`,
      transformOrigin: 'center center',
      textAlign: 'center'
    }
    if (props.truncate) {
      base.whiteSpace = 'nowrap'
      base.overflow = 'hidden'
      base.textOverflow = 'ellipsis'
      base.maxWidth = `${props.height - 4}px`
    }
    return base
  }

  // horizontal
  return {
    whiteSpace: 'nowrap',
    textAlign: 'center'
  }
}
</script>

<style scoped>
.text-div-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.text-content {
  width: 100%;
  box-sizing: border-box;
}

.layout-vertical {
  position: relative;
}

.layout-tilted {
  position: relative;
}
</style>
