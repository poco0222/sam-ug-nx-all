/**
 * @file part-selection.test.mjs
 * @description 零件列表刷新后选中项解析单测，覆盖“是否自动选第一条”的业务开关。
 * @author Codex
 * @date 2026-03-03
 */
import test from "node:test";
import assert from "node:assert/strict";
import { resolveSelectedPartAfterSync } from "../src/pages/parts-order/utils/part-selection.js";

/**
 * 列表为空时应返回空选中。
 */
test("resolveSelectedPartAfterSync 在列表为空时返回 null", () => {
  const selected = resolveSelectedPartAfterSync({
    partList: [],
    previousSelectedCode: "P-001",
    autoSelectFirst: true,
    resolvePartCode: (part) => part.code
  });
  assert.equal(selected, null);
});

/**
 * 旧选中仍存在时应优先保留。
 */
test("resolveSelectedPartAfterSync 优先保留旧选中", () => {
  const rows = [{ code: "P-001" }, { code: "P-002" }];
  const selected = resolveSelectedPartAfterSync({
    partList: rows,
    previousSelectedCode: "P-002",
    autoSelectFirst: false,
    resolvePartCode: (part) => part.code
  });
  assert.equal(selected, rows[1]);
});

/**
 * 未命中旧选中且允许自动选中时，应回退第一条。
 */
test("resolveSelectedPartAfterSync 在自动模式下回退第一条", () => {
  const rows = [{ code: "P-001" }, { code: "P-002" }];
  const selected = resolveSelectedPartAfterSync({
    partList: rows,
    previousSelectedCode: "P-003",
    autoSelectFirst: true,
    resolvePartCode: (part) => part.code
  });
  assert.equal(selected, rows[0]);
});

/**
 * 未命中旧选中且关闭自动选中时，不应锁定第一条。
 */
test("resolveSelectedPartAfterSync 在非自动模式下不回退第一条", () => {
  const rows = [{ code: "P-001" }, { code: "P-002" }];
  const selected = resolveSelectedPartAfterSync({
    partList: rows,
    previousSelectedCode: "P-003",
    autoSelectFirst: false,
    resolvePartCode: (part) => part.code
  });
  assert.equal(selected, null);
});

