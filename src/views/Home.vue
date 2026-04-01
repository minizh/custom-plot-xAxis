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

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()
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

.content h3 {
  color: #303133;
  margin-top: 20px;
  margin-bottom: 10px;
}

.content ul {
  margin: 15px 0;
  padding-left: 20px;
}

.content li {
  margin: 8px 0;
  color: #606266;
}

.examples-card {
  margin-top: 20px;
}

.examples-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.example-item {
  cursor: pointer;
  transition: all 0.3s ease;
}

.example-item:hover {
  transform: translateY(-2px);
}

.example-content h4 {
  margin: 0 0 8px 0;
  color: #409eff;
}

.example-content p {
  margin: 0;
  color: #606266;
  font-size: 14px;
}
</style>
