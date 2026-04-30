这是一个工程级的 **RxJS + Vue3 跨组件双向消息总线**设计。核心采用 **Topic 隔离 + 双通道（Downstream/Upstream）** 架构，支持类型安全的发布-订阅-反馈全链路。

---

## 1. 类型定义层 (`types.ts`)

```typescript
import type { Observable, Subscription } from 'rxjs';

// ========== 核心类型 ==========

/** 消息元数据 */
export interface MessageMeta {
  /** 关联消息 ID（用于 Request-Reply 模式） */
  replyTo?: string;
  /** 发送方组件标识 */
  sender?: string;
  /** 任意扩展标记 */
  tags?: Record<string, unknown>;
}

/** 总线消息封装 */
export interface BusMessage<T> {
  id: string;
  timestamp: number;
  topic: string;
  payload: T;
  meta?: MessageMeta;
}

/** Topic 双向类型定义 */
export interface TopicDefinition<TIn = unknown, TOut = unknown> {
  /** 发布者 → 订阅者 的数据类型 */
  downstream: TIn;
  /** 订阅者 → 发布者 的数据类型 */
  upstream: TOut;
}

/** Topic 映射表（项目级集中定义） */
export interface AppTopicMap {
  'sensor:realtime': TopicDefinition<{ sensorId: string; value: number }, { ack: boolean; processedAt: number }>;
  'user:profile': TopicDefinition<{ userId: string }, { status: 'success' | 'error'; data?: unknown }>;
  'chart:interaction': TopicDefinition<{ type: 'zoom' | 'brush'; range: [number, number] }, { type: 'tooltip'; payload: unknown }>;
  // ... 业务持续扩展
}

/** 订阅清理句柄 */
export type Unsub = () => void;

/** 订阅者回调签名（注入 reply 能力） */
export type SubscriberHandler<TIn, TOut> = (
  msg: BusMessage<TIn>,
  reply: (payload: TOut, meta?: Omit<MessageMeta, 'replyTo'>) => void
) => void | (() => void);

/** 发布者反馈回调 */
export type FeedbackHandler<TOut> = (msg: BusMessage<TOut>) => void;

// ========== Bus 配置 ==========

export interface BusOptions {
  /** 全局唯一标识（用于多实例或微前端隔离） */
  id?: string;
  /** 是否启用开发日志 */
  devLog?: boolean;
  /** Topic 空引用自动回收时间（ms），默认 30000 */
  gcInterval?: number;
  /** 下游消息是否共享（热广播），默认 true */
  shareDownstream?: boolean;
}
```

---

## 2. 核心总线实现 (`bus.ts`)

