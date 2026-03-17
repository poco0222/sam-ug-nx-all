/**
 * @file command-bar-condense.test.mjs
 * @description 指挥条凝练态判定单测，覆盖页面滚动与嵌套表格滚动场景。
 * @author Codex
 * @date 2026-03-02
 */
import test from "node:test";
import assert from "node:assert/strict";
import { shouldCondenseCommandBar } from "../src/pages/parts-order/utils/command-bar-condense.js";

/**
 * 默认只根据页面滚动触发凝练态，避免表格内滚动误触发顶部样式收窄。
 */
test("shouldCondenseCommandBar 默认忽略嵌套滚动容器", () => {
  const condensed = shouldCondenseCommandBar({
    pageScrollTop: 0,
    nestedScrollTops: [36, 48],
    threshold: 24
  });

  assert.equal(condensed, false);
});

/**
 * 页面滚动超过阈值后应进入凝练态。
 */
test("shouldCondenseCommandBar 页面滚动超过阈值时返回 true", () => {
  const condensed = shouldCondenseCommandBar({
    pageScrollTop: 28,
    nestedScrollTops: [0],
    threshold: 24
  });

  assert.equal(condensed, true);
});

/**
 * 显式开启嵌套滚动参与判定时，表格滚动也可触发凝练态。
 */
test("shouldCondenseCommandBar 支持显式启用嵌套滚动参与计算", () => {
  const condensed = shouldCondenseCommandBar({
    pageScrollTop: 0,
    nestedScrollTops: [30],
    threshold: 24,
    includeNestedScroll: true
  });

  assert.equal(condensed, true);
});
