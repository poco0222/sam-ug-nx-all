/**
 * @file ug-reference.test.mjs
 * @description UG 引用图片工具单测，覆盖 base64 解析、图片类型推断与后端匹配文件名生成。
 * @author Codex
 * @date 2026-03-03
 */
import test from "node:test";
import assert from "node:assert/strict";
import { decodeBase64ImageToFile } from "../src/pages/parts-order/utils/ug-reference.js";

/**
 * 验证 data URL 输入可直接解析，文件名应与 importPartCode 一致（仅追加扩展名）。
 */
test("decodeBase64ImageToFile 支持 data:image 前缀", async () => {
  // 使用最小 JPEG 头字节，保证 base64 合法且可解码。
  const rawBase64 = "data:image/jpeg;base64,/9j/AA==";
  const result = decodeBase64ImageToFile({
    rawBase64,
    importPartCode: "D102-003_N01"
  });

  assert.ok(result.file instanceof File);
  assert.equal(result.file.type, "image/jpeg");
  assert.equal(result.file.name, "D102-003_N01.jpg");
  assert.equal(result.file.size, 4);
});

/**
 * 验证纯 base64 输入场景：未声明类型时按图片头自动推断。
 */
test("decodeBase64ImageToFile 在纯 base64 输入时可推断 PNG", () => {
  // PNG 文件签名：89 50 4E 47 0D 0A 1A 0A。
  const rawBase64 = "iVBORw0KGgo=";
  const result = decodeBase64ImageToFile({
    rawBase64,
    importPartCode: "P-001"
  });

  assert.equal(result.file.type, "image/png");
  assert.equal(result.file.name, "P-001.png");
  assert.equal(result.file.size, 8);
});

/**
 * 验证 base64 为空时给出明确错误，避免上传无效文件。
 */
test("decodeBase64ImageToFile 在空字符串输入时抛错", () => {
  assert.throws(
    () => decodeBase64ImageToFile({ rawBase64: "", importPartCode: "P-001" }),
    /base64 为空/
  );
});

/**
 * 验证 base64 非法字符场景，确保错误可被上层业务捕获提示。
 */
test("decodeBase64ImageToFile 在非法 base64 输入时抛错", () => {
  assert.throws(
    () => decodeBase64ImageToFile({ rawBase64: "###", importPartCode: "P-001" }),
    /base64 格式非法/
  );
});

/**
 * 验证 importPartCode 缺失时中断，避免生成无法和后端 partList 匹配的文件名。
 */
test("decodeBase64ImageToFile 在 importPartCode 缺失时抛错", () => {
  assert.throws(
    () => decodeBase64ImageToFile({ rawBase64: "iVBORw0KGgo=", importPartCode: "" }),
    /importPartCode 为空/
  );
});
