<script setup lang="ts">
import ChartCore from './ChartCore.vue';

defineProps<{
  config: { id: string; title: string };
}>();
</script>

<template>
  <div class="chart-slot">
    <div class="slot-header">{{ config.title }} — 中间层组件</div>
    <!-- 深层嵌套：继续向下传递 -->
    <ChartCore :chart-id="config.id" />
  </div>
</template>

<style scoped>
.chart-slot {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 12px;
  background: #fafafa;
}
.slot-header {
  font-size: 13px;
  color: #606266;
  margin-bottom: 8px;
  font-weight: 600;
}
</style>
