<!--
  @file BaseTable.vue
  @description 基础表格组件，适配模板风格的轻量表格渲染。
  @author Codex
  @date 2026-02-27
-->
<template>
  <div class="table-card">
    <div class="table-wrap">
      <table class="table" :class="resolveTableClassNames(border)">
        <thead>
          <tr class="header-row" :style="resolveHeaderRowStyle()">
            <th
              v-for="(col, columnIndex) in columns"
              :key="col.key"
              :class="[resolveHeaderAlignClass(col), resolveFixedColumnClass(col, columnIndex), resolveHeaderCellClass(col, columnIndex)]"
              :style="resolveHeaderCellStyle(col, columnIndex)"
            >
              <template v-if="col.headerSlot">
                <slot :name="col.headerSlot" :column="col" :column-index="columnIndex">
                  {{ col.title || col.header }}
                </slot>
              </template>
              <template v-else>
                {{ col.title || col.header }}
              </template>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="data.length === 0">
            <td class="empty-cell text-caption" :colspan="columns.length">{{ emptyText }}</td>
          </tr>
          <tr
            v-for="(row, index) in data"
            v-else
            :key="resolveRowKey(row, index)"
            class="body-row transition-glass-fast"
            :class="[resolveRowClass(row, index), { clickable: clickable }]"
            :style="resolveRowStyle(row, index)"
            :tabindex="clickable ? 0 : -1"
            @click="handleRowClick(row)"
            @keydown="handleRowKeydown($event, row)"
          >
            <td
              v-for="(col, columnIndex) in columns"
              :key="`${resolveRowKey(row, index)}-${col.key}`"
              :class="[resolveCellAlignClass(col), resolveFixedColumnClass(col, columnIndex), resolveCellClass(col, row, index, columnIndex)]"
              :style="resolveCellStyle(col, row, index, columnIndex)"
            >
              <template v-if="col.slot">
                <slot :name="col.slot" :row="row" :index="index" :column="col" :column-index="columnIndex">
                  <span
                    :class="{ 'cell-overflow-tooltip': isOverflowTooltipEnabled(col) }"
                    :title="resolveCellTitle(col, row, index)"
                  >
                    {{ resolveCellValue(col, row, index) }}
                  </span>
                </slot>
              </template>
              <template v-else>
                <span
                  :class="{ 'cell-overflow-tooltip': isOverflowTooltipEnabled(col) }"
                  :title="resolveCellTitle(col, row, index)"
                >
                  {{ resolveCellValue(col, row, index) }}
                </span>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import {
  isOverflowTooltipEnabled,
  normalizeTooltipContent,
  resolveStyleObject,
  resolveHeaderAlignClass,
  resolveCellAlignClass,
  resolveTableClassNames,
  resolveColumnWidthStyle,
  isFixedLeftColumn,
  buildFixedLeftOffsets,
  resolveFixedColumnStyle
} from "./base-table-utils.js";

const props = defineProps({
  columns: {
    type: Array,
    default: () => []
  },
  data: {
    type: Array,
    default: () => []
  },
  rowKey: {
    type: [String, Function],
    default: "id"
  },
  emptyText: {
    type: String,
    default: "暂无数据"
  },
  border: {
    type: Boolean,
    default: true
  },
  clickable: {
    type: Boolean,
    default: true
  },
  rowClassName: {
    type: [String, Function],
    default: ""
  },
  rowStyle: {
    type: [Object, Function],
    default: null
  },
  cellStyle: {
    type: [Object, Function],
    default: null
  },
  headerRowStyle: {
    type: [Object, Function],
    default: null
  },
  headerCellStyle: {
    type: [Object, Function],
    default: null
  },
  cellClassName: {
    type: [String, Function],
    default: ""
  },
  headerCellClassName: {
    type: [String, Function],
    default: ""
  }
});

const emit = defineEmits(["row-click"]);
/** 左固定列偏移映射。 */
const fixedLeftOffsets = computed(() => buildFixedLeftOffsets(props.columns));
/** 最右侧左固定列索引，用于绘制固定区与滚动区分隔线。 */
const lastFixedLeftColumnIndex = computed(() => {
  let lastIndex = -1;
  for (let index = 0; index < props.columns.length; index += 1) {
    if (isFixedLeftColumn(props.columns[index])) {
      lastIndex = index;
    }
  }
  return lastIndex;
});

/**
 * 行点击事件分发。
 * @param {object} row 行数据。
 */
function handleRowClick(row) {
  if (!props.clickable) {
    return;
  }
  emit("row-click", row);
}

/**
 * 支持键盘触发行点击，保证焦点态可达。
 * @param {KeyboardEvent} event 键盘事件。
 * @param {object} row 行数据。
 */
