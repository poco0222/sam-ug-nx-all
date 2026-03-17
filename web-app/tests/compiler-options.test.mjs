/**
 * @file compiler-options.test.mjs
 * @description 编制人候选项来源测试，确保前端接口结果优先。
 * @author Codex
 * @date 2026-03-17
 */
import test from "node:test";
import assert from "node:assert/strict";

import { buildCompilerOptions } from "../src/pages/parts-order/utils/compiler-options.js";

/**
 * 有前端候选用户结果时，应优先使用前端结果，并补齐当前编制人。
 */
test("buildCompilerOptions 优先使用前端候选用户列表", () => {
  const result = buildCompilerOptions({
    compilerCandidates: [{ label: "李四", value: "lisi" }],
    payload: {
      createBy: "saved-user",
      compilerOptions: [{ label: "宿主用户", value: "host-user" }]
    }
  });

  assert.deepEqual(result, [
    { label: "李四", value: "lisi" },
    { label: "saved-user", value: "saved-user" }
  ]);
});

/**
 * 当前端候选用户为空时，应退化为当前用户名单项，而不是继续依赖宿主候选数组。
 */
test("buildCompilerOptions 在无前端候选用户时回退当前用户名", () => {
  const result = buildCompilerOptions({
    compilerCandidates: [],
    payload: {
      createBy: "PopoY",
      compilerOptions: [{ label: "宿主用户", value: "host-user" }]
    }
  });

  assert.deepEqual(result, [{ label: "PopoY", value: "PopoY" }]);
});
