该场景是 **聚合型发布订阅 + 指令广播** 的经典案例，上述模块完全支持。设计思路如下：

- **子→父（注册聚合）**：每个孙子组件请求完数据后，通过 `chart:register` Topic 上报自己的 `seriesNames`。父组件订阅该 Topic，维护 `Set` 计数器，当收集数量等于预知的图表总数时，去重生成**共享图例**。
- **父→子（指令广播）**：父组件通过 `chart:legend` Topic 广播 `{ selectedMap }`。所有孙子组件订阅该 Topic，收到后调用 `echarts.dispatchAction({ type: 'legendSelect' | 'legendUnSelect' })` 同步显隐状态。
- **Topic 隔离**：注册通道与图例控制通道完全独立，互不干扰。

---

### 文件结构

```
src/
├── utils/
│   └── messageBus.ts      # 精简版 RxJS Bus + Vue3 Composables
├── api/
│   └── mockChart.ts       # Mock 后端并发请求
├── components/
│   ├── Container.vue      # 父容器：聚合器 + 共享图例
│   ├── ChartSlot.vue      # 中间层（模拟深层嵌套）
│   └── ChartCore.vue      # 孙子组件：ECharts 实例 + 独立请求
└── App.vue                # 入口，安装 Bus
```

---

### 1. `src/utils/messageBus.ts`（精简工程级实现）

```typescript
import { Subject } from 'rxjs';
import { share } from 'rxjs/operators';
import { inject, provide, readonly, shallowRef, onScopeDispose, type App, type InjectionKey } from 'vue';

/* ========== 类型定义 ========== */
export interface BusMessage<T> {
  id: string;
  topic: string;
  payload: T;
  meta?: { replyTo?: string; sender?: string };
}

export interface TopicDef<TIn, TOut> {
  downstream: TIn; // 发布者 → 订阅者
  upstream: TOut;  // 订阅者 → 发布者
}

/** 项目级 Topic 集中声明 */
export interface AppTopicMap {
  'chart:register': TopicDef<
    { chartId: string; seriesNames: string[] },
    { received: boolean }
  >;
  'chart:legend': TopicDef<
    { selectedMap: Record<string, boolean> },
    void
  >;
}

/* ========== Bus 核心 ========== */
class Channel<TIn, TOut> {
  private down = new Subject<BusMessage<TIn>>();
  private up = new Subject<BusMessage<TOut>>();
  downstream$ = this.down.pipe(share()); // 热广播，多订阅者共享
  upstream$ = this.up.asObservable();

  publish(payload: TIn, topic: string): BusMessage<TIn> {
    const msg: BusMessage<TIn> = {
      id: Math.random().toString(36).slice(2),
      topic,
      payload,
    };
    this.down.next(msg);
    return msg;
  }

  reply(payload: TOut, topic: string, replyTo?: string): BusMessage<TOut> {
    const msg: BusMessage<TOut> = {
      id: Math.random().toString(36).slice(2),
      topic,
      payload,
      meta: { replyTo },
    };
    this.up.next(msg);
    return msg;
  }
}

export class MessageBus {
  private topics = new Map<string, Channel<any, any>>();

  private ensure<K extends keyof AppTopicMap>(
    topic: K
  ): Channel<AppTopicMap[K]['downstream'], AppTopicMap[K]['upstream']> {
    const t = topic as string;
    if (!this.topics.has(t)) this.topics.set(t, new Channel());
    return this.topics.get(t)!;
  }

  publish<K extends keyof AppTopicMap>(topic: K, payload: AppTopicMap[K]['downstream']) {
    return this.ensure(topic).publish(payload, topic as string);
  }

  subscribe<K extends keyof AppTopicMap>(
    topic: K,
    handler: (
      msg: BusMessage<AppTopicMap[K]['downstream']>,
      reply: (p: AppTopicMap[K]['upstream']) => void
    ) => void
  ) {
    const ch = this.ensure(topic);
    const sub = ch.downstream$.subscribe((msg) => {
      const reply = (p: AppTopicMap[K]['upstream']) => ch.reply(p, topic as string, msg.id);
      handler(msg, reply);
    });
    return () => sub.unsubscribe();
  }

  onFeedback<K extends keyof AppTopicMap>(
    topic: K,
    handler: (msg: BusMessage<AppTopicMap[K]['upstream']>) => void
  ) {
    const sub = this.ensure(topic).upstream$.subscribe((msg) => handler(msg as any));
    return () => sub.unsubscribe();
  }
}

/* ========== Vue3 注入层 ========== */
export const BusKey: InjectionKey<MessageBus> = Symbol('MessageBus');
let globalBus: MessageBus | null = null;

export function installBus(app: App, bus?: MessageBus) {
  const instance = bus || new MessageBus();
  globalBus = instance;
  app.provide(BusKey, instance);
}

export function useMessageBus(): MessageBus {
  const bus = inject(BusKey, null) ?? globalBus;
  if (!bus) throw new Error('[useMessageBus] Bus 未安装，请先调用 installBus()');
  return bus;
}

export function usePublisher<K extends keyof AppTopicMap>(topic: K) {
  const bus = useMessageBus();
  return {
    publish: (payload: AppTopicMap[K]['downstream']) => bus.publish(topic, payload),
  };
}

export function useSubscriber<K extends keyof AppTopicMap>(
  topic: K,
  handler?: (
    msg: BusMessage<AppTopicMap[K]['downstream']>,
    reply: (p: AppTopicMap[K]['upstream']) => void
  ) => void
) {
  const bus = useMessageBus();
  const latest = shallowRef<BusMessage<AppTopicMap[K]['downstream']> | null>(null);
  const unsub = bus.subscribe(topic, (msg, reply) => {
    latest.value = msg;
    if (handler) handler(msg, reply);
  });
  onScopeDispose(unsub);
  return { latestMessage: readonly(latest) };
}
```

