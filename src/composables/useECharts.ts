import type { ECharts, EChartsOption } from 'echarts'
import { onBeforeUnmount, onMounted, shallowRef, type Ref } from 'vue'
import * as echarts from 'echarts'

/**
 * ECharts 初始化与生命周期管理的 Composable
 * 负责：初始化图表、设置选项、窗口 resize 自适应、组件卸载时销毁实例
 */
export function useECharts(
  chartRef: Ref<HTMLElement | null>,
  optionFactory?: () => EChartsOption
) {
  // 使用 shallowRef 存储 ECharts 实例，避免深层响应式带来的性能开销
  const chartInstance = shallowRef<ECharts>()

  /**
   * 初始化 ECharts 实例
   */
  const initChart = () => {
    if (!chartRef.value) return
    chartInstance.value = echarts.init(chartRef.value)
    if (optionFactory) {
      chartInstance.value.setOption(optionFactory())
    }
    // 监听窗口尺寸变化，自动 resize
    window.addEventListener('resize', handleResize)
  }

  /**
   * 窗口 resize 时调用图表 resize
   */
  const handleResize = () => {
    chartInstance.value?.resize()
  }

  /**
   * 手动设置/更新图表配置
   */
  const setChartOption = (option: EChartsOption, notMerge = false) => {
    chartInstance.value?.setOption(option, notMerge)
  }

  onMounted(initChart)
  onBeforeUnmount(() => {
    window.removeEventListener('resize', handleResize)
    // 销毁实例并清空引用，防止内存泄漏
    chartInstance.value?.dispose()
    chartInstance.value = undefined
  })

  return {
    chartInstance,
    setChartOption
  }
}
