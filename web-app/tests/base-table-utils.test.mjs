/**
 * @file base-table-utils.test.mjs
 * @description BaseTable 工具函数单测，覆盖 tooltip 开关与样式解析行为。
 * @author Codex
 * @date 2026-03-03
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  buildFixedLeftOffsets,
  resolveFixedColumnStyle,
  resolveTableClassNames,
  resolveHeaderAlignClass,
  resolveCellAlignClass,
  resolveColumnWidthStyle,
  isOverflowTooltipEnabled,
  normalizeTooltipContent,
  resolveStyleObject
} from "../src/components/base/base-table-utils.js";

/**
 * 列定义使用 showOverflowTooltip 时应开启溢出提示。
 */
test("isOverflowTooltipEnabled 支持 camelCase 配置", () => {
  assert.equal(isOverflowTooltipEnabled({ showOverflowTooltip: true }), true);
});

/**
 * 列定义使用 show-overflow-tooltip 时也应开启溢出提示（兼容旧配置命名）。
 */
test("isOverflowTooltipEnabled 支持 kebab-case 配置", () => {
  assert.equal(isOverflowTooltipEnabled({ "show-overflow-tooltip": true }), true);
});

/**
 * tooltip 文案仅接受 string/number/boolean，其他类型返回空串。
 */
test("normalizeTooltipContent 仅格式化基础类型", () => {
  assert.equal(normalizeTooltipContent("abc"), "abc");
  assert.equal(normalizeTooltipContent(123), "123");
  assert.equal(normalizeTooltipContent(false), "false");
  assert.equal(normalizeTooltipContent(undefined), "");
  assert.equal(normalizeTooltipContent({ a: 1 }), "");
});

/**
 * 样式解析支持对象与函数两种输入，非法返回值回退为空对象。
 */
test("resolveStyleObject 支持对象/函数/非法值回退", () => {
  const fromObject = resolveStyleObject({ padding: "0" });
  assert.deepEqual(fromObject, { padding: "0" });

  const fromFunction = resolveStyleObject(
    ({ rowIndex }) => ({ height: `${rowIndex}px` }),
    { rowIndex: 12 }
  );
  assert.deepEqual(fromFunction, { height: "12px" });

  const fallback = resolveStyleObject(() => "invalid");
  assert.deepEqual(fallback, {});
});

/**
 * 表头对齐优先使用 headerAlign，未配置时回退 align，再回退 left。
 */
test("resolveHeaderAlignClass 支持 headerAlign 优先与默认回退", () => {
  assert.equal(resolveHeaderAlignClass({ headerAlign: "center", align: "right" }), "text-center");
  assert.equal(resolveHeaderAlignClass({ align: "right" }), "text-right");
  assert.equal(resolveHeaderAlignClass({}), "text-left");
});

/**
 * 兼容 kebab-case 表头对齐配置，且单元格仍只使用 align。
 */
test("resolveHeaderAlignClass 与 resolveCellAlignClass 兼容旧字段命名", () => {
  assert.equal(resolveHeaderAlignClass({ "header-align": "center" }), "text-center");
  assert.equal(resolveCellAlignClass({ align: "right", headerAlign: "center" }), "text-right");
  assert.equal(resolveCellAlignClass({}), "text-left");
});

/**
 * BaseTable 默认开启边框网格，可通过 border=false 显式关闭。
 */
test("resolveTableClassNames 默认开启边框并支持关闭", () => {
  assert.deepEqual(resolveTableClassNames(), { "table-bordered": true });
  assert.deepEqual(resolveTableClassNames(false), { "table-bordered": false });
});

/**
 * 固定列偏移应按固定列宽度累计，非固定列不应出现在偏移映射中。
 */
test("buildFixedLeftOffsets 按固定列宽度累计左偏移", () => {
  const offsets = buildFixedLeftOffsets([
    { key: "a", width: "70px", fixed: "left" },
    { key: "b", width: "80px", fixed: "left" },
    { key: "c", width: "90px" },
    { key: "d", width: "100px", fixed: true }
  ]);
  assert.deepEqual(offsets, { 0: 0, 1: 70, 3: 150 });
});

/**
 * 列宽样式应同步写入 width/minWidth/maxWidth，避免自动布局导致宽度漂移。
 */
test("resolveColumnWidthStyle 锁定列宽并兼容无效值", () => {
  assert.deepEqual(resolveColumnWidthStyle("120px"), {
    width: "120px",
    minWidth: "120px",
    maxWidth: "120px"
  });
  assert.deepEqual(resolveColumnWidthStyle(80), {
    width: "80px",
    minWidth: "80px",
    maxWidth: "80px"
  });
  assert.deepEqual(resolveColumnWidthStyle(""), {});
  assert.deepEqual(resolveColumnWidthStyle(null), {});
});

/**
 * 固定列样式应输出 sticky 与 left，表头/单元格 z-index 需区分。
 */
test("resolveFixedColumnStyle 生成固定列样式", () => {
  const offsets = { 0: 0, 1: 70 };
  const headerStyle = resolveFixedColumnStyle({ fixed: "left" }, 1, offsets, "header");
  const bodyStyle = resolveFixedColumnStyle({ fixed: "left" }, 1, offsets, "body");
  const normalStyle = resolveFixedColumnStyle({}, 2, offsets, "body");

  assert.equal(headerStyle.position, "sticky");
  assert.equal(headerStyle.left, "70px");
  assert.equal(headerStyle.zIndex, 4);

  assert.equal(bodyStyle.position, "sticky");
  assert.equal(bodyStyle.left, "70px");
  assert.equal(bodyStyle.zIndex, 2);
  assert.equal(
    bodyStyle.background,
    "var(--table-row-fixed-background, var(--surface-content-bg, #ffffff))"
  );

  assert.deepEqual(normalStyle, {});
});
