/**
 * @file add-craft-dialog-layout.test.mjs
 * @description 添加工艺弹窗结构回归测试，确保关键字段与双列布局不被回退。
 * @author Codex
 * @date 2026-03-04
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * 验证添加工艺弹窗包含“是否必要/是否自动”字段，并使用专用双列布局容器。
 */
test("添加工艺弹窗应包含必要字段并采用双列布局", () => {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const pageFilePath = path.join(currentDir, "../src/pages/parts-order/index.vue");
  const pageSource = fs.readFileSync(pageFilePath, "utf8");

  assert.match(pageSource, /<BaseDialog v-model="openCraftFormDialog" title="添加工艺">/, "未找到添加工艺弹窗定义");
  assert.match(pageSource, /class="app-craft-dialog-grid"/, "添加工艺弹窗缺少双列布局容器");
  assert.match(pageSource, /<span class="text-caption">是否必要<\/span>/, "添加工艺弹窗缺少“是否必要”字段");
  assert.match(pageSource, /v-model="craftCreateForm\.isNeed"/, "“是否必要”字段未绑定 craftCreateForm.isNeed");
  assert.match(pageSource, /<span class="text-caption">是否自动<\/span>/, "添加工艺弹窗缺少“是否自动”字段");
  assert.match(pageSource, /v-model="craftCreateForm\.isAuto"/, "“是否自动”字段未绑定 craftCreateForm.isAuto");
});
