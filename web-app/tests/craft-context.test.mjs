/**
 * @file craft-context.test.mjs
 * @description 工艺上下文主键判定单测，覆盖首条工艺 ID 为 0 的场景。
 * @author Codex
 * @date 2026-03-03
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  hasCraftEditingContext,
  hasUsablePrimaryKey,
  resolveCraftPrimaryKey
} from "../src/pages/parts-order/utils/craft-context.js";

/**
 * 当工艺主键为 0 时，仍应视为可用主键。
 */
test("hasUsablePrimaryKey 在值为 0 时返回 true", () => {
  assert.equal(hasUsablePrimaryKey(0), true);
});

/**
 * 当工艺主键为空值时，应视为不可用。
 */
test("hasUsablePrimaryKey 在空值时返回 false", () => {
  assert.equal(hasUsablePrimaryKey(null), false);
  assert.equal(hasUsablePrimaryKey(undefined), false);
  assert.equal(hasUsablePrimaryKey(""), false);
});

/**
 * 当工艺对象存在且主键为 0 时，仍应视为已进入可编辑上下文。
 */
test("hasCraftEditingContext 在主键为 0 时返回 true", () => {
  assert.equal(hasCraftEditingContext({ craftCode: "A01" }, 0), true);
});

/**
 * 当工艺对象缺失或主键为空时，应视为未进入可编辑上下文。
 */
test("hasCraftEditingContext 在对象或主键缺失时返回 false", () => {
  assert.equal(hasCraftEditingContext(null, 1), false);
  assert.equal(hasCraftEditingContext({ craftCode: "A01" }, ""), false);
});

/**
 * 兼容工艺主键字段别名，避免接口大小写差异导致首条工艺无法识别。
 */
test("resolveCraftPrimaryKey 支持常见主键字段别名", () => {
  assert.equal(resolveCraftPrimaryKey({ id: 101 }), 101);
  assert.equal(resolveCraftPrimaryKey({ orderId: 102 }), 102);
  assert.equal(resolveCraftPrimaryKey({ partRoutingId: 103 }), 103);
  assert.equal(resolveCraftPrimaryKey({ orderID: 104 }), 104);
  assert.equal(resolveCraftPrimaryKey({ partRoutingID: 105 }), 105);
  assert.equal(resolveCraftPrimaryKey({ part_routing_id: 106 }), 106);
  assert.equal(resolveCraftPrimaryKey({ orderid: 107 }), 107);
  assert.equal(resolveCraftPrimaryKey({ partRoutingid: 108 }), 108);
  assert.equal(resolveCraftPrimaryKey({ samMesPartsOrderId: 109 }), 109);
  assert.equal(resolveCraftPrimaryKey({ sam_mes_parts_order_id: 110 }), 110);
});