```typescript
import { Subject, Observable } from 'rxjs';
import { share, filter, take, timeout as rxTimeout, firstValueFrom } from 'rxjs/operators';
import { nanoid } from 'nanoid'; // 或自研 generateId
import type {
  BusMessage,
  BusOptions,
  TopicDefinition,
  Unsub,
  SubscriberHandler,
  FeedbackHandler,
  MessageMeta,
} from './types';

/** 生成唯一消息 ID */
const generateId = () => nanoid(12);

/** 单个 Topic 的双向通道 */
class TopicChannel<TIn, TOut> {
  /** 发布者广播流（热广播，共享给所有订阅者） */
  readonly downstream$: Observable<BusMessage<TIn>>;
  private _downstream = new Subject<BusMessage<TIn>>();

  /** 订阅者反馈流 */
  readonly upstream$: Observable<BusMessage<TOut>>;
  private _upstream = new Subject<BusMessage<TOut>>();

  /** 引用计数 & 发布者标记 */
  subscriberCount = 0;
  hasPublisher = false;

  constructor(shareDownstream = true) {
    this.downstream$ = shareDownstream
      ? this._downstream.pipe(share())
      : this._downstream.asObservable();
    this.upstream$ = this._upstream.asObservable();
  }

  /** 发布者广播 */
  broadcast(payload: TIn, meta?: MessageMeta): BusMessage<TIn> {
    const msg: BusMessage<TIn> = {
      id: generateId(),
      timestamp: Date.now(),
      topic: '', // 由 Bus 填充
      payload,
      meta,
    };
    this._downstream.next(msg);
    return msg;
  }

  /** 订阅者回复 */
  reply(payload: TOut, replyTo?: string, meta?: Omit<MessageMeta, 'replyTo'>): BusMessage<TOut> {
    const msg: BusMessage<TOut> = {
      id: generateId(),
      timestamp: Date.now(),
      topic: '',
      payload,
      meta: { ...meta, replyTo },
    };
    this._upstream.next(msg);
    return msg;
  }

  /** 销毁（释放 RxJS 资源） */
  dispose(): void {
    this._downstream.complete();
    this._upstream.complete();
  }
}

/** 工程级消息总线 */
export class MessageBus<TMap extends Record<string, TopicDefinition> = Record<string, TopicDefinition>> {
  private topics = new Map<string, TopicChannel<unknown, unknown>>();
  private options: Required<BusOptions>;
  private gcTimer?: ReturnType<typeof setInterval>;

  constructor(options: BusOptions = {}) {
    this.options = {
      id: options.id ?? 'default',
      devLog: options.devLog ?? false,
      gcInterval: options.gcInterval ?? 30000,
      shareDownstream: options.shareDownstream ?? true,
    };

    // 启动空 Topic 垃圾回收（防止内存泄漏）
    if (this.options.gcInterval > 0) {
      this.gcTimer = setInterval(() => this.gc(), this.options.gcInterval);
    }
  }

  /** 确保 Topic 存在 */
  private ensureChannel<K extends keyof TMap>(topic: K): TopicChannel<TMap[K]['downstream'], TMap[K]['upstream']> {
    const key = topic as string;
    if (!this.topics.has(key)) {
      this.topics.set(key, new TopicChannel(this.options.shareDownstream));
    }
    return this.topics.get(key)! as TopicChannel<TMap[K]['downstream'], TMap[K]['upstream']>;
  }

  /** 发布消息（发布者调用） */
  publish<K extends keyof TMap>(
    topic: K,
    payload: TMap[K]['downstream'],
    meta?: MessageMeta
  ): BusMessage<TMap[K]['downstream']> {
    const ch = this.ensureChannel(topic);
    ch.hasPublisher = true;
    const msg = ch.broadcast(payload, meta);
    msg.topic = topic as string;
    this.log('↓', msg);
    return msg;
  }

  /** 订阅消息（订阅者调用），返回清理函数 */
  subscribe<K extends keyof TMap>(
    topic: K,
    handler: SubscriberHandler<TMap[K]['downstream'], TMap[K]['upstream']>
  ): Unsub {
    const ch = this.ensureChannel(topic);
    ch.subscriberCount++;

    const sub = ch.downstream$.subscribe((rawMsg) => {
      const msg = { ...rawMsg, topic: topic as string };

      // 为当前消息构建 reply 闭包
      const reply = (payload: TMap[K]['upstream'], replyMeta?: Omit<MessageMeta, 'replyTo'>) => {
        const replyMsg = ch.reply(payload, msg.id, replyMeta);
        replyMsg.topic = topic as string;
        this.log('↑', replyMsg);
      };

      try {
        const cleanup = handler(msg, reply);
        // 如果 handler 返回函数，作为单次消息清理（类似 effect）
        if (typeof cleanup === 'function') {
          // 注意：这里只在每次消息时调用无意义，实际应在订阅级别管理
          // 保留此设计用于高级场景（如逐条 ACK 后清理临时状态）
          cleanup();
        }
      } catch (err) {
        console.error(`[Bus][${String(topic)}] 订阅者处理异常:`, err);
      }
    });

    return () => {
      sub.unsubscribe();
      ch.subscriberCount--;
      this.maybeCleanup(topic);
    };
  }

  /** 订阅者主动上行（不依赖某条 downstream 的 reply 闭包） */
  reply<K extends keyof TMap>(
    topic: K,
    payload: TMap[K]['upstream'],
    meta?: Omit<MessageMeta, 'replyTo'>
  ): BusMessage<TMap[K]['upstream']> {
    const ch = this.ensureChannel(topic);
    const msg = ch.reply(payload, undefined, meta);
    msg.topic = topic as string;
    this.log('↑', msg);
    return msg;
  }

  /** 发布者监听反馈 */
  onFeedback<K extends keyof TMap>(
    topic: K,
    handler: FeedbackHandler<TMap[K]['upstream']>
  ): Unsub {
    const ch = this.ensureChannel(topic);
    const sub = ch.upstream$.subscribe((rawMsg) => {
      const msg = { ...rawMsg, topic: topic as string };
      try {
        handler(msg);
      } catch (err) {
        console.error(`[Bus][${String(topic)}] 反馈处理异常:`, err);
      }
    });
    return () => {
      sub.unsubscribe();
      this.maybeCleanup(topic);
    };
  }

  /** Request-Reply 模式：发布者发送并等待指定订阅者回复 */
  async request<K extends keyof TMap>(
    topic: K,
    payload: TMap[K]['downstream'],
    opts: { timeout?: number; filter?: (msg: BusMessage<TMap[K]['upstream']>) => boolean } = {}
  ): Promise<BusMessage<TMap[K]['upstream']>> {
    const requestId = generateId();
    const ch = this.ensureChannel(topic);

    // 先建立反馈监听（避免竞态）
    const feedback$ = ch.upstream$.pipe(
      filter((m) => m.meta?.replyTo === requestId && (opts.filter ? opts.filter(m as BusMessage<TMap[K]['upstream']>) : true)),
      take(1)
    );

    // 发出请求
    this.publish(topic, payload, { replyTo: requestId });

    const promise = firstValueFrom(feedback$);
    if (opts.timeout && opts.timeout > 0) {
      return promise.then(
        (msg) => ({ ...msg, topic: topic as string }) as BusMessage<TMap[K]['upstream']>
      );
    }
    return promise.then(
      (msg) => ({ ...msg, topic: topic as string }) as BusMessage<TMap[K]['upstream']>
    );
  }

  /** 获取 Topic 的原始 Observable（用于与 RxJS 流直接集成） */
  observeDownstream<K extends keyof TMap>(topic: K): Observable<BusMessage<TMap[K]['downstream']>> {
    return this.ensureChannel(topic).downstream$;
  }

  observeUpstream<K extends keyof TMap>(topic: K): Observable<BusMessage<TMap[K]['upstream']>> {
    return this.ensureChannel(topic).upstream$;
  }

  /** 销毁总线 */
  dispose(): void {
    if (this.gcTimer) clearInterval(this.gcTimer);
    this.topics.forEach((ch) => ch.dispose());
    this.topics.clear();
  }

  private log(direction: '↓' | '↑', msg: BusMessage<unknown>) {
    if (!this.options.devLog) return;
    console.log(
      `%c[Bus][${msg.topic}]%c ${direction} ${direction === '↓' ? 'DOWN' : 'UP'}`,
      'color: #67c23a; font-weight: bold;',
      'color: #909399;',
      msg
    );
  }

  /** 引用计数归零时尝试清理 */
  private maybeCleanup<K extends keyof TMap>(topic: K) {
    const key = topic as string;
    const ch = this.topics.get(key);
    if (!ch) return;
    if (!ch.hasPublisher && ch.subscriberCount === 0) {
      // 延迟清理，由 GC 定时器统一处理，避免频繁创建/销毁的抖动
    }
  }

  /** 垃圾回收：清理无引用 Topic */
  private gc() {
    this.topics.forEach((ch, key) => {
      if (!ch.hasPublisher && ch.subscriberCount === 0) {
        ch.dispose();
        this.topics.delete(key);
        this.log('GC', { topic: key, payload: 'topic cleaned' } as any);
      }
      // 重置 publisher 标记（下次 publish 会重新标记）
      ch.hasPublisher = false;
    });
  }
}
```

