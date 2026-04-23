<template>
  <div :style="{ display: 'flex' }">
    <!-- Label cell (empty for categoryRow) -->
    <TableCell
      :text="isCategoryRow ? '' : header.label"
      :layout="layout"
      :width="marginLeft"
      :font-size="fontSize"
      :tilt-angle="tiltAngle"
      :forced-height="rowHeight"
      :truncate="false"
      :extra-style="{
        backgroundColor: 'transparent',
        border: 'none'
      }"
    />

    <!-- Data cells -->
    <div :style="{ display: 'flex' }">
      <template
        v-if="
          !isNarrow || layout === 'vertical' || layout === 'horizontal'
        "
      >
        <TableCell
          v-for="(cell, idx) in visibleCells"
          :key="`cell-${yIndex}-${header.value}-${idx}`"
          :text="cell.text"
          :layout="layout"
          :width="cell.width"
          :font-size="fontSize"
          :tilt-angle="tiltAngle"
          :forced-height="rowHeight"
          :truncate="false"
          :extra-style="cell.extraStyle"
        />
      </template>
      <!-- Narrow tilted merged cells -->
      <template v-else>
        <TableCell
          v-for="(group, gIdx) in cellGroups"
          :key="`group-${yIndex}-${header.value}-${gIdx}`"
          :text="group.text"
          :layout="layout"
          :width="group.width"
          :font-size="fontSize"
          :tilt-angle="tiltAngle"
          :forced-height="rowHeight"
          :truncate="false"
          :extra-style="getGroupExtraStyle(gIdx)"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import TableCell from '@/components/TableCell/TableCell.vue'
import type { ChartDataItem, TableHeader } from '@/types/echarts'
import type { HeaderColumnConfig } from '@/composables/useTableAxis'

const props = defineProps<{
  yIndex: number
  header: TableHeader
  values: ChartDataItem[]
  visibleStartIndex: number
  marginLeft: number
  layout: 'horizontal' | 'vertical' | 'tilted'
  tiltAngle: number
  rowHeight: number
  fontSize: number
  isNarrowCell: boolean
  autoColumnWidth: number
  isColumnVisible: (index: number) => boolean
  config: HeaderColumnConfig | null
  bgColor?: string
  cellBgColors?: string[]
  getCellGroups: (
    values: ChartDataItem[],
    header: TableHeader
  ) => { text: string; width: number }[]
  getHeaderCellGroups: (
    configs: Record<string, HeaderColumnConfig>,
    values: ChartDataItem[],
    header: TableHeader
  ) => { text: string; width: number }[]
  getGroupBgColor?: (gIdx: number) => string
}>()

const isCategoryRow = computed(() => props.header.label === 'categoryRow')

const isNarrow = computed(() => {
  if (!props.isNarrowCell) return false
  return props.config?.isNarrowMode ?? false
})

const columnWidth = computed(() => {
  if (!props.isNarrowCell) return props.autoColumnWidth
  if (!props.config) return props.autoColumnWidth
  return props.config.isNarrowMode && props.layout === 'vertical'
    ? props.config.denseColumnWidth
    : props.config.autoColumnWidth
})

const isCellVisible = (index: number): boolean => {
  if (!props.isNarrowCell) return props.isColumnVisible(index)
  if (!props.config) return props.isColumnVisible(index)
  return props.config.isNarrowMode && props.layout === 'vertical'
    ? props.config.denseVisibleColumns.includes(index)
    : props.config.visibleColumns.includes(index)
}

const visibleCells = computed(() => {
  const cells: {
    text: string
    width: number
    extraStyle: Record<string, string | number>
  }[] = []
  props.values.forEach((item, idx) => {
    if (!isCellVisible(idx)) return
    const text = String(item?.[props.header.value] || '')
    const extraStyle: Record<string, string | number> = isCategoryRow.value
      ? {}
      : {
          backgroundColor:
            props.cellBgColors?.[props.visibleStartIndex + idx] ??
            props.bgColor ??
            'transparent'
        }
    cells.push({ text, width: columnWidth.value, extraStyle })
  })
  return cells
})

const cellGroups = computed(() => {
  if (!isNarrow.value) return []
  if (!props.config) {
    return props.getCellGroups(props.values, props.header)
  }
  return props.getHeaderCellGroups(
    { [props.header.value]: props.config },
    props.values,
    props.header
  )
})

const getGroupExtraStyle = (
  gIdx: number
): Record<string, string | number> => {
  if (isCategoryRow.value) return {}
  const bg =
    props.getGroupBgColor?.(gIdx) ?? props.bgColor ?? 'transparent'
  return { backgroundColor: bg }
}
</script>