---

### 2. `src/api/mockChart.ts`（并发 Mock 后端）

```typescript
export interface ChartData {
  chartId: string;
  categories: string[];
  series: Array<{
    name: string;
    type: 'line' | 'bar';
    data: number[];
    itemStyle?: { color: string };
    lineStyle?: { color: string };
  }>;
}

/** 全局颜色映射：保证跨图表同 Series 名称颜色一致 */
export const COLOR_MAP: Record<string, string> = {
  指标A: '#5470c6',
  指标B: '#91cc75',
  指标C: '#fac858',
  指标D: '#ee6666',
  指标E: '#73c0de',
};

const POOL = Object.keys(COLOR_MAP);

/** 模拟独立后端请求：延迟 0.6~1.8s 随机，每个 chart 请求 2~3 个指标 */
export function fetchChartData(chartId: string): Promise<ChartData> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const count = 2 + Math.floor(Math.random() * 2);
      const shuffled = [...POOL].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, count);
      const categories = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

      resolve({
        chartId,
        categories,
        series: selected.map((name, idx) => {
          const color = COLOR_MAP[name];
          const type: 'line' | 'bar' = idx % 2 === 0 ? 'line' : 'bar';
          return {
            name,
            type,
            data: categories.map(() => Math.floor(Math.random() * 100)),
            itemStyle: { color },
            ...(type === 'line' ? { lineStyle: { color } } : {}),
          };
        }),
      });
    }, 600 + Math.random() * 1200);
  });
}
```

---

### 3. `src/components/ChartCore.vue`（孙子组件：ECharts + 独立请求）

```vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import * as echarts from 'echarts';
import { usePublisher, useSubscriber } from '@/utils/messageBus';
import { fetchChartData, COLOR_MAP } from '@/api/mockChart';

const props = defineProps<{ chartId: string }>();

const chartRef = ref<HTMLDivElement>();
let chartInstance: echarts.ECharts | null = null;

/* 1. 向父组件注册的能力（发布者） */
const { publish: registerChart } = usePublisher('chart:register');

/* 2. 接收父组件图例指令（订阅者） */
useSubscriber('chart:legend', (msg) => {
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
  <div ref="chartRef" class="chart-core" />
</template>

<style scoped>
.chart-core {
  width: 100%;
  height: 280px;
}
</style>
```

---

### 4. `src/components/ChartSlot.vue`（中间层：模拟深层嵌套）

```vue
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
```

---

### 5. `src/components/Container.vue`（父容器：聚合器 + 共享图例）

```vue
<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';
import { useMessageBus, usePublisher } from '@/utils/messageBus';
import { COLOR_MAP } from '@/api/mockChart';
import ChartSlot from './ChartSlot.vue';

/* 预定义子组件总数 —— 父组件据此判断“全部就绪” */
const chartConfigs = [
  { id: 'chart-sales', title: '销售趋势' },
  { id: 'chart-stock', title: '库存监控' },
  { id: 'chart-user', title: '用户增长' },
];

const bus = useMessageBus();

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
const { publish: publishLegend } = usePublisher('chart:legend');

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
    </div>

    <!-- 共享图例：所有子组件就绪后渲染 -->
    <div v-if="allReady" class="shared-legend-panel">
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
```

---

### 6. `src/App.vue`（入口）

```vue
<script setup lang="ts">
import { onMounted } from 'vue';
import { installBus } from '@/utils/messageBus';
import Container from './components/Container.vue';

onMounted(() => {
  /* 实际应在 main.ts 中 app.use()，此处演示生命周期 */
});
</script>

<template>
  <Container />
</template>
```

---

### 7. `src/main.ts`（项目入口，安装 Bus）

```typescript
import { createApp } from 'vue';
import App from './App.vue';
import { installBus } from './utils/messageBus';

const app = createApp(App);
installBus(app); // 全局安装消息总线
app.mount('#app');
```

---

### 运行效果说明

1. **并发请求**：3 个 `ChartCore` 孙子组件同时 `fetchChartData`，各自独立 loading。
2. **聚合注册**：父组件 `Container` 通过 `chart:register` 收集每个孙子上报的 `seriesNames`，去重后得到 `[指标A, 指标B, 指标C...]`。
3. **共享图例**：当 `registeredSet.size === 3` 时，渲染底部共享图例，颜色与 ECharts 内部 series 严格一致。
4. **指令广播**：点击共享图例的“指标A”，父组件通过 `chart:legend` Topic 广播 `{ selectedMap: { 指标A: false, ... } }`。所有孙子组件收到后，对内部 ECharts 实例执行 `dispatchAction(legendUnSelect)`，**跨组件同步隐藏**同名 series。

如需扩展为 **微前端多实例** 或 **跨窗口 BroadcastChannel**，只需在 `MessageBus` 中增加 `TransportAdapter` 拦截 `downstream$ / upstream$` 即可，上层 Topic 与 Vue Composable 完全无感。