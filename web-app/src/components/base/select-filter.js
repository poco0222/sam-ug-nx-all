/**
 * @file select-filter.js
 * @description BaseSelect 选项筛选工具，统一关键词匹配与异常输入回退逻辑。
 * @author Codex
 * @date 2026-03-03
 */

/**
 * 将任意值标准化为可比较字符串。
 * @param {unknown} value 原始值。
 * @returns {string}
 */
function normalizeSearchText(value) {
  return String(value ?? "").trim().toLowerCase();
}

/**
 * 按关键词筛选下拉选项；空关键词时返回原列表。
 * @param {{label:string, value:any, disabled:boolean}[]|unknown} options 下拉选项列表。
 * @param {string|number|null|undefined} keyword 用户输入关键词。
 * @returns {{label:string, value:any, disabled:boolean}[]}
 */
export function filterSelectOptions(options, keyword) {
  if (!Array.isArray(options)) {
    return [];
  }
  const normalizedKeyword = normalizeSearchText(keyword);
  if (!normalizedKeyword) {
    return options;
  }
  return options.filter((item) => {
    const labelText = normalizeSearchText(item?.label);
    const valueText = normalizeSearchText(item?.value);
    return labelText.includes(normalizedKeyword) || valueText.includes(normalizedKeyword);
  });
}
