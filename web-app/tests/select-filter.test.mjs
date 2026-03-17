/**
 * @file select-filter.test.mjs
 * @description 下拉筛选工具单测，覆盖标签匹配、值匹配与空关键词回退。
 * @author Codex
 * @date 2026-03-03
 */
import test from "node:test";
import assert from "node:assert/strict";
import { filterSelectOptions } from "../src/components/base/select-filter.js";

/**
 * 关键词应支持按 label/value 不区分大小写匹配。
 */
test("filterSelectOptions 支持标签和值的大小写筛选", () => {
  const sourceOptions = [
    { label: "Alpha", value: "A-01", disabled: false },
    { label: "Beta", value: "B-02", disabled: false },
    { label: "Gamma", value: 300, disabled: false }
  ];

  assert.deepEqual(filterSelectOptions(sourceOptions, "alp"), [
    { label: "Alpha", value: "A-01", disabled: false }
  ]);
  assert.deepEqual(filterSelectOptions(sourceOptions, "b-0"), [
    { label: "Beta", value: "B-02", disabled: false }
  ]);
  assert.deepEqual(filterSelectOptions(sourceOptions, "300"), [
    { label: "Gamma", value: 300, disabled: false }
  ]);
});

/**
 * 空关键词应返回全部选项；非数组输入应返回空数组。
 */
test("filterSelectOptions 对空关键词与异常输入有稳定回退", () => {
  const sourceOptions = [{ label: "Alpha", value: "A-01", disabled: false }];
  assert.deepEqual(filterSelectOptions(sourceOptions, "  "), sourceOptions);
  assert.deepEqual(filterSelectOptions(null, "alpha"), []);
});
