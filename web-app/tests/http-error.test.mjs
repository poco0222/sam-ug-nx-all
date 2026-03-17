/**
 * @file http-error.test.mjs
 * @description HTTP 异常文案解析工具单测，确保后端 msg/message 能被稳定透传。
 * @author Codex
 * @date 2026-03-04
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  isBusinessSuccessCode,
  extractServerMessage,
  normalizeTransportErrorMessage,
  resolveHttpErrorMessage
} from "../src/services/http-error.js";

/**
 * 业务码判定应兼容数字与字符串 200。
 */
test("isBusinessSuccessCode 支持 200 与 \"200\"", () => {
  assert.equal(isBusinessSuccessCode(200), true);
  assert.equal(isBusinessSuccessCode("200"), true);
  assert.equal(isBusinessSuccessCode(500), false);
});

/**
 * 服务器错误文案优先提取 msg/message，且支持一层嵌套 data。
 */
test("extractServerMessage 优先提取 msg/message", () => {
  assert.equal(extractServerMessage({ msg: "工序已存在" }), "工序已存在");
  assert.equal(extractServerMessage({ message: "参数非法" }), "参数非法");
  assert.equal(extractServerMessage({ data: { msg: "内部错误" } }), "内部错误");
  assert.equal(extractServerMessage({}), "");
});

/**
 * 传输层异常文案需要与原项目一致：网络异常、超时、HTTP 状态码。
 */
test("normalizeTransportErrorMessage 兼容网络/超时/状态码", () => {
  assert.equal(normalizeTransportErrorMessage("Network Error"), "后端接口连接异常");
  assert.equal(normalizeTransportErrorMessage("timeout of 15000ms exceeded"), "系统接口请求超时");
  assert.equal(normalizeTransportErrorMessage("Request failed with status code 500"), "系统接口500异常");
});

/**
 * 统一错误解析：优先返回后端 msg，无后端消息时回退传输层文案。
 */
test("resolveHttpErrorMessage 优先后端消息并兼容状态码兜底", () => {
  const backendMessage = resolveHttpErrorMessage({
    message: "Request failed with status code 500",
    response: { status: 500, data: { msg: "模具号下正式实体有待审核的文件不能发布工艺!" } }
  });
  assert.equal(backendMessage, "模具号下正式实体有待审核的文件不能发布工艺!");

  const fallbackMessage = resolveHttpErrorMessage({
    message: "Request failed with status code 404",
    response: { status: 404, data: "" }
  });
  assert.equal(fallbackMessage, "系统接口404异常");
});
