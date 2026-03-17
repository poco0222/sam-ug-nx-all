/**
 * @file init-load-gate.js
 * @description 零件工单初始化加载门控工具，控制宿主模式下的加载时机。
 * @author Codex
 * @date 2026-03-04
 */

/**
 * 判断“上下文变更”是否应触发页面加载。
 * @param {{
 *   contextMessage?: object|null
 *   hasToken?: boolean
 * }} options 判定参数。
 * @returns {boolean}
 */
export function shouldLoadPageDataOnContextChange(options = {}) {
  const { contextMessage = null, hasToken = false } = options;
  // 无上下文时不触发自动加载，手动模式/宿主模式均需避免初始化请求风暴。
  if (!contextMessage) {
    return false;
  }
  // 仅在 token 就绪后才允许触发业务加载，避免访问受保护资源报认证失败。
  if (!hasToken) {
    return false;
  }
  return true;
}

/**
 * 判断 mounted 阶段是否应预加载字典。
 * @param {object} _options 判定参数（预留）。
 * @returns {boolean}
 */
export function shouldPreloadDictsOnMounted(_options = {}) {
  // 统一禁用 mounted 自动字典预加载，改为等待免登录链路完成后在数据加载入口统一处理。
  return false;
}

/**
 * 判断 token 是否有效（仅非空字符串视为有效）。
 * @param {unknown} tokenValue token 原始值。
 * @returns {boolean}
 */
export function hasAuthToken(tokenValue) {
  return typeof tokenValue === "string" && tokenValue.trim().length > 0;
}
