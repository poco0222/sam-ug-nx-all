/**
 * @file process-content-options.js
 * @description 工序下拉选项映射工具，统一处理接口空项与字段别名容错。
 * @author Codex
 * @date 2026-03-03
 */

/**
 * 工序显示文本字段别名（按优先级）。
 */
const PROCESS_LABEL_ALIASES = ["jobContent", "job_content", "processContent", "content", "jobName", "name"];

/**
 * 工序主键字段别名（按优先级）。
 */
const PROCESS_VALUE_ALIASES = ["processId", "process_id", "id", "jobId", "referenceDetailId"];

/**
 * 规范化字段名用于兼容大小写与分隔符差异（如 process_id / PROCESS-ID / processId）。
 * @param {string} key 原始字段名。
 * @returns {string}
 */
function normalizeAliasKey(key) {
  return String(key ?? "")
    .trim()
    .replace(/[_\-\s]/g, "")
    .toLowerCase();
}

/**
 * 从对象中读取首个非空字段值。
 * @param {Record<string, any>} target 待读取对象。
 * @param {string[]} aliases 字段别名列表。
 * @returns {any}
 */
function pickFirstNonEmptyValue(target, aliases) {
  if (!target || typeof target !== "object" || !Array.isArray(aliases)) {
    return undefined;
  }
  // 先走精确键名匹配，命中时直接返回以减少额外扫描成本。
  for (const alias of aliases) {
    const value = target[alias];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }

  // 再走标准化键名匹配，兼容大小写与下划线等命名差异。
  const normalizedAliasSet = new Set(aliases.map((alias) => normalizeAliasKey(alias)));
  for (const [rawKey, value] of Object.entries(target)) {
    if (!normalizedAliasSet.has(normalizeAliasKey(rawKey))) {
      continue;
    }
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }
  return undefined;
}

/**
 * 从对象本身及其一层嵌套对象中提取候选值，兼容返回结构套壳场景。
 * @param {Record<string, any>} target 待读取对象。
 * @param {string[]} aliases 字段别名列表。
 * @returns {any}
 */
function pickValueFromObjectAndNested(target, aliases) {
  const directValue = pickFirstNonEmptyValue(target, aliases);
  if (directValue !== undefined) {
    return directValue;
  }

  for (const nestedValue of Object.values(target ?? {})) {
    if (!nestedValue || typeof nestedValue !== "object" || Array.isArray(nestedValue)) {
      continue;
    }
    const nestedMatchedValue = pickFirstNonEmptyValue(nestedValue, aliases);
    if (nestedMatchedValue !== undefined) {
      return nestedMatchedValue;
    }
  }

  return undefined;
}

/**
 * 将工序原始列表转换为 BaseSelect 所需选项结构。
 * @param {any[]} processContentList 工序原始列表。
 * @returns {{label:string,value:any}[]}
 */
export function mapProcessContentOptions(processContentList) {
  if (!Array.isArray(processContentList)) {
    return [];
  }

  return processContentList
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const processValue = pickValueFromObjectAndNested(item, PROCESS_VALUE_ALIASES);
      const processLabel = pickValueFromObjectAndNested(item, PROCESS_LABEL_ALIASES);
      const normalizedLabel = String(processLabel ?? "").trim();
      return {
        label: normalizedLabel || "-",
        value: processValue
      };
    })
    // 过滤无效主键，避免 BaseSelect 出现重复 undefined key 导致可选项异常。
    .filter((option) => option.value !== undefined && option.value !== null && String(option.value).trim() !== "");
}
