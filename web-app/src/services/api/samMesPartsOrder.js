/**
 * @file samMesPartsOrder.js
 * @description 零件工单相关 API，按原 Vue2 接口路径迁移。
 * @author Codex
 * @date 2026-02-27
 */
import http from "@/services/http";

/**
 * 根据制造令号查询未发布工艺零件。
 * @param {{moldOrderNum:string,pName?:string}} params 查询参数。
 * @returns {Promise<any>}
 */
export function queryPartListByOrderNum(params) {
  return http.get("/SamMesPartsOrderController/partsOrder/queryPartListByOrderNum", { params });
}

/**
 * 获取工艺模板下拉列表。
 * @returns {Promise<any>}
 */
export function getTemplateList() {
  return http.get("/samMoldCraftTemplateNode/node/getTemplateList");
}

/**
 * 根据工艺模板匹配零件工艺。
 * @param {FormData} data 包含 templateId 与 partList。
 * @returns {Promise<any>}
 */
export function savePartsCraft(data) {
  return http.post("/samMoldCraftTemplateNode/node/handelMatchingProcessTemplate", data);
}

/**
 * 根据历史制造令匹配零件工艺。
 * @param {FormData} data 包含 mouldMakeOrder、isReference 与 partList。
 * @returns {Promise<any>}
 */
export function saveHistoryTemCraft(data) {
  return http.post("/samMoldCraftTemplateNode/node/handelMatchingHisProcessTemplate", data);
}

/**
 * 根据模具号查询制造令号集合。
 * @param {string} moldCode 模具号。
 * @returns {Promise<any>}
 */
export function getMouldMakeOrderByMoldCode(moldCode) {
  return http.get(`/samMouldPart/MouldPart/getMouldMakeOrderByMoldCode/${moldCode}`);
}

/**
 * 根据零件 ID 查询工艺列表。
 * @param {object} params 查询参数。
 * @returns {Promise<any>}
 */
export function getOrderByPartId(params) {
  return http.get("/SamMesPartsOrderController/partsOrder/getOrderByPartId", { params });
}

/**
 * 根据零件 ID + 制令号查询工艺列表（与旧版 getOrderByPartId2 对齐）。
 * @param {object} params 查询参数。
 * @returns {Promise<any>}
 */
export function getOrderByPartId2(params) {
  return http.get("/SamMesPartsOrderController/partsOrder/getOrderByPartId2", { params });
}

/**
 * 根据零件 ID 查询参数维护列表。
 * @param {number|string} partId 零件 ID。
 * @returns {Promise<any>}
 */
export function getMaintenanceParams(partId) {
  return http.get(`/moldPartParam/moldPartParamController/getPartAllParams/${partId}`);
}

/**
 * 保存参数修改。
 * @param {FormData} data 参数数据。
 * @returns {Promise<any>}
 */
export function changeParams(data) {
  return http.post("/moldPartParam/moldPartParamController/changeParams", data);
}

/**
 * 更新工艺数据。
 * @param {object} data 工艺对象。
 * @returns {Promise<any>}
 */
export function updateCraft(data) {
  return http.put("/SamMesPartsOrderController/partsOrder", data);
}

/**
 * 新增工艺。
 * @param {object} data 工艺对象。
 * @returns {Promise<any>}
 */
export function addCraft(data) {
  return http.post("/SamMesPartsOrderController/partsOrder", data);
}

/**
 * 查询单条工艺详情。
 * @param {number|string} id 工艺主键。
 * @returns {Promise<any>}
 */
export function getOrderById(id) {
  return http.get(`/SamMesPartsOrderController/partsOrder/${id}`);
}

/**
 * 批量删除工艺（按零件 + 工艺集合）。
 * @param {FormData} data 删除参数。
 * @returns {Promise<any>}
 */
export function deleteBachListByPartIdAndRoutingId(data) {
  return http.delete("/SamMesPartsOrderController/partsOrder/deleteBachListByPartIdAndRoutingId", { data });
}

/**
 * 根据工艺编码查询可选工序内容。
 * @param {string} craftCode 工艺编码。
 * @returns {Promise<any>}
 */
export function selectReferenceDetailListByCraftCode(craftCode) {
  const normalizedCraftCode = encodeURIComponent(String(craftCode ?? "").trim());
  return http.get(`/SamMesPartsOrderController/partsOrder/selectReferenceDetailListByCraftCode/${normalizedCraftCode}`);
}

/**
 * 根据工单 ID 查询工序明细列表。
 * @param {number|string} orderId 工单 ID。
 * @returns {Promise<any>}
 */
export function getReferenceDetailListByOrderId(orderId) {
  return http.get(`/SamMesPartsOrderController/partsOrder/getReferenceDetailListByOrderId/${orderId}`);
}

/**
 * 新增工序。
 * @param {object} params 新增参数。
 * @returns {Promise<any>}
 */
export function addProduction(params) {
  return http.get("/SamMesPartsOrderController/partsOrder/addProduction", { params });
}

/**
 * 删除工序。
 * @param {object} params 删除参数。
 * @returns {Promise<any>}
 */
export function deleteProduction(params) {
  return http.get("/SamMesPartsOrderController/partsOrder/deleteProduction", { params });
}

/**
 * 批量增加工序（按零件集合）。
 * @param {FormData} data 包含 samMesPartsOrder、samMoldJobReferenceDetail 与 partList。
 * @returns {Promise<any>}
 */
export function addProductionList(data) {
  return http.post("/SamMesPartsOrderController/partsOrder/addProductionList", data);
}

/**
 * 批量删除工序（按零件集合）。
 * @param {FormData} data 包含 samMesPartsOrder、samMoldJobReferenceDetail 与 partList。
 * @returns {Promise<any>}
 */
export function deleteProductionList(data) {
  return http.post("/SamMesPartsOrderController/partsOrder/deleteProductionList", data);
}

/**
 * 发布工艺。
 * @param {FormData} data 发布数据。
 * @returns {Promise<any>}
 */
export function releasePartOrder(data) {
  return http.post("/SamMesPartsOrderController/partsOrder/releasePartOrder", data);
}

/**
 * 重新计算。
 * @param {FormData} data 计算参数。
 * @returns {Promise<any>}
 */
export function againCount(data) {
  return http.post("/samMoldCraftTemplateNode/node/againCount", data);
}

/**
 * 上传工程设定图片。
 * @param {FormData} fileData 上传文件数据（包含 files 与最小化 partList）。
 * @returns {Promise<any>}
 */
export function upLoadFileList(fileData) {
  return http.post("/common/uploadFiles", fileData);
}

/**
 * 编辑工艺特殊性要求。
 * @param {{id:number|string,specialRequirement:string}} data 编辑数据。
 * @returns {Promise<any>}
 */
export function editSpecialRequirement(data) {
  return http.post("/SamMesPartsOrderController/partsOrder/editSpecialRequirement", data);
}

/**
 * 导出工艺单。
 * @param {string} mouldMakeOrder 模具工单号。
 * @returns {Promise<any>}
 */
export function exportExcel(mouldMakeOrder) {
  return http.get(`/SamMesPartsOrderController/partsOrder/export/${mouldMakeOrder}`, {
    responseType: "blob"
  });
}
