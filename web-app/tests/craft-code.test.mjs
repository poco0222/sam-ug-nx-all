/**
 * @file craft-code.test.mjs
 * @description 工艺编码解析单测，覆盖详情优先、别名兼容与空值回退。
 * @author Codex
 * @date 2026-03-03
 */
import test from "node:test";
import assert from "node:assert/strict";
import { resolveCraftCodeFromContext } from "../src/pages/parts-order/utils/craft-code.js";

/**
 * 详情对象包含 craftCode 时应优先使用详情值。
 */
test("resolveCraftCodeFromContext 详情 craftCode 优先", () => {
  const code = resolveCraftCodeFromContext({
    detail: { craftCode: "C-DETAIL-01" },
    craft: { craftCode: "C-ROW-01" }
  });
  assert.equal(code, "C-DETAIL-01");
});

/**
 * 当 detail 缺失时，应回退工艺行别名字段 standardCraftCode。
 */
test("resolveCraftCodeFromContext 支持 standardCraftCode 回退", () => {
  const code = resolveCraftCodeFromContext({
    detail: {},
    craft: { standardCraftCode: "STD-01" }
  });
  assert.equal(code, "STD-01");
});

/**
 * 支持 snake_case 字段读取，保留原始值以对齐旧项目请求参数语义。
 */
test("resolveCraftCodeFromContext 支持 snake_case 并保留原始值", () => {
  const code = resolveCraftCodeFromContext({
    detail: { craft_code: "  C-SNAKE-01  " }
  });
  assert.equal(code, "  C-SNAKE-01  ");
});

/**
 * 当工艺对象缺少 craftCode 时，应支持按 routingId 从标准工艺列表反查编码。
 */
test("resolveCraftCodeFromContext 支持 routingId 反查标准工艺编码", () => {
  const code = resolveCraftCodeFromContext({
    craft: { partRoutingId: 1001 },
    standardCraftOptions: [
      { standardCraftId: 1000, standardCraftCode: "STD-00" },
      { standardCraftId: 1001, standardCraftCode: "STD-01" }
    ]
  });
  assert.equal(code, "STD-01");
});

/**
 * 输入无有效字段时应返回空字符串，避免误发非法请求。
 */
test("resolveCraftCodeFromContext 无有效值时返回空字符串", () => {
  const code = resolveCraftCodeFromContext({
    detail: { craftCode: " " },
    craft: { standardCraftCode: null }
  });
  assert.equal(code, "");
});
