/**
 * @file samMoldCraftTemplate.js
 * @description 模板匹配相关 API（从 Vue2 模块迁移的首批方法）。
 * @author Codex
 * @date 2026-02-27
 */
import http from "@/services/http";

/**
 * @param {number|string} moldTypeTemplateDetailId 模板明细 ID。
 * @returns {Promise<any>}
 */
export function selectCraftPTList(moldTypeTemplateDetailId) {
  // 与后端 SamMoldCraftTemplateDetailController 路由保持一致，避免“添加工艺”弹窗 404。
  return http.get(`/SamMoldCraftTemplateDetailController/detail/selectCraftPTList/${moldTypeTemplateDetailId}`);
}

/**
 * 根据模板主键查询模板中的零件类型列表。
 * @param {number|string} id 模板主键。
 * @returns {Promise<any>}
 */
export function getListByNodeId(id) {
  return http.get(`/SamMoldTypeTemplateDetail/detail/getListByNodeId/${id}`);
}

/**
 * 根据模板零件类型主键查询工艺列表。
 * @param {number|string} moldTypeTemplateDetailId 模板零件类型主键。
 * @returns {Promise<any>}
 */
export function getCraftListByPartId(moldTypeTemplateDetailId) {
  return http.get(`/SamMoldCraftTemplateDetailController/detail/selectCraftList/${moldTypeTemplateDetailId}`);
}

/**
 * @param {string} mouldMakeOrder 模具工单号。
 * @returns {Promise<any>}
 */
export function getHistoryTem(mouldMakeOrder) {
  return http.get(`/samMoldCraftTemplateNode/node/getHistoryTem/${mouldMakeOrder}`);
}
