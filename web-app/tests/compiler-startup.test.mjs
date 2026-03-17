/**
 * @file compiler-startup.test.mjs
 * @description 编制人启动链路测试，覆盖用户名优先级、并行请求与接口日志格式。
 * @author Codex
 * @date 2026-03-17
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  formatApiLogBlock,
  resolveStartupCompilerUserName,
  runCompilerStartupSequence
} from "../src/services/compiler-startup.js";

/**
 * 启动时应优先使用已有用户名，全部缺失时回退到 PopoY。
 */
test("resolveStartupCompilerUserName 按已有用户名优先，最终回退 PopoY", () => {
  assert.equal(
    resolveStartupCompilerUserName({
      payload: {
        createBy: "saved-user"
      }
    }),
    "saved-user"
  );

  assert.equal(
    resolveStartupCompilerUserName({
      payload: {
        currentUser: {
          userName: "context-user"
        }
      }
    }),
    "context-user"
  );

  assert.equal(
    resolveStartupCompilerUserName({
      payload: {}
    }),
    "PopoY"
  );
});

/**
 * 启动链路应在拿到用户名后并行触发免登录与候选用户接口，并在免登录完成后再应用 context。
 */
test("runCompilerStartupSequence 会并行触发免登录与候选用户接口", async () => {
  const callSequence = [];
  const logEntries = [];
  const candidateOptions = [{ label: "张三", value: "zhangsan" }];
  let resolveLogin;
  let resolveCandidates;

  const loginPromise = new Promise((resolve) => {
    resolveLogin = resolve;
  });
  const candidatesPromise = new Promise((resolve) => {
    resolveCandidates = resolve;
  });

  const startupPromise = runCompilerStartupSequence({
    message: {
      messageId: "ctx-1",
      payload: {
        createBy: "saved-user"
      }
    },
    requestLogin: async (userName) => {
      callSequence.push(`login:${userName}`);
      const result = await loginPromise;
      return result;
    },
    requestCompilerCandidates: async () => {
      callSequence.push("candidates");
      const result = await candidatesPromise;
      return result;
    },
    applyContextMessage: (message) => {
      callSequence.push(`apply:${message.messageId}`);
    },
    updateCompilerCandidates: (options) => {
      callSequence.push(`options:${options.length}`);
    },
    writeApiLog: (entry) => {
      logEntries.push(entry);
    }
  });

  await Promise.resolve();

  assert.deepEqual(callSequence, ["login:saved-user", "candidates"]);

  resolveCandidates({
    options: candidateOptions,
    status: 200,
    data: {
      data: candidateOptions
    }
  });
  await Promise.resolve();

  assert.deepEqual(callSequence, ["login:saved-user", "candidates"]);

  resolveLogin({
    ok: true,
    token: "token-1",
    status: 200,
    data: {
      data: {
        token: "token-1"
      }
    }
  });

  await startupPromise;

  assert.deepEqual(callSequence, ["login:saved-user", "candidates", "apply:ctx-1", "options:2"]);
  assert.equal(logEntries.length >= 4, true);
});

/**
 * API 日志应包含阶段、接口名称、用户名、URL 与请求响应摘要。
 */
test("formatApiLogBlock 生成详细文本日志", () => {
  const block = formatApiLogBlock({
    phase: "SUCCESS",
    apiName: "loginByFree",
    url: "http://127.0.0.1/loginByFree",
    method: "POST",
    userName: "PopoY",
    durationMs: 128,
    requestBody: {
      username: "PopoY"
    },
    status: 200,
    responseBody: {
      data: {
        token: "token-1"
      }
    }
  });

  assert.match(block, /SUCCESS/);
  assert.match(block, /loginByFree/);
  assert.match(block, /PopoY/);
  assert.match(block, /http:\/\/127\.0\.0\.1\/loginByFree/);
  assert.match(block, /token-1/);
});
