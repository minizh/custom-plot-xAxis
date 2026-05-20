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
  'chart:register': TopicDefinition<
    { chartId: string; seriesNames: string[] },
    { received: boolean }
  >;
  'chart:legend': TopicDefinition<
    { selectedMap: Record<string, boolean> },
    void
  >;
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
  /** 下游消息缓存数量（ReplaySubject），默认 1。设为 0 则退化为普通 Subject */
  replayCount?: number;
}
