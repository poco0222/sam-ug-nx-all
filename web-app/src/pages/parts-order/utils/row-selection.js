/**
 * @file row-selection.js
 * @description 表格行高亮判定工具，统一处理零件/工艺主键别名与单选多选并存场景。
 * @author Codex
 * @date 2026-03-02
 */

/**
 * 解析零件主键，兼容 partId / id / partID。
 * @param {object|null|undefined} part 零件对象。
 * @returns {string|number|null}
 */
function resolvePartId(part) {
  if (!part || typeof part !== "object") {
    return null;
  }
  return part.partId ?? part.id ?? part.partID ?? null;
}

/**
 * 解析工艺主键，兼容 id / orderId / partRoutingId。
 * @param {object|null|undefined} craft 工艺对象。
 * @returns {string|number|null}
 */
function resolveCraftId(craft) {
  if (!craft || typeof craft !== "object") {
    return null;
  }
  return craft.id ?? craft.orderId ?? craft.partRoutingId ?? null;
}

/**
 * 判定零件行是否应高亮：
 * 1) 当前上下文 selectedPart；
 * 2) 批量操作 selectedParts。
 * @param {{
 *  row: object,
 *  selectedPart?: object|null,
 *  selectedParts?: object[]
 * }} options 判定参数。
 * @returns {boolean}
 */
export function isPartRowHighlighted(options) {
  const selectionState = resolvePartRowSelectionState(options);
  return selectionState.isCurrent || selectionState.isChecked;
}

/**
 * 解析零件行选择状态：区分“当前点击行”和“批量勾选行”。
 * @param {{
 *  row: object,
 *  selectedPart?: object|null,
 *  selectedParts?: object[]
 * }} options 判定参数。
 * @returns {{ isCurrent: boolean, isChecked: boolean }}
 */
export function resolvePartRowSelectionState(options) {
  const rowId = resolvePartId(options?.row);
  if (rowId === null || rowId === undefined || rowId === "") {
    return { isCurrent: false, isChecked: false };
  }

  const selectedPartId = resolvePartId(options?.selectedPart ?? null);
  const isCurrent = selectedPartId === rowId;

  const selectedPartList = Array.isArray(options?.selectedParts) ? options.selectedParts : [];
  const isChecked = selectedPartList.some((item) => resolvePartId(item) === rowId);
  return { isCurrent, isChecked };
}

/**
 * 判定工艺行是否应高亮，跟随当前 selectedCraft。
 * @param {{
 *  row: object,
 *  selectedCraft?: object|null
 * }} options 判定参数。
 * @returns {boolean}
 */
export function isCraftRowHighlighted(options) {
  const selectionState = resolveCraftRowSelectionState(options);
  return selectionState.isCurrent || selectionState.isChecked;
}

/**
 * 解析工艺行选择状态：区分“当前点击行”和“批量勾选行”。
 * @param {{
 *  row: object,
 *  selectedCraft?: object|null,
 *  selectedCrafts?: object[]
 * }} options 判定参数。
 * @returns {{ isCurrent: boolean, isChecked: boolean }}
 */
export function resolveCraftRowSelectionState(options) {
  const rowId = resolveCraftId(options?.row);
  const selectedCraftId = resolveCraftId(options?.selectedCraft ?? null);
  if (rowId === null || rowId === undefined || rowId === "") {
    return { isCurrent: false, isChecked: false };
  }
  const isCurrent = rowId === selectedCraftId;
  const selectedCraftList = Array.isArray(options?.selectedCrafts) ? options.selectedCrafts : [];
  const isChecked = selectedCraftList.some((item) => resolveCraftId(item) === rowId);
  return { isCurrent, isChecked };
}
