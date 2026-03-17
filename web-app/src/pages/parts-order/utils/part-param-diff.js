/**
 * @file part-param-diff.js
 * @description 零件参数“服务器 vs IPC paramList”差异计算与 UG 覆盖工具。
 * @author Codex
 * @date 2026-03-04
 */

/** 参数编号字段别名（用于匹配）。 */
const PARAM_CODE_ALIASES = ["paramCode", "code"];
/** 参数名称字段别名（用于差异对比与覆盖）。 */
const PARAM_NAME_ALIASES = ["paramName", "name"];
/** 参数计算值字段别名（用于差异对比与覆盖）。 */
const PARAM_COUNT_VALUE_ALIASES = ["paramCountValue", "countValue"];
/** 参数交付值字段别名（用于差异对比与覆盖）。 */
const PARAM_DELIVER_VALUE_ALIASES = ["paramDeliverValue", "deliverValue"];

/**
 * 从候选字段中读取首个可用值。
 * @param {object} row 行对象。
 * @param {string[]} keys 候选字段名列表。
 * @param {any} fallback 默认值。
 * @param {{allowEmptyString?: boolean}} options 读取选项。
 * @returns {any}
 */
function valueFromAliases(row, keys, fallback = null, options = {}) {
  const { allowEmptyString = false } = options;
  if (!row || !Array.isArray(keys)) {
    return fallback;
  }
  for (const key of keys) {
    const value = row[key];
    if (value === undefined || value === null) {
      continue;
    }
    if (!allowEmptyString && value === "") {
      continue;
    }
    return value;
  }
  return fallback;
}

/**
 * 归一化参数编号：去首尾空白并转大写。
 * @param {string|number|null|undefined} code 参数编号。
 * @returns {string}
 */
export function normalizeParamCode(code) {
  if (code === null || code === undefined) {
    return "";
  }
  return String(code).trim().toUpperCase();
}

/**
 * 归一化通用比较值：统一为去首尾空白后的字符串。
 * @param {unknown} value 待比较值。
 * @returns {string}
 */
function normalizeComparableValue(value) {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).trim();
}

/**
 * 尝试把输入解析为有限数值。
 * 仅接受“纯数字表达式”，避免 `12abc` 这类脏值被误解析。
 * @param {unknown} value 待解析值。
 * @returns {{isNumeric:boolean, numericValue:number, textValue:string}}
 */
function parseComparableNumber(value) {
  const textValue = normalizeComparableValue(value);
  if (!textValue) {
    return { isNumeric: false, numericValue: Number.NaN, textValue };
  }
  const numericPattern = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;
  if (!numericPattern.test(textValue)) {
    return { isNumeric: false, numericValue: Number.NaN, textValue };
  }
  const numericValue = Number(textValue);
  if (!Number.isFinite(numericValue)) {
    return { isNumeric: false, numericValue: Number.NaN, textValue };
  }
  return { isNumeric: true, numericValue, textValue };
}

/**
 * 数值字段比较：若双方都可解析为数值则按数值比较，否则回退字符串比较。
 * @param {unknown} left 左值。
 * @param {unknown} right 右值。
 * @returns {boolean}
 */
function isEquivalentNumericFirst(left, right) {
  const leftParsed = parseComparableNumber(left);
  const rightParsed = parseComparableNumber(right);
  if (leftParsed.isNumeric && rightParsed.isNumeric) {
    return leftParsed.numericValue === rightParsed.numericValue;
  }
  return leftParsed.textValue === rightParsed.textValue;
}

/**
 * 读取参数编号（匹配键）。
 * @param {object} row 参数行。
 * @returns {string|number|null}
 */
function getParamCode(row) {
  return valueFromAliases(row, PARAM_CODE_ALIASES, null);
}

/**
 * 读取参数名称。
 * @param {object} row 参数行。
 * @returns {string|number|null}
 */
function getParamName(row) {
  return valueFromAliases(row, PARAM_NAME_ALIASES, null, { allowEmptyString: true });
}

/**
 * 读取参数计算值。
 * @param {object} row 参数行。
 * @returns {string|number|null}
 */
function getParamCountValue(row) {
  return valueFromAliases(row, PARAM_COUNT_VALUE_ALIASES, null, { allowEmptyString: true });
}

