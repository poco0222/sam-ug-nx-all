/**
 * @file dict.js
 * @description 字典查询 API，兼容原 Vue2 的 getDicts(dictType) 调用方式。
 * @author Codex
 * @date 2026-03-02
 */
import http from "@/services/http";

/**
 * 根据字典类型查询字典项列表。
 * @param {string} dictType 字典类型编码。
 * @returns {Promise<any>}
 */
export function getDictByType(dictType) {
  const safeType = encodeURIComponent(String(dictType ?? ""));
  return http.get(`/system/dict/data/type/${safeType}`);
}
