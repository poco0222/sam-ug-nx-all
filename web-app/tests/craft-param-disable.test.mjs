/**
 * @file craft-param-disable.test.mjs
 * @description 工艺参数区禁用策略单测，确保与原 Vue2 的门控语义一致。
 * @author Codex
 * @date 2026-03-03
 */
import test from "node:test";
import assert from "node:assert/strict";
import { resolveCraftParamDisabledState } from "../src/pages/parts-order/utils/craft-param-disable.js";

/**
 * 未进入可编辑工艺上下文时，应整体禁用工艺参数区动作与字段。
 */
test("resolveCraftParamDisabledState 在无工艺上下文时整体禁用", () => {
  const disabledState = resolveCraftParamDisabledState({
    hasCraftContext: false,
    isAutoValue: "N"
  });

  assert.equal(disabledState.saveCraftParams, true);
  assert.equal(disabledState.isAutoField, true);
  assert.equal(disabledState.isNeedField, true);
  assert.equal(disabledState.commonFormFields, true);
  assert.equal(disabledState.addProduction, true);
  assert.equal(disabledState.deleteProduction, true);
});

/**
 * 进入可编辑上下文后，除特殊字段外应恢复可编辑。
 */
test("resolveCraftParamDisabledState 在可编辑上下文时按字段规则禁用", () => {
  const disabledState = resolveCraftParamDisabledState({
    hasCraftContext: true,
    isAutoValue: "N"
  });

  assert.equal(disabledState.saveCraftParams, false);
  assert.equal(disabledState.commonFormFields, false);
  assert.equal(disabledState.addProduction, false);
  assert.equal(disabledState.deleteProduction, false);
  // 与 Vue2 保持一致：isNeed 在工艺参数区保持禁用。
  assert.equal(disabledState.isNeedField, true);
  // 与 Vue2 保持一致：isAuto 非 Y 时禁用。
  assert.equal(disabledState.isAutoField, true);
});

/**
 * 当 isAuto 为 Y 且处于可编辑上下文时，isAuto 字段允许编辑。
 */
test("resolveCraftParamDisabledState 在 isAuto=Y 时放开 isAuto 字段", () => {
  const disabledState = resolveCraftParamDisabledState({
    hasCraftContext: true,
    isAutoValue: "Y"
  });

  assert.equal(disabledState.isAutoField, false);
});
