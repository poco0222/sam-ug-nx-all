/**
 * @file dict-format.js
 * @description 字典响应解析与标签格式化工具，兼容旧版 dictValue/dictLabel 与新版 value/label 结构。
 * @author Codex
 * @date 2026-03-02
 */
import { normalizeListResponse } from "./list-response.js";

/**
 * 归一化字典查找键：
 * 1. 去首尾空白；
 * 2. 对纯数字/小数零结尾（如 01、1.0）统一成标准数字字符串，提升兼容性。
 * @param {string|number} value 原始值。
 * @returns {string}
 */
function normalizeDictLookupKey(value) {
  const text = String(value ?? "").trim();
  if (!text) {
    return "";
  }
  if (/^-?\d+(?:\.0+)?$/.test(text)) {
    return String(Number(text));
  }
  return text;
}

/**
 * 将字典数组转换为 {value:label} 映射。
 * @param {any[]} rows 字典项数组。
 * @param {Record<string,string>} fallbackMap 回退映射。
 * @returns {Record<string,string>}
 */
export function buildDictLabelMapFromRows(rows, fallbackMap = {}) {
  // 先铺设 fallback，再用接口字典覆盖同键；确保“接口缺项”时仍可命中回退值。
  const labelMap = { ...fallbackMap };
  const dictRows = Array.isArray(rows) ? rows : [];

  for (const row of dictRows) {
    const rawValue = row?.dictValue ?? row?.value ?? row?.code ?? row?.id;
    const rawLabel = row?.dictLabel ?? row?.label ?? row?.name ?? rawValue;
    if (rawValue === null || rawValue === undefined || rawValue === "") {
      continue;
    }
    const rawKey = String(rawValue).trim();
    const normalizedKey = normalizeDictLookupKey(rawKey);
    const label = String(rawLabel ?? rawValue);

    labelMap[rawKey] = label;
    // 兼容 01/1、1.0/1 等编码差异，并保持接口字典对 fallback 的覆盖优先级。
    if (normalizedKey) {
      labelMap[normalizedKey] = label;
    }
  }

  return labelMap;
}

/**
 * 从接口响应中提取字典映射。
 * @param {any} response 接口响应对象。
 * @param {Record<string,string>} fallbackMap 回退映射。
 * @returns {Record<string,string>}
 */
export function buildDictLabelMapFromResponse(response, fallbackMap = {}) {
  const rows = normalizeListResponse(response);
  return buildDictLabelMapFromRows(rows, fallbackMap);
}

/**
 * 通用字典值格式化。
 * @param {string|number|null|undefined} value 字典值。
 * @param {Record<string,string>} labelMap 字典映射。
 * @param {Record<string,string>} fallbackMap 回退映射。
 * @param {string} placeholder 空值占位文案。
 * @returns {string}
 */
export function formatDictLabel(value, labelMap = {}, fallbackMap = {}, placeholder = "-") {
  if (value === null || value === undefined || value === "") {
    return placeholder;
  }

  const rawKey = String(value).trim();
  const normalizedKey = normalizeDictLookupKey(rawKey);
  return (
    labelMap[rawKey] ??
    labelMap[normalizedKey] ??
    fallbackMap[rawKey] ??
    fallbackMap[normalizedKey] ??
    rawKey
  );
}

/**
 * 是/否格式化，兼容大小写与数字布尔表达。
 * @param {string|number|boolean|null|undefined} value 字典值。
 * @param {Record<string,string>} labelMap 字典映射。
 * @param {Record<string,string>} fallbackMap 回退映射。
 * @param {string} placeholder 空值占位文案。
 * @returns {string}
 */
export function formatYesNoLabel(value, labelMap = {}, fallbackMap = {}, placeholder = "-") {
  if (value === null || value === undefined || value === "") {
    return placeholder;
  }

  const normalized = String(value);
  const upper = normalized.toUpperCase();
  return labelMap[normalized] ?? labelMap[upper] ?? fallbackMap[normalized] ?? fallbackMap[upper] ?? normalized;
}
