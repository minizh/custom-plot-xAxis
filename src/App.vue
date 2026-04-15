<template>
  <div id="app-page" :class="{ 'login-page': isLoginPage }">
    <el-header v-if="!isLoginPage" class="app-header">
      <div class="header-content">
        <div class="logo">
          <h2>VUE调试</h2>
        </div>
      </div>
    </el-header>

    <div v-if="!isLoginPage" class="app-body">
      <el-aside class="app-aside" width="240px">
        <el-menu
          :default-active="activeIndex"
          class="sidebar-menu"
          mode="vertical"
          :default-openeds="defaultOpeneds"
          @select="handleMenuSelect"
        >
          <template v-for="item in menuRoutes" :key="item.path">
            <el-sub-menu
              v-if="item.children && item.children.length > 0"
              :index="item.path"
            >
              <template #title>
                <el-icon v-if="item.meta && item.meta.icon">
                  <component :is="iconMap[item.meta.icon as string]" />
                </el-icon>
                <span>{{ item.meta ? item.meta.title : item.name }}</span>
              </template>
              <el-menu-item
                v-for="child in item.children"
                :key="getFullPath(item.path, child.path)"
                :index="getFullPath(item.path, child.path)"
              >
                <span>{{ child.meta ? child.meta.title : child.name }}</span>
              </el-menu-item>
            </el-sub-menu>

            <el-menu-item v-else :index="item.path">
              <el-icon v-if="item.meta && item.meta.icon">
                <component :is="iconMap[item.meta.icon as string]" />
              </el-icon>
              <span>{{ item.meta ? item.meta.title : item.name }}</span>
            </el-menu-item>
          </template>
        </el-menu>
      </el-aside>

      <el-main class="app-main">
        <router-view />
      </el-main>
    </div>

    <el-main v-if="isLoginPage" class="app-main login-main">
      <router-view />
    </el-main>
  </div>
</template>

<script setup lang="ts">
import { useMenuRoutes } from '@/composables/useMenuRoutes'
import {
  Brush,
  DataLine,
  Document,
  House,
  MapLocation,
  Mug,
  Share
} from '@element-plus/icons-vue'
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const {
  menuRoutes,
  activeIndex,
  defaultOpeneds,
  getFullPath,
  handleMenuSelect
} = useMenuRoutes()

const iconMap: Record<string, unknown> = {
  House,
  Document,
  Brush,
  Share,
  MapLocation,
  DataLine,
  Mug
}

const isLoginPage = computed(() => route.path === '/login')
</script>

<style scoped>
#app-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  width: 100%;
}

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
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.3),
    transparent
  );
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

.app-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

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
</style>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family:
    'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB',
    'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
}

:deep(.el-header) {
  padding: 0;
}

:deep(.el-main) {
  padding: 0;
}

:deep(.el-aside) {
  padding: 0;
}

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
