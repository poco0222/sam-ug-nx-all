/**
 * @file detail-response.test.mjs
 * @description 详情响应归一化工具单测，覆盖 AjaxResult 与直接对象两类结构。
 * @author Codex
 * @date 2026-03-03
 */
import test from "node:test";
import assert from "node:assert/strict";
import { normalizeDetailResponse } from "../src/pages/parts-order/utils/detail-response.js";

/**
 * 验证 AjaxResult.success(object) 结构解析：data.data 应被识别为详情对象。
 */
test("normalizeDetailResponse 支持 AjaxResult data.data 对象", () => {
  const response = {
    data: {
      code: 200,
      msg: "操作成功",
      data: {
        id: 1024,
        isAuto: "Y"
      }
    }
  };

  const detail = normalizeDetailResponse(response);
  assert.equal(detail.id, 1024);
  assert.equal(detail.isAuto, "Y");
});

/**
 * 验证直接详情结构解析：response.data 为对象时可直接返回。
 */
test("normalizeDetailResponse 支持 response.data 详情对象", () => {
  const response = {
    data: {
      id: 2048,
      isNeed: "N"
    }
  };

  const detail = normalizeDetailResponse(response);
  assert.equal(detail.id, 2048);
  assert.equal(detail.isNeed, "N");
});

/**
 * 验证异常输入兜底为空对象，避免表单回填阶段访问空值报错。
 */
test("normalizeDetailResponse 异常输入返回空对象", () => {
  assert.deepEqual(normalizeDetailResponse(null), {});
  assert.deepEqual(normalizeDetailResponse({ data: [] }), {});
});
