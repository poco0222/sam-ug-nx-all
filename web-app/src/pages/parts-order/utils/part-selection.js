/**
 * @file part-selection.js
 * @description 零件列表同步后的选中项解析工具，支持关闭“自动选中第一条”。
 * @author Codex
 * @date 2026-03-03
 */

/**
 * 解析刷新/重载后的零件选中项。
 * @param {{
 *  partList:any[],
 *  previousSelectedCode:string,
 *  autoSelectFirst?:boolean,
 *  resolvePartCode?:(part:any)=>string
 * }} payload 选中项解析参数。
 * @returns {any|null}
 */
export function resolveSelectedPartAfterSync(payload = {}) {
  const partList = Array.isArray(payload.partList) ? payload.partList : [];
  const previousSelectedCode = String(payload.previousSelectedCode ?? "");
  const autoSelectFirst = payload.autoSelectFirst !== false;
  const resolvePartCode = typeof payload.resolvePartCode === "function" ? payload.resolvePartCode : () => "";

  if (partList.length === 0) {
    return null;
  }

  if (previousSelectedCode) {
    const matched = partList.find((part) => String(resolvePartCode(part) ?? "") === previousSelectedCode);
    if (matched) {
      return matched;
    }
  }

  return autoSelectFirst ? partList[0] : null;
}

