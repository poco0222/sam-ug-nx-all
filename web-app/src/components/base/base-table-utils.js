/**
 * @file base-table-utils.js
 * @description BaseTable 通用工具，统一处理 tooltip 配置与样式解析。
 * @author Codex
 * @date 2026-03-03
 */

/**
 * 判断列是否启用溢出提示，兼容 camelCase / kebab-case 配置写法。
 * @param {object} column 列配置。
 * @returns {boolean}
 */
export function isOverflowTooltipEnabled(column) {
  if (!column || typeof column !== "object") {
    return false;
  }
  return Boolean(column.showOverflowTooltip ?? column["show-overflow-tooltip"]);
}

/**
 * 规范化 tooltip 文本，仅允许基础类型进入 title 属性，避免对象字符串化噪音。
 * @param {unknown} value 待展示值。
 * @returns {string}
 */
export function normalizeTooltipContent(value) {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

/**
 * 解析样式配置（对象或函数）；非法值统一回退为空对象，避免污染内联样式。
 * @param {object|Function|undefined|null} styleInput 样式输入。
 * @param {object} context 回调上下文。
 * @returns {Record<string, string|number>}
 */
export function resolveStyleObject(styleInput, context = {}) {
  const resolved = typeof styleInput === "function" ? styleInput(context) : styleInput;
  if (!resolved || Array.isArray(resolved) || typeof resolved !== "object") {
    return {};
  }
  return resolved;
}

/**
 * 归一化表格对齐枚举到 BaseTable CSS class。
 * @param {string|undefined|null} align 对齐方向。
 * @returns {"text-left"|"text-center"|"text-right"}
 */
function normalizeAlignClass(align) {
  if (align === "center") {
    return "text-center";
  }
  if (align === "right") {
    return "text-right";
  }
  return "text-left";
}

/**
 * 解析表头对齐：优先 headerAlign（兼容 header-align），其次回退 align。
 * @param {object} column 列定义。
 * @returns {"text-left"|"text-center"|"text-right"}
 */
export function resolveHeaderAlignClass(column) {
  const headerAlign = column?.headerAlign ?? column?.["header-align"] ?? column?.align;
  return normalizeAlignClass(headerAlign);
}

/**
 * 解析单元格对齐：仅根据 align，保持与 Element Table 语义一致。
 * @param {object} column 列定义。
 * @returns {"text-left"|"text-center"|"text-right"}
 */
export function resolveCellAlignClass(column) {
  return normalizeAlignClass(column?.align);
}

/**
 * 解析表格结构类名，保持默认开启边框语义，兼容显式关闭。
 * @param {boolean|undefined} border 是否显示边框。
 * @returns {{ "table-bordered": boolean }}
 */
export function resolveTableClassNames(border = true) {
  return {
    "table-bordered": border !== false
  };
}

/**
 * 判断列是否为左固定列，兼容 fixed=true 与 fixed="left" 两种写法。
 * @param {object} column 列定义。
 * @returns {boolean}
 */
export function isFixedLeftColumn(column) {
  const fixed = column?.fixed;
  return fixed === true || fixed === "left";
}

/**
 * 解析列宽像素值，支持 number 与 "120px"/"120" 字符串写法。
 * @param {string|number|undefined|null} width 列宽配置。
 * @returns {number}
 */
function resolveColumnWidthPx(width) {
  if (typeof width === "number" && Number.isFinite(width)) {
    return width;
  }
  if (typeof width !== "string") {
    return 0;
  }
  const numericWidth = Number.parseFloat(width);
  return Number.isFinite(numericWidth) ? numericWidth : 0;
}

/**
 * 解析列宽样式：同一宽度同时作用于 width/minWidth/maxWidth，抑制自动布局漂移。
 * @param {string|number|undefined|null} width 列宽配置。
 * @returns {Record<string, string>}
 */
export function resolveColumnWidthStyle(width) {
  if (typeof width === "number" && Number.isFinite(width) && width > 0) {
    const px = `${width}px`;
    return { width: px, minWidth: px, maxWidth: px };
  }
  if (typeof width === "string") {
    const normalized = width.trim();
    if (!normalized) {
      return {};
    }
    return { width: normalized, minWidth: normalized, maxWidth: normalized };
  }
  return {};
}

/**
 * 计算左固定列的累计 left 偏移映射（key 为列索引）。
 * @param {object[]} columns 列定义数组。
 * @returns {Record<number, number>}
 */
export function buildFixedLeftOffsets(columns = []) {
  const offsets = {};
  let currentLeft = 0;
  for (let index = 0; index < columns.length; index += 1) {
    const column = columns[index];
    if (!isFixedLeftColumn(column)) {
      continue;
    }
    offsets[index] = currentLeft;
    currentLeft += resolveColumnWidthPx(column?.width);
  }
  return offsets;
}

/**
 * 解析固定列样式：输出 sticky + left，并按表头/单元格区分 z-index。
 * @param {object} column 列定义。
 * @param {number} columnIndex 列索引。
 * @param {Record<number, number>} fixedLeftOffsets 固定列偏移映射。
 * @param {"header"|"body"} scope 样式应用范围。
 * @returns {Record<string, string|number>}
 */
export function resolveFixedColumnStyle(column, columnIndex, fixedLeftOffsets = {}, scope = "body") {
  if (!isFixedLeftColumn(column)) {
    return {};
  }
  const leftOffset = fixedLeftOffsets[columnIndex];
  if (typeof leftOffset !== "number") {
    return {};
  }
  const fixedStyle = {
    position: "sticky",
    left: `${leftOffset}px`,
    zIndex: scope === "header" ? 4 : 2
  };
  if (scope === "header") {
    fixedStyle.background = "var(--table-header-fixed-bg, var(--table-header-bg, #f8f9fb))";
    return fixedStyle;
  }
  // body 固定列在横向滚动时必须保持不透明背景，避免滚动区内容透出。
  fixedStyle.background = "var(--table-row-fixed-background, var(--surface-content-bg, #ffffff))";
  return fixedStyle;
}
