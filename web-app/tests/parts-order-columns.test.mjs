/**
 * @file parts-order-columns.test.mjs
 * @description 零件工单页面列配置回归测试，确保与原项目对齐语义一致。
 * @author Codex
 * @date 2026-03-03
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
 * 从页面源码中提取指定数组定义的源码片段，便于做轻量配置回归校验。
 * @param {string} sourceCode 页面源码。
 * @param {string} arrayName 数组变量名。
 * @returns {string}
 */
function extractArrayBlock(sourceCode, arrayName) {
  const blockPattern = new RegExp(`const\\s+${arrayName}\\s*=\\s*\\[([\\s\\S]*?)\\n\\];`);
  const match = sourceCode.match(blockPattern);
  assert.ok(match, `未找到 ${arrayName} 列定义`);
  return match[1];
}

/**
 * 零件参数表应保持“表头居中 + 文本列左对齐 + 数值列右对齐”的对齐策略。
 */
test("partParamColumns 对齐配置与原项目保持一致", () => {
  const fileContent = fs.readFileSync(partsOrderFilePath, "utf8");
  const partParamColumnsBlock = extractArrayBlock(fileContent, "partParamColumns");

  // 参数名称/参数编号：原项目为 header-align=center，单元格默认左对齐。
  assert.match(partParamColumnsBlock, /key:\s*"paramName"[\s\S]*?headerAlign:\s*"center"/);
  assert.match(partParamColumnsBlock, /key:\s*"paramCode"[\s\S]*?headerAlign:\s*"center"/);

  // 计算值/交付值：原项目为 header-align=center 且单元格 align=right。
  assert.match(partParamColumnsBlock, /key:\s*"paramCountValue"[\s\S]*?align:\s*"right"[\s\S]*?headerAlign:\s*"center"/);
  assert.match(partParamColumnsBlock, /key:\s*"paramDeliverValue"[\s\S]*?align:\s*"right"[\s\S]*?headerAlign:\s*"center"/);
});

/**
 * 工艺列表应保持“表头居中 + 文本列左对齐 + 工时列右对齐”的对齐策略。
 */
test("craftColumns 对齐配置与原项目保持一致", () => {
  const fileContent = fs.readFileSync(partsOrderFilePath, "utf8");
  const craftColumnsBlock = extractArrayBlock(fileContent, "craftColumns");

  // 文本列：原项目为 header-align=center，单元格默认左对齐。
  assert.match(craftColumnsBlock, /key:\s*"craftName"[\s\S]*?headerAlign:\s*"center"/);
  assert.match(craftColumnsBlock, /key:\s*"craftCode"[\s\S]*?headerAlign:\s*"center"/);
  assert.match(craftColumnsBlock, /key:\s*"craftType"[\s\S]*?headerAlign:\s*"center"/);
  assert.match(craftColumnsBlock, /key:\s*"craftContent"[\s\S]*?headerAlign:\s*"center"/);
  assert.match(craftColumnsBlock, /key:\s*"deviceList"[\s\S]*?headerAlign:\s*"center"/);
  assert.match(craftColumnsBlock, /key:\s*"specialRequirement"[\s\S]*?headerAlign:\s*"center"/);
  assert.match(craftColumnsBlock, /key:\s*"remark"[\s\S]*?headerAlign:\s*"center"/);

  // 工时列：原项目为 header-align=center 且单元格 align=right。
  assert.match(craftColumnsBlock, /key:\s*"manStandardHours"[\s\S]*?align:\s*"right"[\s\S]*?headerAlign:\s*"center"/);
  assert.match(craftColumnsBlock, /key:\s*"machineryStandardHours"[\s\S]*?align:\s*"right"[\s\S]*?headerAlign:\s*"center"/);
  assert.match(craftColumnsBlock, /key:\s*"shareManStandardHours"[\s\S]*?align:\s*"right"[\s\S]*?headerAlign:\s*"center"/);
  assert.match(craftColumnsBlock, /key:\s*"shareMachineryStandardHours"[\s\S]*?align:\s*"right"[\s\S]*?headerAlign:\s*"center"/);
});

