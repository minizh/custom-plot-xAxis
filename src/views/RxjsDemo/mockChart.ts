export interface ChartData {
  chartId: string;
  categories: string[];
  series: Array<{
    name: string;
    type: 'line' | 'bar';
    data: number[];
    itemStyle?: { color: string };
    lineStyle?: { color: string };
  }>;
}

/** 全局颜色映射：保证跨图表同 Series 名称颜色一致 */
export const COLOR_MAP: Record<string, string> = {
  指标A: '#5470c6',
  指标B: '#91cc75',
  指标C: '#fac858',
  指标D: '#ee6666',
  指标E: '#73c0de',
};

const POOL = Object.keys(COLOR_MAP);

/** 模拟独立后端请求：延迟 0.6~1.8s 随机，每个 chart 请求 2~3 个指标 */
export function fetchChartData(chartId: string): Promise<ChartData> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const count = 2 + Math.floor(Math.random() * 2);
      const shuffled = [...POOL].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, count);
      const categories = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

      resolve({
        chartId,
        categories,
        series: selected.map((name, idx) => {
          const color = COLOR_MAP[name];
          const type: 'line' | 'bar' = idx % 2 === 0 ? 'line' : 'bar';
          return {
            name,
            type,
            data: categories.map(() => Math.floor(Math.random() * 100)),
            itemStyle: { color },
            ...(type === 'line' ? { lineStyle: { color } } : {}),
          };
        }),
      });
    }, 600 + Math.random() * 1200);
  });
}