/**
 * 读取参数交付值。
 * @param {object} row 参数行。
 * @returns {string|number|null}
 */
function getParamDeliverValue(row) {
  return valueFromAliases(row, PARAM_DELIVER_VALUE_ALIASES, null, { allowEmptyString: true });
}

/**
 * 构建 IPC 参数索引（重复编号只保留首条，保持与既有匹配策略一致）。
 * @param {object[]} ipcParams IPC 参数数组。
 * @returns {{entries:Array, indexMap:Map<string, any>}}
 */
function buildIpcParamIndex(ipcParams) {
  const normalizedIpcParams = Array.isArray(ipcParams) ? ipcParams : [];
  const entries = normalizedIpcParams.map((param, index) => {
    const rawCode = getParamCode(param);
    const normalizedCode = normalizeParamCode(rawCode);
    return {
      index,
      param,
      rawCode,
      normalizedCode
    };
  });
  const indexMap = new Map();
  entries.forEach((entry) => {
    if (!entry.normalizedCode || indexMap.has(entry.normalizedCode)) {
      return;
    }
    indexMap.set(entry.normalizedCode, entry);
  });
  return { entries, indexMap };
}

/**
 * 对比单条服务器参数与 IPC 参数，返回差异字段及值对照。
 * @param {object} serverParam 服务器参数行。
 * @param {object} ipcParam IPC 参数行。
 * @returns {{
 *   diffFields:string[],
 *   fieldValueDiffs:Record<string, {currentValue:unknown, ugValue:unknown}>
 * }}
 */
function resolveFieldDiffResult(serverParam, ipcParam) {
  const diffFields = [];
  const fieldValueDiffs = {};

  const serverCountValue = getParamCountValue(serverParam);
  const ipcCountValue = getParamCountValue(ipcParam);
  // 业务规则：参数名称仅用于展示与覆盖，不参与差异判定，避免 IPC 缺失名称导致误报。
  if (!isEquivalentNumericFirst(serverCountValue, ipcCountValue)) {
    diffFields.push("paramCountValue");
    fieldValueDiffs.paramCountValue = {
      currentValue: serverCountValue,
      ugValue: ipcCountValue
    };
  }

  const serverDeliverValue = getParamDeliverValue(serverParam);
  const ipcDeliverValue = getParamDeliverValue(ipcParam);
  if (!isEquivalentNumericFirst(serverDeliverValue, ipcDeliverValue)) {
    diffFields.push("paramDeliverValue");
    fieldValueDiffs.paramDeliverValue = {
      currentValue: serverDeliverValue,
      ugValue: ipcDeliverValue
    };
  }

  return {
    diffFields,
    fieldValueDiffs
  };
}

/**
 * 构建参数差异模型。
 * @param {{
 *   serverParams: object[],
 *   ipcParams: object[],
 *   resolveServerRowKey?: (row: object, index: number) => string|number
 * }} options 输入参数。
 * @returns {{
 *   rowDiffByKey: Record<string, {
 *     status:string,
 *     diffFields:string[],
 *     serverCode:string,
 *     ipcCode:string,
 *     fieldValueDiffs?:Record<string, {currentValue:unknown, ugValue:unknown}>,
 *     serverParam?:object,
 *     ipcParam?:object
 *   }>,
 *   unmatchedIpcEntries: Array<{index:number,param:object,rawCode:any,normalizedCode:string,visibleCode:string}>,
 *   stats: {matched:number,diff:number,serverOnly:number,ipcOnly:number}
 * }}
 */
