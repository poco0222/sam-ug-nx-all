/**
 * @file list-response.test.mjs
 * @description 列表响应归一化工具单测，覆盖 AjaxResult 与 TableDataInfo 等后端返回结构。
 * @author Codex
 * @date 2026-03-02
 */
import test from "node:test";
import assert from "node:assert/strict";
import { normalizeListResponse } from "../src/pages/parts-order/utils/list-response.js";

/**
 * 验证 AjaxResult.success(list) 结构解析：data.data 应被识别为列表。
 */
test("normalizeListResponse 支持 AjaxResult data.data 数组", () => {
  const response = {
    data: {
      code: 200,
      msg: "操作成功",
      data: [{ id: "a-1434", pCode: "D102-003_101" }]
    }
  };

  const rows = normalizeListResponse(response);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, "a-1434");
});

/**
 * 验证 TableDataInfo 结构解析：data.rows 可直接返回。
 */
test("normalizeListResponse 支持 TableDataInfo data.rows", () => {
  const response = {
    data: {
      rows: [{ id: 1 }],
      total: 1
    }
  };

  const rows = normalizeListResponse(response);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, 1);
});

/**
 * 验证嵌套 data.rows 场景：兼容网关二次封装。
 */
test("normalizeListResponse 支持 data.data.rows 嵌套结构", () => {
  const response = {
    data: {
      code: 200,
      data: {
        rows: [{ id: 2 }]
      }
    }
  };

  const rows = normalizeListResponse(response);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, 2);
});

/**
 * 验证 result/obj 作为列表字段时的兼容性，避免接口分支返回结构差异导致空列表。
 */
test("normalizeListResponse 支持 data.result 与 data.obj 数组", () => {
  const resultResponse = {
    data: {
      code: 200,
      result: [{ id: 3 }]
    }
  };
  const objResponse = {
    data: {
      code: 200,
      obj: [{ id: 4 }]
    }
  };

  const resultRows = normalizeListResponse(resultResponse);
  const objRows = normalizeListResponse(objResponse);
  assert.equal(resultRows.length, 1);
  assert.equal(resultRows[0].id, 3);
  assert.equal(objRows.length, 1);
  assert.equal(objRows[0].id, 4);
});

/**
 * 验证异常输入兜底为空数组。
 */
test("normalizeListResponse 异常输入返回空数组", () => {
  assert.deepEqual(normalizeListResponse(null), []);
  assert.deepEqual(normalizeListResponse({ data: { code: 200, msg: "ok" } }), []);
});
