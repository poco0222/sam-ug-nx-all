/**
 * @file parts-order-runtime.test.mjs
 * @description 零件工单运行策略测试，覆盖开发手输模式与打包宿主模式判定。
 * @author Codex
 * @date 2026-03-02
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  resolvePartsOrderRuntimePolicy,
  resolveRuntimeManualModeOverrideFromSearch
} from "../src/config/parts-order-runtime.js";

/**
 * 开发态默认开启手输模式：允许输入并关闭 IPC 匹配。
 */
test("resolvePartsOrderRuntimePolicy 在开发态默认开启手输模式", () => {
  const policy = resolvePartsOrderRuntimePolicy({
    DEV: true,
    PROD: false
  });

  assert.equal(policy.isDevManualMode, true);
  assert.equal(policy.isPackagedHostMode, false);
  assert.equal(policy.allowManualCommandInputs, true);
  assert.equal(policy.enableIpcPartMatching, false);
});

/**
 * 开发态显式关闭手输模式：回退到宿主强约束行为。
 */
test("resolvePartsOrderRuntimePolicy 支持开发态手动关闭", () => {
  const policy = resolvePartsOrderRuntimePolicy({
    DEV: true,
    PROD: false,
    VITE_PARTS_ORDER_DEV_MANUAL_MODE: "false"
  });

  assert.equal(policy.isDevManualMode, false);
  assert.equal(policy.isPackagedHostMode, false);
  assert.equal(policy.allowManualCommandInputs, false);
  assert.equal(policy.enableIpcPartMatching, true);
});

/**
 * 打包态始终使用宿主强约束，忽略开发态开关变量。
 */
test("resolvePartsOrderRuntimePolicy 在打包态强制宿主模式", () => {
  const policy = resolvePartsOrderRuntimePolicy({
    DEV: false,
    PROD: true,
    VITE_PARTS_ORDER_DEV_MANUAL_MODE: "true"
  });

  assert.equal(policy.isDevManualMode, false);
  assert.equal(policy.isPackagedHostMode, true);
  assert.equal(policy.allowManualCommandInputs, false);
  assert.equal(policy.enableIpcPartMatching, true);
});

/**
 * 非法环境变量值按默认策略处理（开发态默认 true）。
 */
test("resolvePartsOrderRuntimePolicy 非法开关值回退默认", () => {
  const policy = resolvePartsOrderRuntimePolicy({
    DEV: true,
    PROD: false,
    VITE_PARTS_ORDER_DEV_MANUAL_MODE: "invalid"
  });

  assert.equal(policy.isDevManualMode, true);
  assert.equal(policy.allowManualCommandInputs, true);
  assert.equal(policy.enableIpcPartMatching, false);
});

/**
 * 运行时覆盖优先：即使生产模式，也可通过覆盖值临时开启手输模式（用于 F5 调试）。
 */
test("resolvePartsOrderRuntimePolicy 支持运行时覆盖优先级", () => {
  const policy = resolvePartsOrderRuntimePolicy(
    {
      DEV: false,
      PROD: true,
      VITE_PARTS_ORDER_DEV_MANUAL_MODE: "false"
    },
    {
      devManualMode: true
    }
  );

  assert.equal(policy.isDevManualMode, true);
  assert.equal(policy.allowManualCommandInputs, true);
  assert.equal(policy.enableIpcPartMatching, false);
  assert.equal(policy.forceContextOverwriteInputs, false);
});

/**
 * URL 查询参数支持读取运行时手输开关，兼容 webManualMode / web_manual_mode 两种命名。
 */
test("resolveRuntimeManualModeOverrideFromSearch 支持解析 URL 覆盖参数", () => {
  assert.deepEqual(resolveRuntimeManualModeOverrideFromSearch("?webManualMode=true"), { devManualMode: true });
  assert.deepEqual(resolveRuntimeManualModeOverrideFromSearch("?web_manual_mode=false"), { devManualMode: false });
  assert.deepEqual(resolveRuntimeManualModeOverrideFromSearch("?webManualMode=invalid"), {});
  assert.deepEqual(resolveRuntimeManualModeOverrideFromSearch(""), {});
});
