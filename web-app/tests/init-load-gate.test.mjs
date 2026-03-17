/**
 * @file init-load-gate.test.mjs
 * @description 页面初始化加载门控测试，确保宿主模式在免登录前不提前触发字典/数据请求。
 * @author Codex
 * @date 2026-03-04
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  hasAuthToken,
  shouldLoadPageDataOnContextChange,
  shouldPreloadDictsOnMounted
} from "../src/pages/parts-order/utils/init-load-gate.js";

/**
 * 宿主模式 + 无上下文：应跳过首轮加载，等待桥接上下文（含免登录）完成后再请求数据。
 */
test("shouldLoadPageDataOnContextChange 在宿主模式无上下文时返回 false", () => {
  const result = shouldLoadPageDataOnContextChange({
    contextMessage: null,
    hasToken: false
  });

  assert.equal(result, false);
});

/**
 * 手动模式 + 无上下文：同样应跳过自动加载，避免初始化阶段触发受保护接口。
 */
test("shouldLoadPageDataOnContextChange 在手动模式无上下文时返回 false", () => {
  const result = shouldLoadPageDataOnContextChange({
    contextMessage: null,
    hasToken: false
  });

  assert.equal(result, false);
});

/**
 * 有上下文但缺少 token：仍不应加载，避免出现“认证失败，无法访问系统资源”噪声。
 */
test("shouldLoadPageDataOnContextChange 在无 token 时返回 false", () => {
  const result = shouldLoadPageDataOnContextChange({
    contextMessage: {
      messageId: "ctx-1"
    },
    hasToken: false
  });

  assert.equal(result, false);
});

/**
 * 上下文和 token 均就绪时允许加载。
 */
test("shouldLoadPageDataOnContextChange 在上下文与 token 就绪时返回 true", () => {
  const result = shouldLoadPageDataOnContextChange({
    contextMessage: {
      messageId: "ctx-2"
    },
    hasToken: true
  });

  assert.equal(result, true);
});

/**
 * mounted 阶段不再自动预加载字典：统一等待免登录链路后再走页面加载。
 */
test("shouldPreloadDictsOnMounted 固定返回 false", () => {
  assert.equal(shouldPreloadDictsOnMounted({}), false);
  assert.equal(shouldPreloadDictsOnMounted({ isHostContextMode: true }), false);
  assert.equal(shouldPreloadDictsOnMounted({ isHostContextMode: false }), false);
});

/**
 * token 判定：仅非空字符串视为有效 token。
 */
test("hasAuthToken 仅在 token 非空时返回 true", () => {
  assert.equal(hasAuthToken(""), false);
  assert.equal(hasAuthToken("   "), false);
  assert.equal(hasAuthToken(null), false);
  assert.equal(hasAuthToken(undefined), false);
  assert.equal(hasAuthToken("token-1"), true);
});