export function buildPartParamDiffModel(options = {}) {
  const {
    serverParams = [],
    ipcParams = [],
    resolveServerRowKey = (row, index) => valueFromAliases(row, ["paramCode", "id", "code"], index)
  } = options;
  const normalizedServerParams = Array.isArray(serverParams) ? serverParams : [];
  const { entries: ipcEntries, indexMap } = buildIpcParamIndex(ipcParams);
  const consumedIpcIndexSet = new Set();
  const rowDiffByKey = {};
  const stats = {
    matched: 0,
    diff: 0,
    serverOnly: 0,
    ipcOnly: 0
  };

  normalizedServerParams.forEach((serverParam, serverIndex) => {
    const rowKey = resolveServerRowKey(serverParam, serverIndex);
    const serverCode = normalizeParamCode(getParamCode(serverParam));
    const matchedIpcEntry = serverCode ? indexMap.get(serverCode) : undefined;

    if (!matchedIpcEntry) {
      stats.serverOnly += 1;
      rowDiffByKey[rowKey] = {
        status: "server_only",
        diffFields: [],
        serverCode,
        ipcCode: "",
        serverParam
      };
      return;
    }

    consumedIpcIndexSet.add(matchedIpcEntry.index);
    const { diffFields, fieldValueDiffs } = resolveFieldDiffResult(serverParam, matchedIpcEntry.param);
    stats.matched += 1;
    if (diffFields.length > 0) {
      stats.diff += 1;
    }
    rowDiffByKey[rowKey] = {
      status: diffFields.length > 0 ? "matched_diff" : "matched_equal",
      diffFields,
      serverCode,
      ipcCode: matchedIpcEntry.normalizedCode,
      fieldValueDiffs,
      serverParam,
      ipcParam: matchedIpcEntry.param
    };
  });

  const unmatchedIpcEntries = ipcEntries
    .filter((entry) => !consumedIpcIndexSet.has(entry.index))
    .map((entry) => ({
      ...entry,
      // 统一可视文案，便于在页面头部展示未匹配参数编号。
      visibleCode: entry.normalizedCode || `缺少参数编号(第${entry.index + 1}项)`
    }));
  stats.ipcOnly = unmatchedIpcEntries.length;

  return {
    rowDiffByKey,
    unmatchedIpcEntries,
    stats
  };
}

/**
 * 从差异模型中按状态收集服务器参数编号（去重后保留首次出现顺序）。
 * @param {Record<string, {status:string, serverCode:string}>} rowDiffByKey 行差异映射。
 * @param {string} targetStatus 目标状态。
 * @returns {string[]}
 */
function collectServerCodesByStatus(rowDiffByKey, targetStatus) {
  if (!rowDiffByKey || typeof rowDiffByKey !== "object") {
    return [];
  }
  const codeList = [];
  Object.values(rowDiffByKey).forEach((entry) => {
    if (!entry || entry.status !== targetStatus) {
      return;
    }
    const normalizedCode = normalizeParamCode(entry.serverCode);
    if (!normalizedCode || codeList.includes(normalizedCode)) {
      return;
    }
    codeList.push(normalizedCode);
  });
  return codeList;
}

/**
 * 读取 IPC 未匹配项的可视编号，缺失时回退“第 N 项”文案。
 * @param {Array<{visibleCode?:string,normalizedCode?:string,rawCode?:unknown}>} unmatchedIpcEntries IPC 未匹配项。
 * @returns {string[]}
 */
function resolveUnmatchedIpcVisibleCodes(unmatchedIpcEntries) {
  const normalizedEntries = Array.isArray(unmatchedIpcEntries) ? unmatchedIpcEntries : [];
  const codeList = [];
  normalizedEntries.forEach((entry, index) => {
    const visibleCodeText = normalizeComparableValue(entry?.visibleCode);
    const normalizedCodeText = normalizeComparableValue(entry?.normalizedCode);
    const rawCodeText = normalizeComparableValue(entry?.rawCode);
    const candidateCode = visibleCodeText || normalizedCodeText || rawCodeText || `缺少参数编号(第${index + 1}项)`;
    if (codeList.includes(candidateCode)) {
      return;
    }
    codeList.push(candidateCode);
  });
  return codeList;
}

/**
 * 将编号列表格式化为“最多展示 N 条 + 等”提示。
 * @param {string[]} codes 参数编号列表。
 * @param {number} maxShowCodes 最大展示数量。
 * @returns {string}
 */
function formatCodePreview(codes, maxShowCodes) {
  const normalizedCodes = Array.isArray(codes) ? codes.filter((code) => normalizeComparableValue(code)) : [];
  if (normalizedCodes.length === 0) {
    return "";
  }
  const limit = Number.isFinite(maxShowCodes) && maxShowCodes > 0 ? Math.floor(maxShowCodes) : 5;
  const previewCodes = normalizedCodes.slice(0, limit);
  return normalizedCodes.length > limit ? `${previewCodes.join("、")} 等` : previewCodes.join("、");
}

/** 差异字段名映射：用于弹窗明细展示。 */
const DIFF_FIELD_LABEL_MAP = Object.freeze({
  paramCountValue: "计算值",
  paramDeliverValue: "交付值"
});

