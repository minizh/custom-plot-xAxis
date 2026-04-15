import type { RouteRecordRaw } from 'vue-router'
import { useRouter, useRoute } from 'vue-router'
import { computed, ref, watch } from 'vue'

export function useMenuRoutes() {
  const router = useRouter()
  const route = useRoute()

  const menuRoutes = computed(() => {
    return router.options.routes.filter(
      (item) => !item.meta || !item.meta.hidden
    )
  })

  const getFullPath = (parentPath: string, childPath: string): string => {
    if (childPath.startsWith('/')) return childPath
    const parent = parentPath.endsWith('/') ? parentPath : parentPath + '/'
    return parent + childPath
  }

  const activeIndex = ref('/')
  const defaultOpeneds = ref<string[]>([])

  const getOpenedMenus = (path: string): string[] => {
    const opened: string[] = []
    menuRoutes.value.forEach((routeItem) => {
      if (routeItem.children && routeItem.children.length > 0) {
        if (path.startsWith(routeItem.path)) {
          opened.push(routeItem.path)
        }
      }
    })
    return opened
  }

  const findRoute = (
    routes: readonly RouteRecordRaw[],
    path: string
  ): RouteRecordRaw | null => {
    for (const r of routes) {
      if (r.path === path) return r
      if (r.children) {
        const found = r.children.find(
          (c) => getFullPath(r.path, c.path) === path
        )
        if (found) return found
      }
    }
    return null
  }

  const handleMenuSelect = (index: string) => {
    const selectedRoute = findRoute(menuRoutes.value, index)
    if (
      selectedRoute &&
      selectedRoute.children &&
      selectedRoute.children.length > 0
    ) {
      return
    }
    router.push(index)
  }

  watch(
    () => route.path,
    (newPath) => {
      activeIndex.value = newPath
      const opened = getOpenedMenus(newPath)
      if (opened.length > 0) {
        defaultOpeneds.value = Array.from(
          new Set([...defaultOpeneds.value, ...opened])
        )
      }
    },
    { immediate: true }
  )

  return {
    menuRoutes,
    activeIndex,
    defaultOpeneds,
    getFullPath,
    handleMenuSelect
  }
}