function handleRowKeydown(event, row) {
  if (!props.clickable) {
    return;
  }
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }
  event.preventDefault();
  emit("row-click", row);
}

/**
 * 解析单元格展示值，支持列级格式化函数。
 * @param {object} col 列配置。
 * @param {object} row 行数据。
 * @param {number} index 行索引。
 * @returns {string|number}
 */
function resolveCellValue(col, row, index) {
  if (typeof col.formatter === "function") {
    return col.formatter(row, index);
  }
  return row[col.key] ?? "";
}

/**
 * 解析单元格 tooltip 文案，仅在列启用溢出提示时返回。
 * @param {object} col 列配置。
 * @param {object} row 行数据。
 * @param {number} index 行索引。
 * @returns {string}
 */
function resolveCellTitle(col, row, index) {
  if (!isOverflowTooltipEnabled(col)) {
    return "";
  }
  return normalizeTooltipContent(resolveCellValue(col, row, index));
}

/**
 * 解析行附加类名，支持固定类名或函数返回。
 * @param {object} row 行数据。
 * @param {number} index 行索引。
 * @returns {string}
 */
function resolveRowClass(row, index) {
  if (typeof props.rowClassName === "function") {
    return props.rowClassName(row, index) ?? "";
  }
  return props.rowClassName || "";
}

/**
 * 解析行内联样式，兼容对象和函数入参。
 * @param {object} row 行数据。
 * @param {number} rowIndex 行索引。
 * @returns {Record<string, string|number>}
 */
function resolveRowStyle(row, rowIndex) {
  return resolveStyleObject(props.rowStyle, { row, rowIndex });
}

/**
 * 解析单元格内联样式，函数签名对齐 Element Table 习惯。
 * @param {object} column 列配置。
 * @param {object} row 行数据。
 * @param {number} rowIndex 行索引。
 * @param {number} columnIndex 列索引。
 * @returns {Record<string, string|number>}
 */
function resolveCellStyle(column, row, rowIndex, columnIndex) {
  const widthStyle = resolveColumnWidthStyle(column.width);
  const fixedStyle = resolveFixedColumnStyle(column, columnIndex, fixedLeftOffsets.value, "body");
  const customStyle = resolveStyleObject(props.cellStyle, { row, column, rowIndex, columnIndex });
  return { ...widthStyle, ...fixedStyle, ...customStyle };
}

/**
 * 解析表头行样式。
 * @returns {Record<string, string|number>}
 */
function resolveHeaderRowStyle() {
  return resolveStyleObject(props.headerRowStyle);
}

/**
 * 解析表头单元格样式（列宽优先，支持外部覆盖）。
 * @param {object} column 列配置。
 * @param {number} columnIndex 列索引。
 * @returns {Record<string, string|number>}
 */
function resolveHeaderCellStyle(column, columnIndex) {
  const widthStyle = resolveColumnWidthStyle(column.width);
  const fixedStyle = resolveFixedColumnStyle(column, columnIndex, fixedLeftOffsets.value, "header");
  const customStyle = resolveStyleObject(props.headerCellStyle, { column, columnIndex });
  return { ...widthStyle, ...fixedStyle, ...customStyle };
}

/**
 * 解析固定列 class，末尾固定列额外绘制分隔线。
 * @param {object} column 列配置。
 * @param {number} columnIndex 列索引。
 * @returns {string}
 */
function resolveFixedColumnClass(column, columnIndex) {
  if (!isFixedLeftColumn(column)) {
    return "";
  }
  if (columnIndex === lastFixedLeftColumnIndex.value) {
    return "table-cell-fixed-left table-cell-fixed-left-edge";
  }
  return "table-cell-fixed-left";
}

/**
 * 解析单元格类名。
 * @param {object} column 列配置。
 * @param {object} row 行数据。
 * @param {number} rowIndex 行索引。
 * @param {number} columnIndex 列索引。
 * @returns {string}
 */
function resolveCellClass(column, row, rowIndex, columnIndex) {
  if (typeof props.cellClassName === "function") {
    return props.cellClassName({ row, column, rowIndex, columnIndex }) ?? "";
  }
  return props.cellClassName || "";
}

/**
 * 解析表头单元格类名。
 * @param {object} column 列配置。
 * @param {number} columnIndex 列索引。
 * @returns {string}
 */
function resolveHeaderCellClass(column, columnIndex) {
  if (typeof props.headerCellClassName === "function") {
    return props.headerCellClassName({ column, columnIndex }) ?? "";
  }
  return props.headerCellClassName || "";
}

/**
 * 解析行主键，支持字符串字段名或函数。
 * @param {object} row 行数据。
 * @param {number} index 行索引。
 * @returns {string|number}
 */
function resolveRowKey(row, index) {
  if (typeof props.rowKey === "function") {
    return props.rowKey(row, index);
  }
  return row?.[props.rowKey] ?? index;
}
</script>