/**
 * 按顺序提取“匹配但值不一致”的参数明细。
 * @param {Record<string, {
 *   status:string,
 *   serverCode:string,
 *   diffFields?:string[],
 *   fieldValueDiffs?:Record<string, {currentValue:unknown, ugValue:unknown}>
 * }>} rowDiffByKey 行差异映射。
 * @returns {Array<{code:string,fieldKey:string,fieldLabel:string,currentValue:unknown,ugValue:unknown}>}
 */
function collectMatchedDiffDetails(rowDiffByKey) {
  if (!rowDiffByKey || typeof rowDiffByKey !== "object") {
    return [];
  }
  const details = [];
  Object.values(rowDiffByKey).forEach((entry) => {
    if (!entry || entry.status !== "matched_diff") {
      return;
    }
    const normalizedCode = normalizeParamCode(entry.serverCode);
    const visibleCode = normalizedCode || "缺少参数编号";
    const diffFields = Array.isArray(entry.diffFields) ? entry.diffFields : [];
    const fieldValueDiffs = entry.fieldValueDiffs && typeof entry.fieldValueDiffs === "object" ? entry.fieldValueDiffs : {};
    diffFields.forEach((fieldKey) => {
      const fieldValueDiff = fieldValueDiffs[fieldKey] ?? {};
      details.push({
        code: visibleCode,
        fieldKey,
        fieldLabel: DIFF_FIELD_LABEL_MAP[fieldKey] ?? fieldKey,
        currentValue: fieldValueDiff.currentValue,
        ugValue: fieldValueDiff.ugValue
      });
    });
  });
  return details;
}

/**
 * 格式化值用于差异展示：空值统一回退为“-”。
 * @param {unknown} value 原始值。
 * @returns {string}
 */
function toDiffDisplayValue(value) {
  const textValue = normalizeComparableValue(value);
  return textValue || "-";
}

/**
 * 读取参数行中的“计算值/交付值”摘要文本。
 * @param {object|undefined} param 参数行。
 * @returns {string}
 */
function buildParamValueSnapshotText(param) {
  const countText = toDiffDisplayValue(getParamCountValue(param));
  const deliverText = toDiffDisplayValue(getParamDeliverValue(param));
  return `计算值: ${countText}；交付值: ${deliverText}`;
}

/**
 * 构建“保存参数前”差异确认文案。
 * @param {{
 *   rowDiffByKey?: Record<string, {status:string,serverCode:string}>,
 *   unmatchedIpcEntries?: Array<{visibleCode?:string,normalizedCode?:string,rawCode?:unknown}>,
 *   stats?: {diff?:number,serverOnly?:number,ipcOnly?:number}
 * }} model 差异模型。
 * @param {{maxShowCodes?:number}} options 构建选项。
 * @returns {{
 *   shouldConfirm:boolean,
 *   summaryText:string,
 *   detailLines:string[],
 *   detailItems:Array<{
 *     id:string,
 *     diffType:"value_diff"|"server_only"|"ug_only",
 *     diffTypeLabel:string,
 *     paramCode:string,
 *     fieldLabel:string,
 *     currentValue:string,
 *     ugValue:string
 *   }>
 * }}
 */
