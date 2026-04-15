import type { ECharts, EChartsOption } from 'echarts'
import { onBeforeUnmount, onMounted, shallowRef, type Ref } from 'vue'
import * as echarts from 'echarts'

export function useECharts(
  chartRef: Ref<HTMLElement | null>,
  optionFactory?: () => EChartsOption
) {
  const chartInstance = shallowRef<ECharts>()

  const initChart = () => {
    if (!chartRef.value) return
    chartInstance.value = echarts.init(chartRef.value)
    if (optionFactory) {
      chartInstance.value.setOption(optionFactory())
    }
    window.addEventListener('resize', handleResize)
  }

  const handleResize = () => {
    chartInstance.value?.resize()
  }

  const setChartOption = (option: EChartsOption) => {
    chartInstance.value?.setOption(option)
  }

  onMounted(initChart)
  onBeforeUnmount(() => {
    window.removeEventListener('resize', handleResize)
    chartInstance.value?.dispose()
    chartInstance.value = undefined
  })

  return {
    chartInstance,
    setChartOption
  }
}
