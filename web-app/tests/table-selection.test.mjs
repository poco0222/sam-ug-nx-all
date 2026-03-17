/**
 * @file table-selection.test.mjs
 * @description 表格全选状态工具单测，覆盖“全选/半选/取消全选”核心行为。
 * @author Codex
 * @date 2026-03-03
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  collectSelectableRows,
  nextSelectionAfterToggleAll,
  resolveSelectAllState
} from "../src/pages/parts-order/utils/table-selection.js";

/**
 * 仅保留具备有效主键的可选行。
 */
test("collectSelectableRows 过滤无效主键行", () => {
  const rows = [{ id: 1 }, { id: "" }, { id: 2 }, { id: null }, { id: 3 }];
  const selectableRows = collectSelectableRows(rows, (row) => row.id);
  assert.deepEqual(
    selectableRows.map((row) => row.id),
    [1, 2, 3]
  );
});

/**
 * 全选态判定：全部选中时 allSelected=true、indeterminate=false。
 */
test("resolveSelectAllState 在全部选中时返回全选", () => {
  const rows = [{ id: 1 }, { id: 2 }];
  const state = resolveSelectAllState(rows, () => true);
  assert.equal(state.allSelected, true);
  assert.equal(state.indeterminate, false);
  assert.equal(state.selectedCount, 2);
});

/**
 * 半选态判定：部分选中时 allSelected=false、indeterminate=true。
 */
test("resolveSelectAllState 在部分选中时返回半选", () => {
  const rows = [{ id: 1 }, { id: 2 }, { id: 3 }];
  const state = resolveSelectAllState(rows, (row) => row.id !== 2);
  assert.equal(state.allSelected, false);
  assert.equal(state.indeterminate, true);
  assert.equal(state.selectedCount, 2);
});

/**
 * 全选切换：勾选时返回全部可选行，取消时返回空数组。
 */
test("nextSelectionAfterToggleAll 返回全选或清空结果", () => {
  const rows = [{ id: 1 }, { id: 2 }];
  const checkedResult = nextSelectionAfterToggleAll(rows, true);
  const uncheckedResult = nextSelectionAfterToggleAll(rows, false);
  assert.equal(checkedResult.length, 2);
  assert.equal(uncheckedResult.length, 0);
});