export function buildPartParamSaveConfirmPayload(model = {}, options = {}) {
  const stats = model?.stats ?? {};
  const diffCount = Number(stats.diff ?? 0);
  const serverOnlyCount = Number(stats.serverOnly ?? 0);
  const ipcOnlyCount = Number(stats.ipcOnly ?? 0);
  const shouldConfirm = diffCount > 0 || serverOnlyCount > 0 || ipcOnlyCount > 0;

  if (!shouldConfirm) {
    return {
      shouldConfirm: false,
      summaryText: "",
      detailLines: [],
      detailItems: []
    };
  }

  const { maxShowCodes = 5 } = options;
  const detailLines = [];
  const detailItems = [];
  if (diffCount > 0) {
    const diffDetails = collectMatchedDiffDetails(model?.rowDiffByKey);
    detailLines.push(`参数值不一致 ${diffCount} 项`);
    diffDetails.forEach((detail, index) => {
      detailItems.push({
        id: `value-diff-${index}-${detail.code}-${detail.fieldKey}`,
        diffType: "value_diff",
        diffTypeLabel: "值不一致",
        paramCode: detail.code,
        fieldLabel: detail.fieldLabel,
        currentValue: toDiffDisplayValue(detail.currentValue),
        ugValue: toDiffDisplayValue(detail.ugValue)
      });
    });
  }
  if (serverOnlyCount > 0) {
    const serverOnlyCodes = collectServerCodesByStatus(model?.rowDiffByKey, "server_only");
    const serverOnlyCodePreview = formatCodePreview(serverOnlyCodes, maxShowCodes);
    detailLines.push(`仅当前参数存在 ${serverOnlyCount} 项${serverOnlyCodePreview ? `（${serverOnlyCodePreview}）` : ""}`);
    const serverOnlyEntries = Object.values(model?.rowDiffByKey ?? {}).filter((entry) => entry?.status === "server_only");
    serverOnlyEntries.forEach((entry, index) => {
      const paramCode = normalizeParamCode(entry?.serverCode) || "缺少参数编号";
      detailItems.push({
        id: `server-only-${index}-${paramCode}`,
        diffType: "server_only",
        diffTypeLabel: "仅当前参数",
        paramCode,
        fieldLabel: "参数行",
        currentValue: buildParamValueSnapshotText(entry?.serverParam),
        ugValue: "-"
      });
    });
  }
  if (ipcOnlyCount > 0) {
    const ipcOnlyCodes = resolveUnmatchedIpcVisibleCodes(model?.unmatchedIpcEntries);
    const ipcOnlyCodePreview = formatCodePreview(ipcOnlyCodes, maxShowCodes);
    detailLines.push(`仅UG计算参数存在 ${ipcOnlyCount} 项${ipcOnlyCodePreview ? `（${ipcOnlyCodePreview}）` : ""}`);
    const unmatchedIpcEntries = Array.isArray(model?.unmatchedIpcEntries) ? model.unmatchedIpcEntries : [];
    unmatchedIpcEntries.forEach((entry, index) => {
      const paramCode = normalizeComparableValue(entry?.visibleCode) || `缺少参数编号(第${index + 1}项)`;
      detailItems.push({
        id: `ug-only-${index}-${paramCode}`,
        diffType: "ug_only",
        diffTypeLabel: "仅UG计算参数",
        paramCode,
        fieldLabel: "参数行",
        currentValue: "-",
        ugValue: buildParamValueSnapshotText(entry?.param)
      });
    });
  }

  return {
    shouldConfirm: true,
    summaryText: "检测到当前参数与UG计算参数存在差异，是否仍要保存？",
    detailLines,
    detailItems
  };
}

/**
 * 以服务器参数为基底，用 IPC 参数覆盖可匹配项（不追加新行）。
 * @param {{serverParams:object[],ipcParams:object[]}} options 输入参数。
 * @returns {object[]}
 */
export function applyIpcParamListToServerParams(options = {}) {
  const { serverParams = [], ipcParams = [] } = options;
  const normalizedServerParams = Array.isArray(serverParams) ? serverParams : [];
  const { indexMap } = buildIpcParamIndex(ipcParams);

  return normalizedServerParams.map((serverParam) => {
    const serverCode = normalizeParamCode(getParamCode(serverParam));
    if (!serverCode) {
      return serverParam;
    }
    const matchedIpcEntry = indexMap.get(serverCode);
    if (!matchedIpcEntry) {
      return serverParam;
    }

    const ipcParam = matchedIpcEntry.param;
    // IPC 未下发的字段保持服务器值，避免把有效数据覆盖成 null。
    const nextParamName = valueFromAliases(ipcParam, PARAM_NAME_ALIASES, getParamName(serverParam), { allowEmptyString: true });
    const nextParamCountValue = valueFromAliases(ipcParam, PARAM_COUNT_VALUE_ALIASES, getParamCountValue(serverParam), {
      allowEmptyString: true
    });
    const nextParamDeliverValue = valueFromAliases(
      ipcParam,
      PARAM_DELIVER_VALUE_ALIASES,
      getParamDeliverValue(serverParam),
      { allowEmptyString: true }
    );
    return {
      ...serverParam,
      paramName: nextParamName,
      paramCountValue: nextParamCountValue,
      paramDeliverValue: nextParamDeliverValue
    };
  });
}