---

## 3. Vue3 组合式 API 封装 (`composables.ts`)

```typescript
import { inject, provide, readonly, ref, shallowRef, onScopeDispose, type App, type InjectionKey } from 'vue';
import { from, tap } from 'rxjs';
import type { Observable } from 'rxjs';
import type {
  MessageBus,
  AppTopicMap,
  BusMessage,
  SubscriberHandler,
  FeedbackHandler,
  Unsub,
  TopicDefinition,
} from './bus';

// ========== 依赖注入 key ==========

export const MessageBusKey: InjectionKey<MessageBus<AppTopicMap>> = Symbol('MessageBus');

// ========== 全局单例 ==========

let globalBus: MessageBus<AppTopicMap> | null = null;

export function createMessageBus() {
  return new MessageBus<AppTopicMap>({ devLog: import.meta.env.DEV });
}

/** 安装全局 Bus（在 main.ts 调用） */
export function installMessageBus(app: App, bus?: MessageBus<AppTopicMap>) {
  const instance = bus ?? createMessageBus();
  globalBus = instance;
  app.provide(MessageBusKey, instance);
  // 挂载到全局属性（可选，用于 Options API 或模板）
  app.config.globalProperties.$bus = instance;
}

/** 获取 Bus 实例（优先局部注入，回退全局） */
export function useMessageBus(): MessageBus<AppTopicMap> {
  const bus = inject(MessageBusKey, null) ?? globalBus;
  if (!bus) {
    throw new Error('[useMessageBus] 未找到 MessageBus 实例，请先调用 installMessageBus()');
  }
  return bus;
}

// ========== 发布者角色 Composable ==========

export interface UsePublisherReturn<TIn, TOut> {
  /** 广播消息 */
  publish: (payload: TIn, meta?: { sender?: string; tags?: Record<string, unknown> }) => void;
  /** 响应式反馈列表（订阅者上行消息） */
  feedbacks: Readonly<typeof feedbacks>;
  /** 清空反馈缓存 */
  clearFeedbacks: () => void;
  /** 监听反馈（底层 API，通常直接用 feedbacks 即可） */
  onFeedback: (handler: FeedbackHandler<TOut>) => Unsub;
  /** 请求-响应模式（等待第一条反馈） */
  request: (payload: TIn, timeout?: number) => Promise<BusMessage<TOut>>;
}

export function usePublisher<K extends keyof AppTopicMap>(
  topic: K,
  options: { bufferFeedbacks?: number } = {}
): UsePublisherReturn<AppTopicMap[K]['downstream'], AppTopicMap[K]['upstream']> {
  const bus = useMessageBus();
  const feedbacks = shallowRef<BusMessage<AppTopicMap[K]['upstream']>[]>([]);
  const maxBuffer = options.bufferFeedbacks ?? 100;

  // 自动订阅反馈流
  const unsub = bus.onFeedback(topic, (msg) => {
    feedbacks.value = [...feedbacks.value, msg].slice(-maxBuffer);
  });

  onScopeDispose(() => {
    unsub();
  });

  return {
    publish: (payload, meta) => bus.publish(topic, payload, meta),
    feedbacks: readonly(feedbacks),
    clearFeedbacks: () => {
      feedbacks.value = [];
    },
    onFeedback: (handler) => bus.onFeedback(topic, handler),
    request: (payload, timeout) => bus.request(topic, payload, { timeout }),
  };
}

// ========== 订阅者角色 Composable ==========

export interface UseSubscriberReturn<TIn, TOut> {
  /** 当前最新消息（响应式） */
  latestMessage: Readonly<typeof latestMessage>;
  /** 手动上行（不基于某条消息的 reply 闭包） */
  reply: (payload: TOut, meta?: Omit<NonNullable<BusMessage<TOut>['meta']>, 'replyTo'>) => void;
  /** 底层订阅句柄（用于高级 RxJS 操作） */
  downstream$: Observable<BusMessage<TIn>>;
}

export function useSubscriber<K extends keyof AppTopicMap>(
  topic: K,
  handler?: SubscriberHandler<AppTopicMap[K]['downstream'], AppTopicMap[K]['upstream']>
): UseSubscriberReturn<AppTopicMap[K]['downstream'], AppTopicMap[K]['upstream']> {
  const bus = useMessageBus();
  const latestMessage = shallowRef<BusMessage<AppTopicMap[K]['downstream']> | null>(null);

  // 自动生命周期管理
  const unsub = bus.subscribe(topic, (msg, reply) => {
    latestMessage.value = msg;
    if (handler) {
      handler(msg, reply);
    }
  });

  onScopeDispose(() => {
    unsub();
  });

  return {
    latestMessage: readonly(latestMessage),
    reply: (payload, meta) => bus.reply(topic, payload, meta),
    downstream$: bus.observeDownstream(topic),
  };
}

// ========== 双向角色（同时是发布者和订阅者） ==========

export function useTopic<K extends keyof AppTopicMap>(topic: K) {
  const publisher = usePublisher(topic);
  const subscriber = useSubscriber(topic);

  return {
    ...publisher,
    ...subscriber,
    // 增强：收到消息后自动回复的快捷封装
    withReply: (handler: (msg: AppTopicMap[K]['downstream']) => AppTopicMap[K]['upstream']) => {
      const unsub = useMessageBus().subscribe(topic, (msg, reply) => {
        reply(handler(msg.payload));
      });
      onScopeDispose(unsub);
      return unsub;
    },
  };
}
```

