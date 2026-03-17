/**
 * @file upload-image-payload.test.mjs
 * @description 上传图片 FormData 构建单测，确保按后端契约提交 files + 最小化 partList。
 * @author Codex
 * @date 2026-03-04
 */
import test from "node:test";
import assert from "node:assert/strict";
import { buildUploadImageFormData } from "../src/pages/parts-order/utils/upload-image-payload.js";

/**
 * 上传参数应仅包含 files 与 partList，且 partList 仅保留后端必需字段。
 */
test("buildUploadImageFormData 仅保留 files 与最小化 partList", () => {
  const firstFile = new File(["first"], "first.png", { type: "image/png" });
  const secondFile = new File(["second"], "second.jpg", { type: "image/jpeg" });

  const formData = buildUploadImageFormData({
    part: {
      id: 9527,
      importPartCode: "D102-003_N01",
      pName: "上模仁",
      isRelease: "2",
      base64: "BASE64-MOCK"
    },
    files: [firstFile, secondFile]
  });

  const keys = [...new Set(Array.from(formData.entries(), ([key]) => key))].sort();

  assert.deepEqual(keys, ["files", "partList"]);
  const partList = JSON.parse(String(formData.get("partList")));
  assert.deepEqual(partList, [{ id: "9527", importPartCode: "D102-003_N01" }]);
  assert.equal(formData.get("partId"), null);
  assert.deepEqual(
    formData.getAll("files").map((file) => file.name),
    ["first.png", "second.jpg"]
  );
});

/**
 * 当零件字段命名为 partId/pcode 时，应映射到后端所需的 id/importPartCode。
 */
test("buildUploadImageFormData 支持 partId 与 pcode 别名映射", () => {
  const formData = buildUploadImageFormData({
    part: {
      partId: "ABCD-1001",
      pcode: "D201-001_A01"
    },
    files: []
  });

  const partList = JSON.parse(String(formData.get("partList")));
  assert.deepEqual(partList, [{ id: "ABCD-1001", importPartCode: "D201-001_A01" }]);
});
