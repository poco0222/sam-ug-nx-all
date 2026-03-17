/**
 * @file detail-response.js
 * @description 统一解析后端详情响应，兼容 AjaxResult 与常见网关二次封装结构。
 * @author Codex
 * @date 2026-03-03
 */

/**
 * 常见详情对象字段名候选，按优先级依次匹配。
 */
const DETAIL_KEYS = ["data", "result", "obj"];

/**
 * 仅用于协议元信息判定的字段集合。
 * 纯元信息对象不应被当成业务详情。
 */
const META_KEYS = new Set(["code", "msg", "message", "success", "status", "timestamp", "total"]);

/**
 * 判断目标是否为普通对象（非数组）。
 * @param {any} target 待判断对象。
 * @returns {boolean}
 */
function isPlainObject(target) {
  return Boolean(target) && typeof target === "object" && !Array.isArray(target);
}

/**
 * 判断对象是否只包含协议元信息字段。
 * @param {Record<string, any>} target 待判断对象。
 * @returns {boolean}
 */
function isMetaOnlyObject(target) {
  const keys = Object.keys(target);
  if (keys.length === 0) {
    return false;
  }
  return keys.every((key) => META_KEYS.has(key));
}

/**
 * 从候选对象中提取首个详情对象字段。
 * @param {any} target 候选对象。
 * @returns {Record<string, any>|null}
 */
function pickObjectFromCandidate(target) {
  if (!isPlainObject(target)) {
    return null;
  }
  for (const key of DETAIL_KEYS) {
    if (isPlainObject(target[key])) {
      return target[key];
    }
  }
  return null;
}

/**
 * 统一解析详情响应：
 * 1. AjaxResult.success(object): response.data.data；
 * 2. 直接详情对象：response.data；
 * 3. 网关二次封装：response.data.result / response.data.obj；
 * 4. 兜底返回空对象，避免业务层访问 undefined。
 * @param {any} response 请求响应对象。
 * @returns {Record<string, any>}
 */
export function normalizeDetailResponse(response) {
  const data = response?.data;
  if (isPlainObject(data)) {
    const nestedDetail = pickObjectFromCandidate(data);
    if (nestedDetail) {
      return nestedDetail;
    }
    if (!isMetaOnlyObject(data)) {
      return data;
    }
  }

  if (isPlainObject(response)) {
    const nestedDetail = pickObjectFromCandidate(response);
    if (nestedDetail) {
      return nestedDetail;
    }
    // axios 响应对象若携带 data 且 data 不是对象，通常不是可用详情结构。
    if (Object.prototype.hasOwnProperty.call(response, "data") && !isPlainObject(response.data)) {
      return {};
    }
    if (!isMetaOnlyObject(response)) {
      return response;
    }
  }

  return {};
}