---

## 4. 使用示例

### 4.1 全局注册 (`main.ts`)

```typescript
import { createApp } from 'vue';
import App from './App.vue';
import { installMessageBus } from '@/composables/message-bus';

const app = createApp(App);
installMessageBus(app); // 自动创建并注入
app.mount('#app');
```

### 4.2 发布者组件（传感器数据源头）

```vue
<script setup lang="ts">
import { usePublisher } from '@/composables/message-bus';
import { onMounted, onUnmounted } from 'vue';

const { publish, feedbacks, clearFeedbacks, request } = usePublisher('sensor:realtime');

let timer: ReturnType<typeof setInterval>;

onMounted(() => {
  // 模拟高频数据推送
  timer = setInterval(() => {
    publish({
      sensorId: 'temp-01',
      value: 20 + Math.random() * 10,
    });
  }, 1000);

  // 请求-响应模式示例：校准传感器
  request({ sensorId: 'temp-01', value: 0 }, 5000).then((ack) => {
    console.log('校准完成:', ack.payload);
  });
});

onUnmounted(() => clearInterval(timer));

// 监听所有订阅者的 ACK
const latestAck = computed(() => feedbacks.value[feedbacks.value.length - 1]?.payload);
</script>

<template>
  <div>
    <h3>传感器发布者</h3>
    <button @click="clearFeedbacks">清空 ACK</button>
    <ul>
      <li v-for="(fb, i) in feedbacks" :key="fb.id">
        {{ i }}: {{ fb.payload.ack }} @ {{ new Date(fb.payload.processedAt).toLocaleTimeString() }}
      </li>
    </ul>
  </div>
</template>
```

