import { onBeforeUnmount } from 'vue'

export function useResizeObserver() {
  let resizeObserver: ResizeObserver | null = null
  let rafId: number | null = null

  const observe = (target: Element | null, callback: () => void) => {
    if (typeof ResizeObserver === 'undefined' || !target) return

    disconnect()

    resizeObserver = new ResizeObserver(() => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }
      rafId = requestAnimationFrame(() => {
        callback()
      })
    })

    resizeObserver.observe(target)
  }

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

  onBeforeUnmount(disconnect)

  return {
    observe,
    disconnect
  }
}
