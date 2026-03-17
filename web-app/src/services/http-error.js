/**
 * @file http-error.js
 * @description HTTP 业务码与异常文案解析工具，统一兼容 AjaxResult(code/msg/data) 与传输层错误。
 * @author Codex
 * @date 2026-03-04
 */

/** 服务器常见错误文案字段优先级。 */
const SERVER_MESSAGE_KEYS = Object.freeze([
  "msg",
  "message",
  "errorMsg",
  "errMsg",
  "detail",
  "error"
]);

/**
 * 判断是否为普通对象（排除数组）。
 * @param {any} value 待判断值。
 * @returns {boolean}
 */
function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * 判断业务码是否表示成功。
 * @param {number|string|null|undefined} code 业务码。
 * @returns {boolean}
 */
export function isBusinessSuccessCode(code) {
  return code === 200 || code === "200";
}

/**
 * 从对象中按优先级提取错误文案。
 * @param {Record<string, any>} target 响应对象。
 * @returns {string}
 */
function pickMessageFromObject(target) {
  for (const key of SERVER_MESSAGE_KEYS) {
    const rawValue = target?.[key];
    if (typeof rawValue === "string" && rawValue.trim()) {
      return rawValue.trim();
    }
  }
  return "";
}

/**
 * 从任意后端返回体中提取可展示的错误文案。
 * @param {any} payload 返回体（可能是对象、字符串、JSON 文本）。
 * @returns {string}
 */
export function extractServerMessage(payload) {
  if (typeof payload === "string") {
    const normalizedText = payload.trim();
    if (!normalizedText) {
      return "";
    }

    // 文本可能是后端返回的 JSON 字符串，先尝试解析再递归提取。
    try {
      const parsedPayload = JSON.parse(normalizedText);
      const parsedMessage = extractServerMessage(parsedPayload);
      return parsedMessage || normalizedText;
    } catch (_) {
      return normalizedText;
    }
  }

  if (!payload) {
    return "";
  }

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const nestedMessage = extractServerMessage(item);
      if (nestedMessage) {
        return nestedMessage;
      }
    }
    return "";
  }

  if (!isPlainObject(payload)) {
    return "";
  }

  const directMessage = pickMessageFromObject(payload);
  if (directMessage) {
    return directMessage;
  }

  // 常见嵌套容器：AjaxResult.data / 网关 result / 自定义 error 结构。
  const nestedCandidates = [payload.data, payload.result, payload.obj, payload.error, payload.errors];
  for (const candidate of nestedCandidates) {
    const nestedMessage = extractServerMessage(candidate);
    if (nestedMessage) {
      return nestedMessage;
    }
  }

  return "";
}

/**
 * 归一化传输层异常文案，保持与原项目体验一致。
 * @param {string} rawMessage 原始错误消息。
 * @param {number|null} statusCode HTTP 状态码。
 * @returns {string}
 */
export function normalizeTransportErrorMessage(rawMessage = "", statusCode = null) {
  const normalizedMessage = String(rawMessage ?? "").trim();

  if (normalizedMessage === "Network Error") {
    return "后端接口连接异常";
  }
  if (normalizedMessage.toLowerCase().includes("timeout")) {
    return "系统接口请求超时";
  }

  const statusMatch = normalizedMessage.match(/status code\s*(\d{3})/i);
  if (statusMatch?.[1]) {
    return `系统接口${statusMatch[1]}异常`;
  }

  if (Number.isInteger(statusCode)) {
    return `系统接口${statusCode}异常`;
  }

  return normalizedMessage || "系统接口异常";
}

/**
 * 统一解析 AxiosError 文案：优先后端 msg，再回退传输层文案。
 * @param {{message?:string,response?:{status?:number,data?:any}}} error Axios 错误对象。
 * @returns {string}
 */
export function resolveHttpErrorMessage(error) {
  const backendMessage = extractServerMessage(error?.response?.data);
  if (backendMessage) {
    return backendMessage;
  }

  const statusCode = Number.isInteger(error?.response?.status) ? error.response.status : null;
  return normalizeTransportErrorMessage(error?.message ?? "", statusCode);
}
