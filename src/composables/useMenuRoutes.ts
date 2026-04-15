import type { RouteRecordRaw } from 'vue-router'
import { useRouter, useRoute } from 'vue-router'
import { computed, ref, watch } from 'vue'

/**
 * Composable: 从 vue-router 中提取菜单所需的状态与辅助方法
 * 用于侧边栏菜单的渲染、高亮和跳转
 */
export function useMenuRoutes() {
  const router = useRouter()
  const route = useRoute()

  /**
   * 过滤掉 meta.hidden = true 的路由，作为菜单数据源
   */
  const menuRoutes = computed(() => {
    return router.options.routes.filter(
      (item) => !item.meta || !item.meta.hidden
    )
  })

  /**
   * 拼接父子路由路径，处理斜杠冲突
   */
  const getFullPath = (parentPath: string, childPath: string): string => {
    if (childPath.startsWith('/')) return childPath
    const parent = parentPath.endsWith('/') ? parentPath : parentPath + '/'
    return parent + childPath
  }

  // 当前激活的菜单项索引
  const activeIndex = ref('/')
  // 默认展开的子菜单索引数组
  const defaultOpeneds = ref<string[]>([])

  /**
   * 根据当前路径计算需要展开的父级菜单
   */
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

  /**
   * 在路由列表中查找指定路径对应的路由配置
   */
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

  /**
   * 菜单选中事件：若选中的是有子项的父级菜单，则不跳转；否则路由跳转
   */
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

  // 监听路由变化，实时更新菜单高亮和展开状态
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
