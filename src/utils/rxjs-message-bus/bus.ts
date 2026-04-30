import { Subject, Observable, firstValueFrom } from 'rxjs';
import { share, filter, take } from 'rxjs/operators';
import { nanoid } from 'nanoid';
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
export class MessageBus<TMap extends { [K in keyof TMap]: TopicDefinition } = Record<string, TopicDefinition>> {
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

  private log(direction: '↓' | '↑' | 'GC', msg: BusMessage<unknown>) {
    if (!this.options.devLog) return;
    console.log(
      `%c[Bus][${msg.topic}]%c ${direction} ${direction === '↓' ? 'DOWN' : direction === '↑' ? 'UP' : 'GC'}`,
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