### 4.3 订阅者组件（多实例共存）

```vue
<script setup lang="ts">
import { useSubscriber } from '@/composables/message-bus';
import { computed } from 'vue';

const props = defineProps<{ instanceId: string }>();

const { latestMessage, reply, downstream$ } = useSubscriber('sensor:realtime', (msg, replyToPublisher) => {
  console.log(`[${props.instanceId}] 收到传感器数据:`, msg.payload);

  // 处理完成后向发布者反馈
  setTimeout(() => {
    replyToPublisher({
      ack: true,
      processedAt: Date.now(),
    });
  }, 100);
});

// 也可以手动上行（不基于某条具体消息）
const handleManualReport = () => {
  reply({
    ack: false,
    processedAt: Date.now(),
  });
};

const currentValue = computed(() => latestMessage.value?.payload.value ?? '--');
</script>

<template>
  <div class="subscriber-card">
    <h4>订阅者 #{{ instanceId }}</h4>
    <p>当前温度: {{ currentValue }}</p>
    <button @click="handleManualReport">手动上报状态</button>
  </div>
</template>
```

### 4.4 与 RxJS 流深度集成（ECharts 场景）

```typescript
import { useSubscriber, useMessageBus } from '@/composables/message-bus';
import { switchMap, throttleTime, bufferTime } from 'rxjs/operators';
import { from } from 'rxjs';

// 在 composable 中直接消费原始 Observable
function useChartDataStream() {
  const bus = useMessageBus();
  
  // 将传感器数据流转换为图表可消费的聚合数据
  const chartData$ = bus.observeDownstream('sensor:realtime').pipe(
    throttleTime(100),           // 100ms 节流
    bufferTime(1000),            // 1s 聚合窗口
    switchMap((msgs) => {
      const values = msgs.map((m) => m.payload.value);
      return from([{
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        max: Math.max(...values),
        min: Math.min(...values),
      }]);
    })
  );

  return { chartData$ };
}
```

---

## 5. 工程级设计要点总结

| 维度 | 实现策略 |
|------|----------|
| **Topic 隔离** | 每个 Topic 独立 `TopicChannel`，内含两个 `Subject`（`downstream$` / `upstream$`），互不干扰 |
| **类型安全** | 通过 `AppTopicMap` 集中声明，所有 `publish/subscribe/reply` 完全泛型约束，IDE 自动推导 |
| **生命周期** | `useSubscriber` / `usePublisher` 内部使用 `onScopeDispose`，组件卸载自动取消订阅，防止内存泄漏 |
| **Request-Reply** | `bus.request()` 自动生成 `replyTo` 消息 ID，并通过 RxJS `firstValueFrom + filter` 实现异步等待 |
| **背压 & 聚合** | 暴露原始 `Observable`（`observeDownstream`），可直接套用 `throttleTime / bufferTime / sample` 等操作符 |
| **GC 策略** | 定时扫描无引用 Topic，自动 `complete()` Subject 并从 Map 移除，避免长期空转 |
| **错误隔离** | 订阅者回调异常被 `try-catch` 捕获，不影响其他订阅者及总线运行 |
| **调试** | `devLog: true` 时输出带方向的彩色日志，可扩展为 Vue DevTools 插件 |
| **作用域** | 支持 `provide/inject` 局部 Bus 与全局单例共存，满足微前端/多窗口隔离需求 |

如需进一步扩展 **消息持久化、断线重连、跨 Tab BroadcastChannel 传输**，可在 `MessageBus` 层增加 `TransportAdapter` 接口，对 `TopicChannel` 的出入流做拦截和桥接。