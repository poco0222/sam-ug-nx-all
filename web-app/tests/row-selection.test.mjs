/**
 * @file row-selection.test.mjs
 * @description 行高亮判定单测，覆盖单选上下文与复选集合并行场景。
 * @author Codex
 * @date 2026-03-02
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  isCraftRowHighlighted,
  isPartRowHighlighted,
  resolveCraftRowSelectionState,
  resolvePartRowSelectionState
} from "../src/pages/parts-order/utils/row-selection.js";

/**
 * 点击后的当前零件应高亮，即使尚未勾选到批量集合。
 */
test("isPartRowHighlighted 支持 selectedPart 驱动高亮", () => {
  const highlighted = isPartRowHighlighted({
    row: { partId: 101, pName: "上模仁" },
    selectedPart: { id: 101 },
    selectedParts: []
  });

  assert.equal(highlighted, true);
});

/**
 * 批量勾选集合中的零件也应保持高亮，便于识别操作范围。
 */
test("isPartRowHighlighted 支持 selectedParts 驱动高亮", () => {
  const highlighted = isPartRowHighlighted({
    row: { id: 202, pName: "下模仁" },
    selectedPart: null,
    selectedParts: [{ partID: 202 }]
  });

  assert.equal(highlighted, true);
});

/**
 * 零件行状态应区分当前点击与批量勾选，避免同一高亮样式混淆语义。
 */
test("resolvePartRowSelectionState 区分 current 与 checked", () => {
  const state = resolvePartRowSelectionState({
    row: { partId: 303, pName: "镶件" },
    selectedPart: { id: 303 },
    selectedParts: [{ partID: 303 }]
  });

  assert.deepEqual(state, { isCurrent: true, isChecked: true });
});

/**
 * 工艺行高亮应跟随当前 selectedCraft。
 */
test("isCraftRowHighlighted 支持多别名主键判定", () => {
  const highlighted = isCraftRowHighlighted({
    row: { orderId: "C-01", craftName: "热处理" },
    selectedCraft: { partRoutingId: "C-01" }
  });

  assert.equal(highlighted, true);
});

/**
 * 当前行与上下文主键不一致时不应高亮。
 */
test("isCraftRowHighlighted 在主键不一致时返回 false", () => {
  const highlighted = isCraftRowHighlighted({
    row: { id: 11, craftName: "机加" },
    selectedCraft: { id: 12 }
  });

  assert.equal(highlighted, false);
});

/**
 * 工艺行状态应区分当前点击与批量勾选，便于用户识别当前详情上下文。
 */
test("resolveCraftRowSelectionState 区分 current 与 checked", () => {
  const state = resolveCraftRowSelectionState({
    row: { orderId: "C-08", craftName: "磨削" },
    selectedCraft: { partRoutingId: "C-09" },
    selectedCrafts: [{ id: "C-08" }, { id: "C-09" }]
  });

  assert.deepEqual(state, { isCurrent: false, isChecked: true });
});
