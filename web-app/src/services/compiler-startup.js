/**
 * @file compiler-startup.js
 * @description 编制人启动链路工具，负责用户名解析、启动并行请求与接口日志格式化。
 * @author Codex
 * @date 2026-03-17
 */

/**
 * 从上下文中提取当前编制人用户名，优先使用已有值，缺失时回退到固定默认值。
 * @param {{
 *   payload?: Record<string, any>
 *   fallbackUserName?: string
 * }} options 启动参数。
 * @returns {string} 当前编制人用户名。
 */
function pickCompilerUserNameFromPayload(options = {}) {
  const payload = options?.payload ?? {};
  const fallbackUserName = typeof options?.fallbackUserName === "string" && options.fallbackUserName.trim()
    ? options.fallbackUserName.trim()
    : "PopoY";

  const userObject = payload.currentUser ?? payload.userInfo ?? null;
  if (userObject && typeof userObject === "object") {
    const objectUserName = String(
      userObject.userName ?? userObject.username ?? userObject.userCode ?? userObject.account ?? ""
    ).trim();
    if (objectUserName) {
      return objectUserName;
    }
  }

  const payloadUserName = String(
    payload.createBy ??
      payload.userName ??
      payload.username ??
      payload.userCode ??
      payload.operatorUserName ??
      payload.account ??
      ""
  ).trim();
  if (payloadUserName) {
    return payloadUserName;
  }

  const operatorUserName = typeof payload.operator === "string" ? payload.operator.trim() : "";
  if (operatorUserName) {
    return operatorUserName;
  }

  return fallbackUserName;
}

/**
 * 解析启动阶段应使用的当前编制人用户名。
 * @param {object} options 启动参数。
 * @returns {string} 当前编制人用户名。
 */
export function resolveStartupCompilerUserName(options = {}) {
  return pickCompilerUserNameFromPayload(options);
}

/**
 * 将对象安全格式化为日志文本，避免循环引用导致写日志失败。
 * @param {unknown} value 任意值。
 * @returns {string} 日志字符串。
 */
function stringifyForLog(value) {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch (_) {
    return String(value);
  }
}

/**
 * 格式化单条 API 日志块。
 * @param {object} options 日志参数。
 * @returns {string} 格式化后的日志文本。
 */
export function formatApiLogBlock(options = {}) {
  const timestamp = typeof options.timestamp === "string" && options.timestamp
    ? options.timestamp
    : new Date().toISOString();
  const phase = options.phase ?? "UNKNOWN";
  const apiName = options.apiName ?? "unknown-api";
  const method = options.method ?? "GET";
  const url = options.url ?? "";
  const userName = options.userName ?? "";
  const durationMs = options.durationMs ?? "";
  const status = options.status ?? "";

  return [
    `[${timestamp}] ${phase} ${apiName}`,
    `method=${method}`,
    `url=${url}`,
    `userName=${userName}`,
    `durationMs=${durationMs}`,
    `status=${status}`,
    `request=${stringifyForLog(options.requestBody)}`,
    `response=${stringifyForLog(options.responseBody)}`,
    `error=${stringifyForLog(options.errorMessage)}`,
    ""
  ].join("\n");
}

/**
 * 统一写入日志；写日志失败时只吞掉异常，避免影响主流程。
 * @param {(entry:string)=>unknown|Promise<unknown>} writeApiLog 日志写入函数。
 * @param {object} options 日志参数。
 * @returns {Promise<void>}
 */
async function safeWriteApiLog(writeApiLog, options) {
  if (typeof writeApiLog !== "function") {
    return;
  }
  try {
    await writeApiLog(formatApiLogBlock(options));
  } catch (_) {
    // 日志落盘失败不应中断启动链路。
  }
}

/**
 * 将候选用户统一规范化为页面下拉需要的 `{ label, value }` 结构。
 * @param {unknown[]} source 原始候选用户数组。
 * @param {string} currentUserName 当前编制人用户名。
 * @returns {{label:string,value:string}[]} 规范化后的候选项。
 */
function normalizeCompilerCandidates(source = [], currentUserName = "") {
  const normalizedOptions = [];
  const seenValues = new Set();

  source.forEach((item) => {
    if (item === null || item === undefined) {
      return;
    }

    let value = "";
    let label = "";
    if (typeof item === "string" || typeof item === "number") {
      value = String(item).trim();
      label = value;
    } else if (typeof item === "object") {
      value = String(
        item.value ??
          item.id ??
          item.userId ??
          item.userCode ??
          item.username ??
          item.userName ??
          item.account ??
          item.createBy ??
          item.name ??
          item.operator ??
          ""
      ).trim();
      label = String(
        item.label ??
          item.nickName ??
          item.displayName ??
          item.name ??
          item.userName ??
          item.username ??
          item.operator ??
          item.userCode ??
          value
      ).trim();
    }

    if (!value || seenValues.has(value)) {
      return;
    }

    seenValues.add(value);
    normalizedOptions.push({ label: label || value, value });
  });

  if (currentUserName && !seenValues.has(currentUserName)) {
    normalizedOptions.push({ label: currentUserName, value: currentUserName });
  }

  return normalizedOptions;
}

