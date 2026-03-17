/**
 * @file parts-order-runtime.js
 * @description 零件工单运行时策略解析，统一处理开发手输模式与打包宿主模式。
 * @author Codex
 * @date 2026-03-02
 */

/**
 * 解析布尔环境变量（仅识别 true/false，大小写不敏感）。
 * @param {unknown} rawValue 原始环境变量值。
 * @param {boolean} fallback 解析失败时回退值。
 * @returns {boolean}
 */
function parseBooleanEnv(rawValue, fallback) {
  if (typeof rawValue === "boolean") {
    return rawValue;
  }
  if (typeof rawValue !== "string") {
    return fallback;
  }

  const normalized = rawValue.trim().toLowerCase();
  if (normalized === "true") {
    return true;
  }
  if (normalized === "false") {
    return false;
  }
  return fallback;
}

/**
 * 从 URL 查询串读取运行时手输模式覆盖配置。
 * @param {string} search URL 查询串（如 ?webManualMode=true）。
 * @returns {{devManualMode?:boolean}}
 */
export function resolveRuntimeManualModeOverrideFromSearch(search) {
  if (!search || typeof search !== "string") {
    return {};
  }

  const query = new URLSearchParams(search);
  const rawValue = query.get("webManualMode") ?? query.get("web_manual_mode");
  if (rawValue === null) {
    return {};
  }

  const normalized = rawValue.trim().toLowerCase();
  if (normalized === "true") {
    return { devManualMode: true };
  }
  if (normalized === "false") {
    return { devManualMode: false };
  }
  return {};
}

/**
 * 解析零件工单运行策略。
 * @param {{
 *   DEV?: boolean|string,
 *   PROD?: boolean|string,
 *   VITE_PARTS_ORDER_DEV_MANUAL_MODE?: string|boolean
 * }} env 运行时环境变量对象。
 * @param {{devManualMode?: boolean|string}} runtimeOverrides 运行时覆盖参数（优先级高于构建环境）。
 * @returns {{
 *   isDevManualMode: boolean,
 *   isPackagedHostMode: boolean,
 *   allowManualCommandInputs: boolean,
 *   forceContextOverwriteInputs: boolean,
 *   enableIpcPartMatching: boolean
 * }}
 */
export function resolvePartsOrderRuntimePolicy(env = {}, runtimeOverrides = {}) {
  const isProdRuntime = parseBooleanEnv(env.PROD, false);
  const isDevRuntime = parseBooleanEnv(env.DEV, false);

  // 开发态默认允许手输，可通过 VITE_PARTS_ORDER_DEV_MANUAL_MODE 显式关闭。
  const devManualEnabled = parseBooleanEnv(env.VITE_PARTS_ORDER_DEV_MANUAL_MODE, true);
  const defaultDevManualMode = !isProdRuntime && isDevRuntime && devManualEnabled;
  const hasRuntimeOverride =
    Object.prototype.hasOwnProperty.call(runtimeOverrides, "devManualMode") &&
    typeof runtimeOverrides.devManualMode !== "undefined";
  const runtimeManualMode = parseBooleanEnv(runtimeOverrides.devManualMode, defaultDevManualMode);
  const isDevManualMode = hasRuntimeOverride ? runtimeManualMode : defaultDevManualMode;
  const isPackagedHostMode = isProdRuntime;

  return {
    isDevManualMode,
    isPackagedHostMode,
    allowManualCommandInputs: isDevManualMode,
    // 非手输模式下由上下文主导输入值，避免误改请求参数。
    forceContextOverwriteInputs: !isDevManualMode,
    // 仅开发手输模式关闭 IPC 匹配，其余模式维持现有匹配逻辑。
    enableIpcPartMatching: !isDevManualMode
  };
}

/**
 * 基于 Vite 环境变量生成的默认运行策略。
 */
const runtimeOverrideFromUrl =
  typeof window !== "undefined" && window.location
    ? resolveRuntimeManualModeOverrideFromSearch(window.location.search)
    : {};

export const partsOrderRuntimePolicy = resolvePartsOrderRuntimePolicy(import.meta.env, runtimeOverrideFromUrl);
