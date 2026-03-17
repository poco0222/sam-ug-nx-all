/**
 * @file panel-toggle.test.mjs
 * @description 下拉/日期触发器显隐判定单测，覆盖二次点击收起与时序竞争场景。
 * @author Codex
 * @date 2026-03-02
 */
import test from "node:test";
import assert from "node:assert/strict";
import { resolvePanelOpenStateByTriggerClick } from "../src/components/base/panel-toggle.js";

/**
 * 当 pointerdown 时面板已展开，即使 click 阶段因焦点迁移先被关闭，也应保持关闭。
 */
test("resolvePanelOpenStateByTriggerClick 在已展开态点击触发器应返回关闭", () => {
  const nextOpen = resolvePanelOpenStateByTriggerClick({
    openAtPointerDown: true,
    openAtClick: false
  });

  assert.equal(nextOpen, false);
});

/**
 * 当 pointerdown 时面板未展开，点击触发器应展开。
 */
test("resolvePanelOpenStateByTriggerClick 在收起态点击触发器应返回展开", () => {
  const nextOpen = resolvePanelOpenStateByTriggerClick({
    openAtPointerDown: false,
    openAtClick: false
  });

  assert.equal(nextOpen, true);
});

/**
 * 若 click 阶段面板仍为展开态，也应收起，保证“再次点击关闭”行为稳定。
 */
test("resolvePanelOpenStateByTriggerClick 在 click 阶段仍展开时返回关闭", () => {
  const nextOpen = resolvePanelOpenStateByTriggerClick({
    openAtPointerDown: true,
    openAtClick: true
  });

  assert.equal(nextOpen, false);
});