/**
 * 协调启动阶段的免登录与候选用户接口，并在免登录完成后应用 context。
 * @param {object} options 启动参数。
 * @returns {Promise<void>}
 */
export async function runCompilerStartupSequence(options = {}) {
  const message = options?.message ?? {};
  const payload = message?.payload ?? {};
  const requestLogin = options?.requestLogin;
  const requestCompilerCandidates = options?.requestCompilerCandidates;
  const applyContextMessage = options?.applyContextMessage;
  const updateCompilerCandidates = options?.updateCompilerCandidates;
  const writeApiLog = options?.writeApiLog;
  const fallbackUserName = options?.fallbackUserName ?? "PopoY";
  const loginApiUrl = options?.loginApiUrl ?? "/loginByFree";
  const candidateApiUrl = options?.candidateApiUrl ?? "/UGApi/UGApiController/getBianChengUserInfo";
  const userName = pickCompilerUserNameFromPayload({ payload, fallbackUserName });

  const loginStartAt = Date.now();
  void safeWriteApiLog(writeApiLog, {
    phase: "START",
    apiName: "loginByFree",
    method: "POST",
    url: loginApiUrl,
    userName,
    requestBody: {
      username: userName,
      userName
    }
  });

  const candidatesStartAt = Date.now();
  void safeWriteApiLog(writeApiLog, {
    phase: "START",
    apiName: "getBianChengUserInfo",
    method: "POST",
    url: candidateApiUrl,
    userName,
    requestBody: {}
  });

  const loginPromise =
    typeof requestLogin === "function" ? requestLogin(userName) : Promise.resolve({ ok: false, token: "" });
  const candidatesPromise =
    typeof requestCompilerCandidates === "function"
      ? requestCompilerCandidates(userName)
      : Promise.resolve({ options: [{ label: userName, value: userName }] });

  let loginResult = { ok: false, token: "" };
  try {
    loginResult = await loginPromise;
    if (loginResult?.ok === false) {
      await safeWriteApiLog(writeApiLog, {
        phase: "FAIL",
        apiName: "loginByFree",
        method: "POST",
        url: loginApiUrl,
        userName,
        durationMs: Date.now() - loginStartAt,
        status: loginResult?.status ?? "",
        requestBody: {
          username: userName,
          userName
        },
        responseBody: loginResult?.data ?? loginResult,
        errorMessage: loginResult?.errorMessage ?? "免登录失败"
      });
    } else {
      await safeWriteApiLog(writeApiLog, {
        phase: "SUCCESS",
        apiName: "loginByFree",
        method: "POST",
        url: loginApiUrl,
        userName,
        durationMs: Date.now() - loginStartAt,
        status: loginResult?.status ?? "",
        requestBody: {
          username: userName,
          userName
        },
        responseBody: loginResult?.data ?? loginResult
      });
    }
  } catch (error) {
    await safeWriteApiLog(writeApiLog, {
      phase: "FAIL",
      apiName: "loginByFree",
      method: "POST",
      url: loginApiUrl,
      userName,
      durationMs: Date.now() - loginStartAt,
      errorMessage: error
    });
  }

  if (typeof applyContextMessage === "function") {
    applyContextMessage(message);
  }

  try {
    const candidatesResult = await candidatesPromise;
    const normalizedOptions = normalizeCompilerCandidates(candidatesResult?.options ?? [], userName);
    if (candidatesResult?.ok === false) {
      await safeWriteApiLog(writeApiLog, {
        phase: "FAIL",
        apiName: "getBianChengUserInfo",
        method: "POST",
        url: candidateApiUrl,
        userName,
        durationMs: Date.now() - candidatesStartAt,
        status: candidatesResult?.status ?? "",
        requestBody: {},
        responseBody: candidatesResult?.data ?? candidatesResult,
        errorMessage: candidatesResult?.errorMessage ?? "获取候选用户失败"
      });
    } else {
      await safeWriteApiLog(writeApiLog, {
        phase: "SUCCESS",
        apiName: "getBianChengUserInfo",
        method: "POST",
        url: candidateApiUrl,
        userName,
        durationMs: Date.now() - candidatesStartAt,
        status: candidatesResult?.status ?? "",
        requestBody: {},
        responseBody: candidatesResult?.data ?? candidatesResult
      });
    }
    if (typeof updateCompilerCandidates === "function") {
      updateCompilerCandidates(normalizedOptions);
    }
  } catch (error) {
    await safeWriteApiLog(writeApiLog, {
      phase: "FAIL",
      apiName: "getBianChengUserInfo",
      method: "POST",
      url: candidateApiUrl,
      userName,
      durationMs: Date.now() - candidatesStartAt,
      errorMessage: error
    });
    if (typeof updateCompilerCandidates === "function") {
      updateCompilerCandidates(normalizeCompilerCandidates([], userName));
    }
  }

  return loginResult;
}
