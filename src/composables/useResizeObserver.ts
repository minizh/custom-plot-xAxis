import { onBeforeUnmount } from 'vue'

/**
 * Composable: 基于 ResizeObserver 监听元素尺寸变化
 * 内部使用 requestAnimationFrame 进行节流，避免频繁回调
 */
export function useResizeObserver() {
  let resizeObserver: ResizeObserver | null = null
  let rafId: number | null = null

  /**
   * 开始监听目标元素
   * @param target - 需要监听的 DOM 元素
   * @param callback - 尺寸变化时的回调函数
   */
  const observe = (target: Element | null, callback: () => void) => {
    if (typeof ResizeObserver === 'undefined' || !target) return

    // 重新监听前先断开旧的，防止重复绑定
    disconnect()

    resizeObserver = new ResizeObserver(() => {
      // 使用 RAF 节流：若上一帧尚未执行，则取消并重新调度
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }
      rafId = requestAnimationFrame(() => {
        callback()
      })
    })

    resizeObserver.observe(target)
  }

  /**
   * 停止监听并释放资源
   */
  const disconnect = () => {
    if (resizeObserver) {
      resizeObserver.disconnect()
      resizeObserver = null
    }
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  }

  // 组件卸载时自动清理，防止内存泄漏
  onBeforeUnmount(disconnect)

  return {
    observe,
    disconnect
  }
}
