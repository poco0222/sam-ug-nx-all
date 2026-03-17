/**
 * @file parts-order-action-confirm.test.mjs
 * @description 零件工单关键按钮二次确认回归测试。
 * @author Codex
 * @date 2026-03-04
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const partsOrderFilePath = path.resolve(__dirname, "../src/pages/parts-order/index.vue");

/**
 * 发布/保存参数/删除工艺按钮应通过统一确认入口触发，避免直接执行危险动作。
 */
test("关键按钮均接入二次确认入口", () => {
  const fileContent = fs.readFileSync(partsOrderFilePath, "utf8");

  assert.match(fileContent, /发布<\/BaseButton>/);
  assert.match(fileContent, /@click="handleReleasePartOrder"/);

  assert.match(fileContent, /零件参数[\s\S]*?@click="submitChangeParams"/m);
  assert.match(fileContent, /工艺参数[\s\S]*?@click="submitChangeCraftForm"/m);
  assert.match(fileContent, /<BaseButton[^>]*@click="handleDeleteCraft"[^>]*>\s*删除\s*<\/BaseButton>/m);

  assert.match(fileContent, /openActionConfirmDialog/);
  assert.match(fileContent, /confirmPendingAction/);
  assert.match(fileContent, /cancelPendingAction/);
});

/**
 * 四个动作应在函数内部先走确认门控，再执行真实提交。
 */
test("动作函数支持 skipActionConfirm 门控参数", () => {
  const fileContent = fs.readFileSync(partsOrderFilePath, "utf8");

  assert.match(fileContent, /async function submitChangeParams\(options = \{\}\)/);
  assert.match(fileContent, /const \{ skipDiffConfirm = false, skipActionConfirm = false \} = options/);

  assert.match(fileContent, /async function submitChangeCraftForm\(options = \{\}\)/);
  assert.match(fileContent, /async function handleDeleteCraft\(options = \{\}\)/);
  assert.match(fileContent, /async function handleReleasePartOrder\(options = \{\}\)/);
});