<style scoped>
.table-card {
  /* 表格默认嵌入在 surface-content 面板内，避免再次叠加玻璃容器。 */
  border-radius: var(--radius-xl);
  overflow: hidden;
  background: transparent;
  border: 0;
  box-shadow: none;
}

.table-wrap {
  overflow: auto;
}

.table {
  width: 100%;
  border-collapse: collapse;
  min-width: 640px;
}

.table-bordered {
  border: 1px solid var(--table-header-border);
}

.table-bordered th,
.table-bordered td {
  border-right: 1px solid var(--table-row-divider);
}

.table-bordered th:last-child,
.table-bordered td:last-child {
  border-right: 0;
}

.table-cell-fixed-left {
  background-clip: padding-box;
  overflow: visible;
}

.table-cell-fixed-left-edge {
  border-right: 0 !important;
}

.table-cell-fixed-left-edge::after {
  content: "";
  position: absolute;
  top: 0;
  right: 0;
  width: 1px;
  height: 100%;
  background: var(--table-fixed-divider-color, var(--table-row-divider));
  pointer-events: none;
}

th {
  padding: var(--table-cell-padding-y, 10px) var(--table-cell-padding-x, 14px);
  white-space: nowrap;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--table-header-foreground);
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--table-header-bg);
  border-bottom: 1px solid var(--table-header-border);
}

td {
  padding: var(--table-cell-padding-y, 10px) var(--table-cell-padding-x, 14px);
  font-size: 13px;
  line-height: 1.35;
  color: var(--foreground);
}

.header-row {
  border-bottom: 0;
}

.body-row {
  /* 固定列专用背景：优先使用不透明主题色，避免横向滚动时透底。 */
  --table-row-fixed-background: var(--table-row-fixed-base-bg, var(--surface-content-bg, #ffffff));
}

.body-row.clickable {
  cursor: pointer;
}

.body-row.clickable:hover {
  background: var(--table-row-hover-bg);
  --table-row-fixed-background: var(--table-row-hover-fixed-bg, var(--table-row-hover-bg, #f5f7fa));
}

/* 使用结构选择器绘制分隔线，避免每个单元格都走内联样式计算。 */
.body-row:not(:last-child) td {
  border-bottom: 1px solid var(--table-row-divider);
}

/* 勾选态：用于批量操作范围识别，视觉强度低于当前点击态。 */
.body-row.app-row-checked,
.body-row.dv-row-checked {
  background: var(--table-row-checked-bg, var(--table-row-hover-bg));
  --table-row-fixed-background: var(--table-row-checked-fixed-bg, var(--table-row-checked-bg, #f4f8ff));
}

.body-row.app-row-checked td,
.body-row.dv-row-checked td {
  background: var(--table-row-checked-bg, var(--table-row-hover-bg));
}

.body-row.app-row-checked td:first-child,
.body-row.dv-row-checked td:first-child {
  box-shadow: inset 2px 0 0 var(--table-row-checked-indicator, rgba(59, 130, 246, 0.35));
}

/* 当前点击态：用于驱动右侧详情上下文，需明显强于勾选态。 */
.body-row.app-row-current,
.body-row.dv-row-current,
/* 兼容历史类名，视为 current 态。 */
.body-row.app-row-selected,
.body-row.dv-row-selected {
  background: var(--table-row-current-bg, var(--table-row-selected-bg));
  --table-row-fixed-background: var(--table-row-current-fixed-bg, var(--table-row-selected-fixed-bg, #edf4ff));
}

.body-row.app-row-current td,
.body-row.dv-row-current td,
.body-row.app-row-selected td,
.body-row.dv-row-selected td {
  background: var(--table-row-current-bg, var(--table-row-selected-bg));
  box-shadow: inset 0 0 0 1px var(--table-row-current-ring, transparent);
}

.body-row.app-row-current td:first-child,
.body-row.dv-row-current td:first-child,
.body-row.app-row-selected td:first-child,
.body-row.dv-row-selected td:first-child {
  box-shadow:
    inset 4px 0 0 var(--table-row-current-indicator, var(--liquid-accent-focus)),
    inset 0 0 0 1px var(--table-row-current-ring, transparent);
}

.body-row:focus-visible {
  outline: none;
  background: var(--table-row-focus-bg);
  --table-row-fixed-background: var(--table-row-focus-fixed-bg, var(--table-row-focus-bg, #eef3ff));
  box-shadow: inset 0 0 0 1px var(--liquid-accent-focus);
}

.empty-cell {
  text-align: center;
  padding: 48px 20px;
  color: var(--muted-foreground);
}

.text-left {
  text-align: left;
}

.text-center {
  text-align: center;
}

.text-right {
  text-align: right;
}

.cell-overflow-tooltip {
  display: block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
