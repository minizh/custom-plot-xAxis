import { ref, onMounted, type Ref } from 'vue'
import type { EChartsOption } from 'echarts'
import type { ChartDataItem } from '@/types/echarts'

/**
 * 折线图演示数据
 */
export interface DemoChartData {
  categories: string[]
  values: ChartDataItem[]
}

/**
 * 生成基础折线图配置（不含数据）
 * 用于各 Template.vue 中减少重复 option 拼装代码
 */
export function createLineChartOption(
  data: DemoChartData,
  titleText: string,
  extraOptions: Partial<EChartsOption> = {}
): EChartsOption {
  return {
    title: { text: titleText, left: 'center' },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      formatter: (params: any) => {
        const { name, value } = params[0]
        return `waferId:${name},value:${value}`
      }
    },
    legend: { data: ['数值'], top: 30 },
    grid: { left: '4%', right: '4%', bottom: '10%', containLabel: true },
    xAxis: {
      type: 'category',
      data: data.categories,
      axisLabel: { rotate: 45 }
    },
    yAxis: { type: 'value', name: '数值' },
    dataZoom: [
      {
        type: 'inside',
        xAxisIndex: 0,
        zoomOnMouseWheel: true,
        moveOnMouseWheel: true,
        moveOnMouseMove: true,
        throttle: 100
      }
    ],
    series: [
      {
        name: '数值',
        type: 'line',
        data: data.values.map((item) => (item as Record<string, unknown>).value as number),
        itemStyle: { color: '#409eff' }
      }
    ],
    ...extraOptions
  }
}

/**
 * Composable: 封装演示页面中常见的数据生成 + 图表挂载流程
 * @param setChartOption - useECharts 返回的设置 option 方法
 * @param title - 图表标题
 * @param generateFn - 生成 DemoChartData 的函数
 * @param customOption - 自定义的 echarts option 覆盖
 */
export function useChartDemo(
  setChartOption: (option: EChartsOption) => void,
  title: string,
  generateFn: () => DemoChartData,
  customOption: Partial<EChartsOption> = {}
) {
  const chartData: Ref<DemoChartData | undefined> = ref()

  const generateData = () => {
    chartData.value = generateFn()
  }

  const refreshChart = () => {
    if (!chartData.value) return
    const option = createLineChartOption(chartData.value, title, customOption)
    setChartOption(option)
  }

  onMounted(() => {
    generateData()
    refreshChart()
  })

  return {
    chartData,
    generateData,
    refreshChart
  }
}
