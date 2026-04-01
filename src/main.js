import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'

// Element Plus
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

import '@vueup/vue-quill/dist/vue-quill.snow.css' // 主题样式

const app = createApp(App)

// 使用Element Plus
app.use(ElementPlus)

// 使用路由
app.use(router)

app.mount('#app')
