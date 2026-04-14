<template>
  <div
    class="text-div-container"
    :class="`layout-${layout}`"
    :style="containerStyle"
  >
    <div
      class="text-content"
      :style="getTextStyle()"
      :title="text"
    >
      {{ String(text) }}
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    text: string
    width: number
    height: number
    layout: string
    fontSize: number
    tiltAngle?: number
  }>(),
  {
    layout: 'horizontal',
    tiltAngle: 45
  }
)

// 垂直布局：容器宽度变成内容所需高度
// 倾斜布局：容器高度需要容纳倾斜后的文本

const containerStyle = computed(() => {
  if (props.layout === 'vertical') {
    // 垂直布局：容器旋转90度后，需要的"宽度"就是文本占据的"高度"
    // 估算：文本长度 * 单字符宽度
    const charWidth = props.fontSize * 0.55
    const textWidth = String(props.text).length * charWidth
    return {
      width: `${props.width}px`,
      height: `${textWidth}px`,
      fontSize: `${props.fontSize}px`
    }
  }

  if (props.layout === 'tilted') {
    // 倾斜布局：高度需要能容纳倾斜后的文本
    // 文本长度 * cos(角度) = 水平占用
    // 文本长度 * sin(角度) = 垂直占用
    // 但由于容器有固定宽度，需要综合计算
    const charWidth = props.fontSize * 0.55
    const textWidth = String(props.text).length * charWidth
    // 倾斜后占据的垂直空间
    const tiltRadian = (props.tiltAngle * Math.PI) / 180
    const verticalSpace = textWidth * Math.sin(tiltRadian)
    // 基础高度 + 倾斜额外空间
    const extraHeight = Math.max(0, verticalSpace - props.width * 0.3)
    return {
      width: `${props.width}px`,
      height: `${Math.max(props.height, extraHeight + 8)}px`,
      fontSize: `${props.fontSize}px`
    }
  }

  // 水平布局
  return {
    width: `${props.width}px`,
    height: `${props.height}px`,
    fontSize: `${props.fontSize}px`
  }
})

const getTextStyle = () => {
  if (props.layout === 'vertical') {
    return {
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      width: `${props.height - 4}px`,
      textAlign: 'center',
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%) rotate(-90deg)',
      transformOrigin: 'center center'
    }
  }

  if (props.layout === 'tilted') {
    return {
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: `translate(-50%, -50%) rotate(-${props.tiltAngle}deg)`,
      transformOrigin: 'center center',
      maxWidth: `${props.height - 4}px`,
      textAlign: 'center'
    }
  }

  // horizontal
  return {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '100%',
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
