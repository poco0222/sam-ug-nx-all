/**
 * @file dict-format.test.mjs
 * @description 字典格式化工具单测，覆盖字典响应解析、兜底映射与是/否兼容格式化。
 * @author Codex
 * @date 2026-03-02
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDictLabelMapFromResponse,
  formatDictLabel,
  formatYesNoLabel
} from "../src/pages/parts-order/utils/dict-format.js";

/**
 * 验证字典响应解析：应兼容 dictValue/dictLabel 结构并产出 label 映射。
 */
test("buildDictLabelMapFromResponse 支持标准字典响应", () => {
  const map = buildDictLabelMapFromResponse(
    {
      data: {
        data: [
          { dictValue: "1", dictLabel: "标准件" },
          { dictValue: "2", dictLabel: "非标件" }
        ]
      }
    },
    {}
  );

  assert.equal(map["1"], "标准件");
  assert.equal(map["2"], "非标件");
});

/**
 * 验证字典为空时应回退到内置映射，避免页面显示原始编码。
 */
test("buildDictLabelMapFromResponse 空字典时回退到 fallback", () => {
  const fallback = { "1": "标准件" };
  const map = buildDictLabelMapFromResponse({ data: { data: [] } }, fallback);
  assert.deepEqual(map, fallback);
});

/**
 * 验证字典部分返回时仍保留 fallback 缺省项，并允许接口字典覆盖同键。
 */
test("buildDictLabelMapFromResponse 合并 fallback 与接口字典", () => {
  const fallback = { "0": "锻件", "1": "标准件", "5": "铸铁件" };
  const map = buildDictLabelMapFromResponse(
    {
      data: {
        data: [
          { dictValue: "1", dictLabel: "标准件(新)" },
          { dictValue: "2", dictLabel: "非标件" }
        ]
      }
    },
    fallback
  );

  assert.equal(map["0"], "锻件");
  assert.equal(map["5"], "铸铁件");
  assert.equal(map["1"], "标准件(新)");
  assert.equal(map["2"], "非标件");
});

/**
 * 验证通用字典格式化：优先字典映射，不命中时回退 fallback，再回退原值。
 */
test("formatDictLabel 按字典/回退/原值顺序格式化", () => {
  const label = formatDictLabel("3", { "1": "标准件" }, { "3": "自制件" });
  assert.equal(label, "自制件");
  assert.equal(formatDictLabel("5", { "1": "标准件" }, { "3": "自制件" }), "5");
});

/**
 * 验证是/否格式化：兼容大小写与数字表达。
 */
test("formatYesNoLabel 兼容 Y/N、true/false、1/0", () => {
  const yesNoMap = { Y: "是", N: "否" };
  const fallback = {
    Y: "是",
    N: "否",
    TRUE: "是",
    FALSE: "否",
    "1": "是",
    "0": "否"
  };
  assert.equal(formatYesNoLabel("y", yesNoMap, fallback), "是");
  assert.equal(formatYesNoLabel("FALSE", yesNoMap, fallback), "否");
  assert.equal(formatYesNoLabel(1, yesNoMap, fallback), "是");
});

/**
 * 验证数字编码容错：字典为 01 或 1.0 时，值为 1 也能命中。
 */
test("formatDictLabel 支持 01/1 与 1.0/1 的容错匹配", () => {
  const map = buildDictLabelMapFromResponse({
    data: {
      data: [{ dictValue: "01", dictLabel: "标准件" }, { dictValue: "2.0", dictLabel: "非标件" }]
    }
  });

  assert.equal(formatDictLabel("1", map, {}), "标准件");
  assert.equal(formatDictLabel(2, map, {}), "非标件");
});