/**
 * 工艺参数表应保持“表头居中 + 公式/工时列右对齐”的对齐策略。
 */
test("processColumns 对齐配置与原项目保持一致", () => {
  const fileContent = fs.readFileSync(partsOrderFilePath, "utf8");
  const processColumnsBlock = extractArrayBlock(fileContent, "processColumns");

  // 工序内容：原项目为 header-align=center，单元格默认左对齐。
  assert.match(processColumnsBlock, /key:\s*"jobContent"[\s\S]*?headerAlign:\s*"center"/);

  // 公式/工时列：原项目为 header-align=center 且单元格 align=right。
  assert.match(processColumnsBlock, /key:\s*"smchF"[\s\S]*?align:\s*"right"[\s\S]*?headerAlign:\s*"center"/);
  assert.match(processColumnsBlock, /key:\s*"smch"[\s\S]*?align:\s*"right"[\s\S]*?headerAlign:\s*"center"/);
  assert.match(processColumnsBlock, /key:\s*"smshF"[\s\S]*?align:\s*"right"[\s\S]*?headerAlign:\s*"center"/);
  assert.match(processColumnsBlock, /key:\s*"smsh"[\s\S]*?align:\s*"right"[\s\S]*?headerAlign:\s*"center"/);
});

/**
 * 零件列表应固定到“件号”列（即件号及其左侧列全部 fixed left）。
 */
test("partColumns 固定列范围与原项目一致", () => {
  const fileContent = fs.readFileSync(partsOrderFilePath, "utf8");
  const partColumnsBlock = extractArrayBlock(fileContent, "partColumns");

  assert.match(partColumnsBlock, /key:\s*"selected"[\s\S]*?fixed:\s*"left"/);
  assert.match(partColumnsBlock, /key:\s*"seq"[\s\S]*?fixed:\s*"left"/);
  assert.match(partColumnsBlock, /key:\s*"pname"[\s\S]*?fixed:\s*"left"/);
  assert.match(partColumnsBlock, /key:\s*"pcode"[\s\S]*?fixed:\s*"left"/);
  assert.match(partColumnsBlock, /key:\s*"importPartCode"[\s\S]*?fixed:\s*"left"/);
});

/**
 * 工艺列表应固定到“工艺编号”列（即工艺编号及其左侧列全部 fixed left）。
 */
test("craftColumns 固定列范围与原项目一致", () => {
  const fileContent = fs.readFileSync(partsOrderFilePath, "utf8");
  const craftColumnsBlock = extractArrayBlock(fileContent, "craftColumns");

  assert.match(craftColumnsBlock, /key:\s*"selected"[\s\S]*?fixed:\s*"left"/);
  assert.match(craftColumnsBlock, /key:\s*"duration"[\s\S]*?fixed:\s*"left"/);
  assert.match(craftColumnsBlock, /key:\s*"craftName"[\s\S]*?fixed:\s*"left"/);
  assert.match(craftColumnsBlock, /key:\s*"craftCode"[\s\S]*?fixed:\s*"left"/);
});

/**
 * 零件参数卡头部应包含“引用UG参数”按钮，且位于“保存参数”按钮之前。
 */
test("零件参数卡头部按钮顺序包含引用UG参数在前", () => {
  const fileContent = fs.readFileSync(partsOrderFilePath, "utf8");
  assert.match(
    fileContent,
    /<article[\s\S]*?app-panel-part-params[\s\S]*?<BaseButton[\s\S]*?>\s*引用UG参数\s*<\/BaseButton>[\s\S]*?<BaseButton[\s\S]*?>\s*保存参数\s*<\/BaseButton>/m
  );
});

/**
 * 零件参数表应绑定 row-class-name 与 cell-class-name，用于差异标记。
 */
test("零件参数表绑定差异标记类名函数", () => {
  const fileContent = fs.readFileSync(partsOrderFilePath, "utf8");
  assert.match(fileContent, /<BaseTable[\s\S]*?:row-class-name="partParamRowClassName"/m);
  assert.match(fileContent, /<BaseTable[\s\S]*?:cell-class-name="partParamCellClassName"/m);
});
