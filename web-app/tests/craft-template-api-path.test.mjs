/**
 * @file craft-template-api-path.test.mjs
 * @description 工艺模板 API 路径回归测试，防止 selectCraftPTList 路径误配导致 404。
 * @author Codex
 * @date 2026-03-04
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * 验证“添加工艺”依赖的 selectCraftPTList 接口路径与后端 Controller 路由一致。
 */
test("selectCraftPTList 应使用 SamMoldCraftTemplateDetailController 路径", () => {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  // 读取 API 定义源码，校验关键请求路径字符串，避免迁移时路径写错。
  const apiFilePath = path.join(currentDir, "../src/services/api/samMoldCraftTemplate.js");
  const apiSource = fs.readFileSync(apiFilePath, "utf8");

  assert.match(
    apiSource,
    /\/SamMoldCraftTemplateDetailController\/detail\/selectCraftPTList\/\$\{moldTypeTemplateDetailId\}/,
    "selectCraftPTList 请求路径与后端路由不一致，可能导致 404"
  );
});
