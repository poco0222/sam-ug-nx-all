/**
 * @file table-selection.js
 * @description 表格勾选与全选状态工具，统一处理“可选行过滤 + 全选态计算”。
 * @author Codex
 * @date 2026-03-03
 */

/**
 * 判断主键值是否有效。
 * @param {any} identity 主键值。
 * @returns {boolean}
 */
function hasValidIdentity(identity) {
  return identity !== null && identity !== undefined && identity !== "";
}

/**
 * 收集可参与勾选的行（过滤无主键行，避免全选行为不稳定）。
 * @param {any[]} rows 原始行数据。
 * @param {(row:any)=>any} resolveRowIdentity 主键解析函数。
 * @returns {any[]}
 */
export function collectSelectableRows(rows, resolveRowIdentity) {
  if (!Array.isArray(rows) || typeof resolveRowIdentity !== "function") {
    return [];
  }
  return rows.filter((row) => hasValidIdentity(resolveRowIdentity(row)));
}

/**
 * 解析全选状态，兼容“全选 / 半选 / 未选”三态。
 * @param {any[]} selectableRows 可选行列表。
 * @param {(row:any)=>boolean} isRowSelected 行是否已选中的判定函数。
 * @returns {{allSelected:boolean,indeterminate:boolean,selectedCount:number,total:number}}
 */
export function resolveSelectAllState(selectableRows, isRowSelected) {
  const rows = Array.isArray(selectableRows) ? selectableRows : [];
  const total = rows.length;
  if (total === 0 || typeof isRowSelected !== "function") {
    return {
      allSelected: false,
      indeterminate: false,
      selectedCount: 0,
      total
    };
  }
  const selectedCount = rows.reduce((count, row) => count + (isRowSelected(row) ? 1 : 0), 0);
  return {
    allSelected: selectedCount === total && total > 0,
    indeterminate: selectedCount > 0 && selectedCount < total,
    selectedCount,
    total
  };
}

/**
 * 根据全选开关返回下一批选中行。
 * @param {any[]} selectableRows 可选行列表。
 * @param {boolean} checked 是否勾选全选。
 * @returns {any[]}
 */
export function nextSelectionAfterToggleAll(selectableRows, checked) {
  const rows = Array.isArray(selectableRows) ? selectableRows : [];
  if (!checked) {
    return [];
  }
  return [...rows];
}
