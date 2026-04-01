<template>
  <div
    class="rotate-wrap"
    v-if="layout === 'vertical'"
    :style="{
      width: `${width}px`,
      height: `${height}px`,
      fontSize: `${fontSize}px`
    }"
  >
    <div
      class="rotate-box"
      :style="{
        maxWidth: `${height - 16}px`
      }"
      :title="text"
    >
      {{ String(text) }}
    </div>
  </div>
  <div
    class="horizontal-text"
    v-if="layout === 'horizontal'"
    :style="{
      width: `${width}px`,
      height: `${height}px`,
      fontSize: `${fontSize}px`
    }"
  >
    <div class="center-text" :title="text">
      {{ String(text) }}
    </div>
  </div>
</template>
<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    text: string
    width: number
    height: number
    layout: string
    fontSize: number
  }>(),
  {
    layout: 'horizontal'
  }
)
</script>
<style scoped>
/* 外层：控制旋转 & 居中 */
.rotate-wrap {
  position: relative;
}

/* 内层：负责文字省略 */
.rotate-box {
  max-width: 180px; /* 这是“省略发生的长度” */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  position: absolute;
  top: 50%;
  left: 50%;

  /* 关键：先居中，再旋转 */
  transform: translate(-50%, -50%) rotate(-90deg);
  transform-origin: center;
}

.horizontal-text {
  display: flex; /* Flex布局 */
  justify-content: center; /* 水平居中 */
  align-items: center; /* 垂直居中 */
  .center-text {
    white-space: nowrap; /* 禁止换行 */
    overflow: hidden; /* 隐藏溢出 */
    text-overflow: ellipsis; /* 显示省略号 */
    max-width: 100%; /* 限制文本最大宽度 */
  }
}
</style>
