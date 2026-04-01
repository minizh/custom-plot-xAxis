<template>
  <div id="app-page" :class="{ 'login-page': isLoginPage }">
    <!-- 顶部导航栏 - 登录页面不显示 -->
    <el-header v-if="!isLoginPage" class="app-header">
      <div class="header-content">
        <div class="logo">
          <h2>VUE调试</h2>
        </div>
      </div>
    </el-header>

    <!-- 主体布局：左侧菜单 + 右侧内容 -->
    <div v-if="!isLoginPage" class="app-body">
      <!-- 左侧菜单 -->
      <el-aside class="app-aside" width="240px">
        <el-menu :default-active="activeIndex" class="sidebar-menu" mode="vertical" @select="handleMenuSelect"
          :default-openeds="defaultOpeneds">
          <template v-for="item in menuRoutes" :key="item.path">
            <!-- 有子菜单的情况 -->
            <el-sub-menu v-if="item.children && item.children.length > 0" :index="item.path">
              <template #title>
                <el-icon v-if="item.meta && item.meta.icon">
                  <component :is="iconMap[item.meta.icon]" />
                </el-icon>
                <span>{{ item.meta ? item.meta.title : item.name }}</span>
              </template>
              <el-menu-item v-for="child in item.children" :key="getFullPath(item.path, child.path)"
                :index="getFullPath(item.path, child.path)">
                <span>{{ child.meta ? child.meta.title : child.name }}</span>
              </el-menu-item>
            </el-sub-menu>

            <!-- 无子菜单的情况 -->
            <el-menu-item v-else :index="item.path">
              <el-icon v-if="item.meta && item.meta.icon">
                <component :is="iconMap[item.meta.icon]" />
              </el-icon>
              <span>{{ item.meta ? item.meta.title : item.name }}</span>
            </el-menu-item>
          </template>
        </el-menu>
      </el-aside>

      <!-- 右侧内容区域 -->
      <el-main class="app-main">
        <router-view />
      </el-main>
    </div>

    <!-- 登录页面内容 -->
    <el-main v-if="isLoginPage" class="app-main login-main">
      <router-view />
    </el-main>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { House, Document, Brush, Share, MapLocation, DataLine,Mug } from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()

// 图标映射
const iconMap = {
  House,
  Document,
  Brush,
  Share,
  MapLocation,
  DataLine,
  Mug
}

// 获取所有需要显示的路由
const menuRoutes = computed(() => {
  return router.options.routes.filter(item => !item.meta || !item.meta.hidden)
})

// 拼接完整路径
const getFullPath = (parentPath, childPath) => {
  if (childPath.startsWith('/')) return childPath
  const parent = parentPath.endsWith('/') ? parentPath : parentPath + '/'
  return parent + childPath
}

// 当前激活的菜单项
const activeIndex = ref('/')

// 默认打开的菜单
const defaultOpeneds = ref([])

// 获取应该展开的菜单 index (即父级路由的 path)
const getOpenedMenus = (path) => {
  const opened = []
  menuRoutes.value.forEach(route => {
    if (route.children && route.children.length > 0) {
      if (path.startsWith(route.path)) {
        opened.push(route.path)
      }
    }
  })
  return opened
}

// 判断是否为登录页面
const isLoginPage = computed(() => route.path === '/login')

// 处理菜单选择
const handleMenuSelect = (index) => {
  // 查找对应的路由配置
  const findRoute = (routes, path) => {
    for (const r of routes) {
      if (r.path === path) return r
      if (r.children) {
        const fullChildPath = getFullPath(r.path, '')
        const found = r.children.find(c => getFullPath(r.path, c.path) === path)
        if (found) return found
      }
    }
    return null
  }

  const selectedRoute = findRoute(menuRoutes.value, index)

  // 如果是父节点且有子节点，el-menu 默认会处理展开/收起，这里不需要跳转
  if (selectedRoute && selectedRoute.children && selectedRoute.children.length > 0) {
    return
  }

  router.push(index)
}

// 监听路由变化，更新激活的菜单项
watch(
  () => route.path,
  (newPath) => {
    activeIndex.value = newPath
    // 自动展开当前路由所在的父菜单
    const opened = getOpenedMenus(newPath)
    if (opened.length > 0) {
      defaultOpeneds.value = Array.from(new Set([...defaultOpeneds.value, ...opened]))
    }
  },
  { immediate: true }
)
</script>

<style scoped>
#app-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  width: 100%;
}

/* 顶部导航栏 */
.app-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 0;
  height: 64px;
  line-height: 64px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 100;
}

.app-header::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  height: 100%;
  width: 100%;
  padding: 0 24px;
}

.logo h2 {
  color: white;
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  letter-spacing: 1px;
}

/* 主体布局 */
.app-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* 左侧菜单 */
.app-aside {
  background-color: #fff;
  border-right: 1px solid #e4e7ed;
  overflow-y: auto;
  overflow-x: hidden;
}

.sidebar-menu {
  border-right: none;
  height: 100%;
}

.sidebar-menu .el-menu-item,
.sidebar-menu .el-sub-menu__title {
  height: 48px;
  line-height: 48px;
}

.sidebar-menu .el-menu-item:hover,
.sidebar-menu .el-sub-menu__title:hover {
  background-color: #f5f7fa;
}

.sidebar-menu .el-menu-item.is-active {
  background-color: #ecf5ff;
  color: #409eff;
  border-right: 3px solid #409eff;
}

.sidebar-menu .el-sub-menu .el-menu-item {
  padding-left: 50px !important;
}

/* 右侧内容区域 */
.app-main {
  flex: 1;
  padding: 20px;
  background-color: #f5f7fa;
  overflow-y: auto;
}

.login-page {
  height: 100vh;
}

.login-main {
  padding: 0;
  background: transparent;
  overflow: hidden;
}

/* 全局样式重置 */
:deep(.el-header) {
  padding: 0;
}

:deep(.el-main) {
  padding: 0;
}

:deep(.el-aside) {
  padding: 0;
}

/* 滚动条样式 */
.app-aside::-webkit-scrollbar {
  width: 6px;
}

.app-aside::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.app-aside::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.app-aside::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>

<style>
/* 全局样式 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB',
    'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
}
</style>
