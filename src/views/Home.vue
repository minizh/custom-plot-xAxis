<template>
  <div class="home">
    <el-card class="welcome-card">
      <template #header>
        <h2>Vue3 + D3 项目首页</h2>
      </template>
      <div class="content">
        <p>Vue3 相关功能调试项目</p>
      </div>
    </el-card>

    <el-card class="examples-card">
      <template #header>
        <h3>示例页面</h3>
      </template>
    </el-card>
  </div>
</template>

<script setup lang="ts">
// Home 页面：暂无额外逻辑，仅作为项目入口展示
</script>

<style scoped>
.home {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.welcome-card {
  margin-bottom: 20px;
}

.welcome-card h2 {
  margin: 0;
  color: #409eff;
}

.content {
  line-height: 1.6;
}

.examples-card {
  margin-top: 20px;
}
</style>
