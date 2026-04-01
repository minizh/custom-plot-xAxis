# Vue 3 + Vite 项目

这是一个基于 Vue 3 和 Vite 构建的项目，包含多个实用组件和功能演示。

## 技术栈

- Vue 3 (Composition API)
- Vite
- Element Plus
- Vue Router
- D3.js

## 项目特色

### 1. 条件组合组件 (Condition Group)

一个功能强大的条件构建器组件，支持：

- ✅ 多层嵌套的条件组
- ✅ 且（AND）/或（OR）逻辑关系
- ✅ 多种操作符和字段类型
- ✅ 动态添加/删除条件
- ✅ 清晰的视觉层级
- ✅ 响应式布局

访问路径：`/relation-tree`

详细文档：[条件组合组件演示文档](./CONDITION_GROUP_DEMO.md)

### 2. 动态表单组件

支持自定义表单项的动态表单系统。

### 3. Canvas 套索工具

基于 Canvas 的套索选择工具，支持自由绘制选区。

## 快速开始

### 安装依赖

```bash
npm install
# 或
yarn install
```

### 启动开发服务器

```bash
npm run dev
# 或
yarn dev
```

### 构建生产版本

```bash
npm run build
# 或
yarn build
```

## 项目结构

```
d3-vue3/
├── src/
│   ├── components/          # 公共组件
│   │   ├── ConditionGroup/  # 条件组合组件
│   │   ├── DynamicFormItem/ # 动态表单组件
│   │   └── LayerCanvas/     # Canvas 组件
│   ├── views/               # 页面视图
│   │   ├── RelationTree.vue # 条件组合页面
│   │   ├── Home.vue         # 首页
│   │   └── ...
│   ├── router/              # 路由配置
│   └── main.js              # 入口文件
├── public/                  # 静态资源
└── package.json
```

## 组件文档

- [条件组合组件](./src/components/ConditionGroup/README.md)

## 浏览器支持

- Chrome (推荐)
- Firefox
- Safari
- Edge

## 参考资源

- [Vue 3 文档](https://v3.vuejs.org/)
- [Vite 文档](https://vitejs.dev/)
- [Element Plus 文档](https://element-plus.org/)

## License

MIT
