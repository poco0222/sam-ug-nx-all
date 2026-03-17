/**
 * @file list-response.js
 * @description 统一解析后端列表响应，兼容 AjaxResult、TableDataInfo 及常见网关二次封装结构。
 * @author Codex
 * @date 2026-03-02
 */

/**
 * 常见列表字段名候选，按优先级依次匹配。
 */
const LIST_KEYS = ["rows", "data", "list", "records", "items", "result", "obj"];

/**
 * 从候选对象中提取首个数组字段。
 * @param {any} target 候选对象。
 * @returns {any[]|null}
 */
function pickArrayFromObject(target) {
  if (!target || typeof target !== "object" || Array.isArray(target)) {
    return null;
  }
  for (const key of LIST_KEYS) {
    if (Array.isArray(target[key])) {
      return target[key];
    }
  }
  return null;
}

/**
 * 统一解析列表响应：
 * 1. 直接数组；
 * 2. axios response.data 为数组；
 * 3. TableDataInfo: response.data.rows；
 * 4. AjaxResult.success(list): response.data.data；
 * 5. 其它常见嵌套结构（data.rows / data.list 等）。
 * @param {any} response 请求响应对象。
 * @returns {any[]}
 */
export function normalizeListResponse(response) {
  if (Array.isArray(response)) {
    return response;
  }

  const data = response?.data;
  if (Array.isArray(data)) {
    return data;
  }

  const directRows = pickArrayFromObject(data);
  if (directRows) {
    return directRows;
  }

  const nestedData = data?.data;
  if (Array.isArray(nestedData)) {
    return nestedData;
  }

  const nestedRows = pickArrayFromObject(nestedData);
  if (nestedRows) {
    return nestedRows;
  }

  const directResponseRows = pickArrayFromObject(response);
  if (directResponseRows) {
    return directResponseRows;
  }

  return [];
}
