<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import * as echarts from 'echarts';
import { usePublisher, useSubscriber } from '@/utils/rxjs-message-bus';
import { fetchChartData, COLOR_MAP } from './mockChart';

const props = defineProps<{ chartId: string }>();

const chartRef = ref<HTMLDivElement>();
let chartInstance: echarts.ECharts | null = null;

/* 1. 向父组件注册的能力（发布者） */
const { publish: registerChart } = usePublisher('chart:register');

/* 2. 接收父组件图例指令（订阅者） */
const { latestMessage: latestLegend } = useSubscriber('chart:legend', (msg) => {
  if (!chartInstance) return;
  const { selectedMap } = msg.payload;

  Object.entries(selectedMap).forEach(([name, selected]) => {
    // 仅当本图表存在该 series 时才执行（ECharts 会自动忽略不存在的 name）
    chartInstance!.dispatchAction({
      type: selected ? 'legendSelect' : 'legendUnSelect',
      name,
    });
  });
});

onMounted(async () => {
  // 演示 ReplaySubject 效果：即使父组件在子组件挂载前已发布消息，
  // latestLegend 仍能立即拿到缓存的最新值
  if (latestLegend.value) {
    console.log(
      `[${props.chartId}] 挂载时立即收到缓存的图例状态（ReplaySubject）:`,
      latestLegend.value.payload
    );
  }

  chartInstance = echarts.init(chartRef.value!);
  chartInstance.showLoading({ text: '数据请求中...' });

  /* 独立向后端并发请求 */
  const data = await fetchChartData(props.chartId);

  const option: echarts.EChartsOption = {
    title: { text: props.chartId, left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: data.categories },
    yAxis: { type: 'value' },
    legend: { show: false }, // 隐藏内置图例，使用父级共享图例
    series: data.series,
  };

  chartInstance.setOption(option);
  chartInstance.hideLoading();

  /* 请求完成后向父组件上报：我就绪了，我的 series 有这些 */
  const seriesNames = data.series.map((s) => s.name);
  registerChart({ chartId: props.chartId, seriesNames });

  /* 窗口自适应 */
  const onResize = () => chartInstance?.resize();
  window.addEventListener('resize', onResize);
  onUnmounted(() => window.removeEventListener('resize', onResize));
});

onUnmounted(() => {
  chartInstance?.dispose();
  chartInstance = null;
});
</script>

<template>
  <div class="chart-core-wrapper">
    <div v-if="latestLegend" class="replay-badge">
      ✓ 已自动同步历史图例状态（ReplaySubject）
    </div>
    <div ref="chartRef" class="chart-core" />
  </div>
</template>

<style scoped>
.chart-core-wrapper {
  width: 100%;
}
.replay-badge {
  font-size: 12px;
  color: #67c23a;
  background: #f0f9eb;
  border: 1px solid #e1f3d8;
  border-radius: 4px;
  padding: 4px 8px;
  margin-bottom: 6px;
  display: inline-block;
}
.chart-core {
  width: 100%;
  height: 280px;
}
</style>
