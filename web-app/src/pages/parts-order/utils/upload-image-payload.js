/**
 * @file upload-image-payload.js
 * @description 上传图片参数构建工具，按后端契约仅提交 files + 最小化 partList。
 * @author Codex
 * @date 2026-03-04
 */

/**
 * 解析后端 `SamMouldPart.id`，兼容前端多种主键命名。
 * @param {object|null|undefined} part 零件对象。
 * @returns {string}
 */
function resolveBackendPartId(part) {
  const rawId = part?.id ?? part?.partId ?? part?.partID ?? null;
  return rawId === null || rawId === undefined || rawId === "" ? "" : String(rawId);
}

/**
 * 解析后端图片匹配使用的 importPartCode。
 * 后端 `/common/uploadFiles` 会用该字段与“文件名（去后缀）”进行匹配。
 * @param {object|null|undefined} part 零件对象。
 * @returns {string}
 */
function resolveImportPartCode(part) {
  const rawCode =
    part?.importPartCode ??
    part?.import_part_code ??
    part?.importCode ??
    part?.pCode ??
    part?.pcode ??
    part?.partCode ??
    part?.p_code ??
    "";
  return String(rawCode ?? "").trim();
}

/**
 * 构建上传时传给后端的最小化 partList 项，仅保留必要字段。
 * @param {object|null|undefined} part 零件对象。
 * @returns {{id:string,importPartCode:string}}
 */
function buildUploadPartItem(part) {
  return {
    id: resolveBackendPartId(part),
    importPartCode: resolveImportPartCode(part)
  };
}

/**
 * 构建上传图片请求参数，仅保留 files 与最小化 partList。
 * @param {{
 *  part:object|null|undefined,
 *  files:File[]
 * }} payload 上传参数。
 * @returns {FormData}
 */
export function buildUploadImageFormData(payload = {}) {
  const formData = new FormData();
  const part = payload.part ?? null;
  const files = Array.isArray(payload.files) ? payload.files.filter((file) => file instanceof File) : [];
  const partList = [buildUploadPartItem(part)];

  // 仅透传后端必要字段，避免把整行零件对象等冗余数据提交到上传接口。
  files.forEach((file) => {
    formData.append("files", file);
  });
  formData.append("partList", JSON.stringify(partList));

  return formData;
}
