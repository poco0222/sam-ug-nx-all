/**
 * @file craft-param-disable.js
 * @description 工艺参数区禁用策略解析，统一复刻原 Vue2 的字段门控语义。
 * @author Codex
 * @date 2026-03-03
 */

/**
 * 解析工艺参数区禁用状态。
 * @param {{hasCraftContext:boolean,isAutoValue:string|null|undefined}} payload 禁用策略输入。
 * @returns {{
 *   saveCraftParams:boolean,
 *   isAutoField:boolean,
 *   isNeedField:boolean,
 *   commonFormFields:boolean,
 *   addProduction:boolean,
 *   deleteProduction:boolean
 * }}
 */
export function resolveCraftParamDisabledState(payload = {}) {
  const hasCraftContext = Boolean(payload.hasCraftContext);
  const normalizedAutoValue = String(payload.isAutoValue ?? "");

  return {
    // 与 Vue2 一致：未选中可编辑工艺时禁用“保存参数”。
    saveCraftParams: !hasCraftContext,
    // 与 Vue2 一致：isAuto 仅在可编辑上下文且当前值为 Y 时可改。
    isAutoField: !hasCraftContext || normalizedAutoValue !== "Y",
    // 与 Vue2 一致：工艺参数区内 isNeed 不开放编辑。
    isNeedField: true,
    // 与 Vue2 一致：常规表单项随工艺可编辑上下文统一门控。
    commonFormFields: !hasCraftContext,
    // 与 Vue2 一致：添加/删除工序按钮仅由工艺编辑上下文门控。
    addProduction: !hasCraftContext,
    deleteProduction: !hasCraftContext
  };
}
