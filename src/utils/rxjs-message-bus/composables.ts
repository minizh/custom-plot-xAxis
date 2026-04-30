import type { Observable } from 'rxjs'
import {
  inject,
  onScopeDispose,
  provide,
  shallowRef,
  type App,
  type InjectionKey,
  type ShallowRef
} from 'vue'
import { MessageBus } from './bus'
import type {
  AppTopicMap,
  BusMessage,
  BusOptions,
  FeedbackHandler,
  SubscriberHandler,
  Unsub
} from './types'

// ========== 依赖注入 key ==========

export const MessageBusKey: InjectionKey<MessageBus<AppTopicMap>> =
  Symbol('MessageBus')

// ========== 全局单例 ==========

let globalBus: MessageBus<AppTopicMap> | null = null

export function createMessageBus() {
  return new MessageBus<AppTopicMap>({ devLog: import.meta.env.DEV })
}

/** 安装全局 Bus（在 main.ts 调用） */
export function installMessageBus(app: App, bus?: MessageBus<AppTopicMap>) {
  const instance = bus ?? createMessageBus()
  globalBus = instance
  app.provide(MessageBusKey, instance)
  // 挂载到全局属性（可选，用于 Options API 或模板）
  ;(app.config.globalProperties as any).$bus = instance
}

/** 获取 Bus 实例（优先局部注入，回退全局） */
export function useMessageBus(): MessageBus<AppTopicMap> {
  const bus = inject(MessageBusKey, null) ?? globalBus
  if (!bus) {
    throw new Error(
      '[useMessageBus] 未找到 MessageBus 实例，请先调用 installMessageBus()'
    )
  }
  return bus
}

/**
 * 在组件级别创建并向下提供独立的 MessageBus 实例（多实例隔离）
 * 适用于：微前端子应用、多容器并行、弹窗/抽屉等独立作用域
 */
export function provideMessageBus(
  options?: BusOptions
): MessageBus<AppTopicMap> {
  const bus = new MessageBus<AppTopicMap>({
    devLog: import.meta.env.DEV,
    ...options
  })
  provide(MessageBusKey, bus)
  return bus
}

// ========== 发布者角色 Composable ==========

export interface UsePublisherReturn<TIn, TOut> {
  /** 广播消息 */
  publish: (
    payload: TIn,
    meta?: { sender?: string; tags?: Record<string, unknown> }
  ) => void
  /** 响应式反馈列表（订阅者上行消息） */
  feedbacks: Readonly<ShallowRef<BusMessage<TOut>[]>>
  /** 清空反馈缓存 */
  clearFeedbacks: () => void
  /** 监听反馈（底层 API，通常直接用 feedbacks 即可） */
  onFeedback: (handler: FeedbackHandler<TOut>) => Unsub
  /** 请求-响应模式（等待第一条反馈） */
  request: (payload: TIn, timeout?: number) => Promise<BusMessage<TOut>>
}

export function usePublisher<K extends keyof AppTopicMap>(
  topic: K,
  options: { bufferFeedbacks?: number; bus?: MessageBus<AppTopicMap> } = {}
): UsePublisherReturn<
  AppTopicMap[K]['downstream'],
  AppTopicMap[K]['upstream']
> {
  const bus = options.bus ?? useMessageBus()
  const feedbacks = shallowRef<BusMessage<AppTopicMap[K]['upstream']>[]>([])
  const maxBuffer = options.bufferFeedbacks ?? 100

  // 自动订阅反馈流
  const unsub = bus.onFeedback(topic, (msg) => {
    feedbacks.value = [...feedbacks.value, msg].slice(-maxBuffer)
  })

  onScopeDispose(() => {
    unsub()
  })

  return {
    publish: (payload, meta) => bus.publish(topic, payload, meta),
    feedbacks: feedbacks,
    clearFeedbacks: () => {
      feedbacks.value = []
    },
    onFeedback: (handler) => bus.onFeedback(topic, handler),
    request: (payload, timeout) => bus.request(topic, payload, { timeout })
  }
}

// ========== 订阅者角色 Composable ==========

export interface UseSubscriberReturn<TIn, TOut> {
  /** 当前最新消息（响应式） */
  latestMessage: Readonly<ShallowRef<BusMessage<TIn> | null>>
  /** 手动上行（不基于某条消息的 reply 闭包） */
  reply: (
    payload: TOut,
    meta?: Omit<NonNullable<BusMessage<TOut>['meta']>, 'replyTo'>
  ) => void
  /** 底层订阅句柄（用于高级 RxJS 操作） */
  downstream$: Observable<BusMessage<TIn>>
}

export function useSubscriber<K extends keyof AppTopicMap>(
  topic: K,
  handler?: SubscriberHandler<
    AppTopicMap[K]['downstream'],
    AppTopicMap[K]['upstream']
  >,
  options?: { bus?: MessageBus<AppTopicMap> }
): UseSubscriberReturn<
  AppTopicMap[K]['downstream'],
  AppTopicMap[K]['upstream']
> {
  const bus = options?.bus ?? useMessageBus()
  const latestMessage = shallowRef<BusMessage<
    AppTopicMap[K]['downstream']
  > | null>(null)

  // 自动生命周期管理
  const unsub = bus.subscribe(topic, (msg, reply) => {
    latestMessage.value = msg
    if (handler) {
      handler(msg, reply)
    }
  })

  onScopeDispose(() => {
    unsub()
  })

  return {
    latestMessage: latestMessage,
    reply: (payload, meta) => bus.reply(topic, payload, meta),
    downstream$: bus.observeDownstream(topic)
  }
}

// ========== 双向角色（同时是发布者和订阅者） ==========

export function useTopic<K extends keyof AppTopicMap>(
  topic: K,
  options?: { bus?: MessageBus<AppTopicMap> }
) {
  const bus = options?.bus
  const publisher = usePublisher(topic, { bus })
  const subscriber = useSubscriber(topic, undefined, { bus })

  return {
    ...publisher,
    ...subscriber,
    // 增强：收到消息后自动回复的快捷封装
    withReply: (
      handler: (msg: AppTopicMap[K]['downstream']) => AppTopicMap[K]['upstream']
    ) => {
      const unsub = (bus ?? useMessageBus()).subscribe(topic, (msg, reply) => {
        reply(handler(msg.payload))
      })
      onScopeDispose(unsub)
      return unsub
    }
  }
}
