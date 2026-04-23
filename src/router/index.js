import { createRouter, createWebHistory } from 'vue-router'
import CombinedXAxis from '../views/Chart/CombinedXAxis/Template.vue'
import GroupXAxis from '../views/Chart/GroupXAxis/Template.vue'
import MultiYAxis from '../views/Chart/MultiYAxis/Template.vue'
import TableXAxis from '../views/Chart/TableXAxis/Template.vue'
import Home from '../views/Home.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: { title: '首页', icon: 'House' }
  },

  {
    path: '/axis',
    name: 'Axis',
    meta: { title: '图表', icon: 'DataLine' },
    children: [
      {
        path: 'group-x-axis',
        name: 'GroupXAxis',
        component: GroupXAxis,
        meta: { title: '分组X轴' }
      },
      {
        path: 'table-x-axis',
        name: 'TableXAxis',
        component: TableXAxis,
        meta: { title: '表格X轴' }
      },
      {
        path: 'combined-x-axis',
        name: 'CombinedXAxis',
        component: CombinedXAxis,
        meta: { title: '组合X轴' }
      },
      {
        path: 'multi-y-axis',
        name: 'MultiYAxis',
        component: MultiYAxis,
        meta: { title: '多Y轴' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
