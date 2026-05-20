<script setup lang="ts">
import { ref, computed, onUnmounted, onMounted } from 'vue';
import { provideMessageBus, usePublisher } from '@/utils/rxjs-message-bus';
import { COLOR_MAP } from './mockChart';
import ChartSlot from './ChartSlot.vue';

/* 预定义子组件总数 —— 父组件据此判断“全部就绪” */
const chartConfigs = [
  { id: 'chart-sales', title: '销售趋势' },
  { id: 'chart-stock', title: '库存监控' },
  { id: 'chart-user', title: '用户增长' },
];

/* 延迟渲染演示配置 */
const delayedConfig = { id: 'chart-delayed', title: '延迟加载（演示 ReplaySubject）' };
const showDelayedChart = ref(false);

/* 创建局部 Bus 实例：当前 Container 及其所有子孙组件共享，与其他 Container 完全隔离 */
const bus = provideMessageBus();

/* 初始化时立即发布默认图例状态（所有指标默认全选） */
/* 由于 downstream 使用 ReplaySubject(1)，后续延迟渲染的子组件挂载后仍能立即收到此消息 */
const defaultLegendState: Record<string, boolean> = {};
Object.keys(COLOR_MAP).forEach((name) => {
  defaultLegendState[name] = true;
});
bus.publish('chart:legend', { selectedMap: defaultLegendState });

/* 2 秒后演示延迟渲染：子组件挂载后能立即收到缓存的历史消息 */
onMounted(() => {
  setTimeout(() => {
    showDelayedChart.value = true;
    console.log('[Container] 延迟图表已渲染，ReplaySubject 会自动向其同步之前发布的图例状态');
  }, 2000);
});

/* 聚合状态 */
const registeredSet = ref(new Set<string>());
const allSeriesNames = ref<string[]>([]);
const legendSelected = ref<Record<string, boolean>>({});

/* 订阅子组件注册 Topic */
const unsubRegister = bus.subscribe('chart:register', (msg, reply) => {
  const { chartId, seriesNames } = msg.payload;

  if (!registeredSet.value.has(chartId)) {
    registeredSet.value.add(chartId);

    /* 去重合并 Series 名称，生成共享图例池 */
    seriesNames.forEach((name) => {
      if (!allSeriesNames.value.includes(name)) {
        allSeriesNames.value.push(name);
        legendSelected.value[name] = true; // 默认全选
      }
    });

    reply({ received: true });
  }
});

onUnmounted(() => unsubRegister());

/* 发布图例交互指令 */
const { publish: publishLegend } = usePublisher('chart:legend', { bus });

const toggleLegend = (name: string) => {
  legendSelected.value[name] = !legendSelected.value[name];
  /* 广播给所有孙子组件 */
  publishLegend({ selectedMap: { ...legendSelected.value } });
};

const allReady = computed(() => registeredSet.value.size === chartConfigs.length);
</script>

<template>
  <div class="container">
    <div class="header">
      <h2>Dashboard 聚合容器</h2>
      <div class="status-badge" :class="{ ready: allReady }">
        就绪进度：{{ registeredSet.size }} / {{ chartConfigs.length }}
      </div>
    </div>

    <!-- 深层嵌套图表区 -->
    <div class="charts-grid">
      <ChartSlot v-for="c in chartConfigs" :key="c.id" :config="c" />
      <ChartSlot v-if="showDelayedChart" :key="delayedConfig.id" :config="delayedConfig" />
    </div>

    <!-- 共享图例：所有子组件就绪后渲染 -->
    <div class="shared-legend-panel">
      <h4>共享图例（点击切换全局显隐）</h4>
      <div class="legend-items">
        <span
          v-for="name in allSeriesNames"
          :key="name"
          class="legend-item"
          :class="{ inactive: !legendSelected[name] }"
          @click="toggleLegend(name)"
        >
          <i class="dot" :style="{ backgroundColor: COLOR_MAP[name] }" />
          {{ name }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.status-badge {
  padding: 6px 14px;
  border-radius: 20px;
  background: #f56c6c;
  color: #fff;
  font-size: 13px;
  transition: background 0.3s;
}
.status-badge.ready {
  background: #67c23a;
}
.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}
.shared-legend-panel {
  border-top: 2px solid #dcdfe6;
  padding-top: 16px;
}
.shared-legend-panel h4 {
  margin: 0 0 12px;
  color: #303133;
}
.legend-items {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 4px;
  background: #f5f7fa;
  border: 1px solid #e4e7ed;
  cursor: pointer;
  user-select: none;
  font-size: 13px;
  transition: all 0.2s;
}
.legend-item:hover {
  background: #ecf5ff;
}
.legend-item.inactive {
  opacity: 0.4;
  text-decoration: line-through;
  background: #f0f0f0;
}
.dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
</style>
