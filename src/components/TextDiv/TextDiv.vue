<template>
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
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    text: string
    width: number
    height: number
    layout: 'horizontal' | 'vertical' | 'tilted'
    fontSize: number
    tiltAngle?: number
    truncate?: boolean
  }>(),
  {
    layout: 'horizontal',
    tiltAngle: 45,
    truncate: true
  }
)

// vertical: container width becomes content required height
// tilted: container height needs to accommodate tilted text

const containerStyle = computed(() => {
  if (props.layout === 'vertical') {
    const charWidth = props.fontSize * 0.55
    const textWidth = String(props.text).length * charWidth
    return {
      width: `${props.width}px`,
      height: `${textWidth}px`,
      fontSize: `${props.fontSize}px`
    }
  }

  if (props.layout === 'tilted') {
    const charWidth = props.fontSize * 0.55
    const textWidth = String(props.text).length * charWidth
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

const getTextStyle = () => {
  if (props.layout === 'vertical') {
    const base: Record<string, string> = {
      width: `${props.height - 4}px`,
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
