/**
 * @file compiler-options.js
 * @description 编制人候选项构建工具。
 * @author Codex
 * @date 2026-03-17
 */

/**
 * 从 payload 中提取当前编制人用户名。
 * @param {Record<string, any>} payload 上下文载荷。
 * @returns {string} 当前编制人用户名。
 */
function resolveCurrentCompilerUserName(payload = {}) {
  const currentUser = payload.currentUser ?? payload.userInfo ?? null;
  if (currentUser && typeof currentUser === "object") {
    const nestedUserName = String(
      currentUser.userName ?? currentUser.username ?? currentUser.userCode ?? currentUser.account ?? ""
    ).trim();
    if (nestedUserName) {
      return nestedUserName;
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

  return typeof payload.operator === "string" ? payload.operator.trim() : "";
}

/**
 * 将候选用户数组标准化为 `{ label, value }`。
 * @param {unknown[]} source 原始数组。
 * @returns {{label:string,value:string}[]} 规范化结果。
 */
function normalizeCompilerOptions(source = []) {
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

  return normalizedOptions;
}

/**
 * 优先使用前端候选用户接口结果，并保证当前编制人在候选项中存在。
 * @param {object} options 构建参数。
 * @returns {{label:string,value:string}[]} 编制人候选项列表。
 */
export function buildCompilerOptions(options = {}) {
  const compilerCandidates = Array.isArray(options?.compilerCandidates) ? options.compilerCandidates : [];
  const payload = options?.payload ?? {};
  const currentUserName = resolveCurrentCompilerUserName(payload);

  const normalizedCandidates = normalizeCompilerOptions(compilerCandidates);
  if (normalizedCandidates.length > 0) {
    if (currentUserName && !normalizedCandidates.some((item) => item.value === currentUserName)) {
      normalizedCandidates.push({ label: currentUserName, value: currentUserName });
    }
    return normalizedCandidates;
  }

  if (currentUserName) {
    return [{ label: currentUserName, value: currentUserName }];
  }

  return [];
}
