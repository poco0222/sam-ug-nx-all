/**
 * @file part-merge.js
 * @description 零件编号匹配与 ERP/IPC 合并工具，统一处理别名字段与编号规范化。
 * @author Codex
 * @date 2026-03-02
 */

/** 页面展示/兜底场景使用的零件编号候选字段，按优先级从高到低匹配。 */
const PART_CODE_ALIASES = [
  "pcode",
  "pCode",
  "partCode",
  "p_code",
  "part_code",
  "importPartCode",
  "import_part_code",
  "partNumber"
];

/** ERP `queryPartListByOrderNum` 结果用于匹配的编号字段（原 Vue2 优先 pcode）。 */
const ERP_MATCH_CODE_ALIASES = ["pcode", "pCode", "p_code", "partCode", "part_code"];

/** IPC 传入数据用于匹配的编号字段（优先 p_code，并兼容大小写风格差异）。 */
const IPC_MATCH_CODE_ALIASES = ["p_code", "pcode", "pCode", "partCode", "part_code"];

/** 零宽字符正则，用于清理看不见但会影响字符串匹配的字符。 */
const ZERO_WIDTH_CHAR_REGEXP = /[\u200B-\u200D\uFEFF]/g;
/** 零件编号中的常见空白字符（用于可视化调试）。 */
const WHITESPACE_CHAR_REGEXP = / |\t|\r|\n/g;
/** 零件编号匹配状态：用于页面展示 IPC 与刷新查询对照结果。 */
const PART_MATCH_STATUS = {
  MATCHED: "已匹配",
  REFRESH_ONLY: "仅刷新",
  IPC_ONLY: "仅IPC"
};

/**
 * 从候选字段中读取首个有效值。
 * @param {object} row 行对象。
 * @param {string[]} keys 候选字段列表。
 * @param {any} fallback 默认值。
 * @returns {any}
 */
function valueFromAliases(row, keys, fallback = null) {
  if (!row || !Array.isArray(keys)) {
    return fallback;
  }
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return fallback;
}

/**
 * 获取零件编号，兼容不同接口返回的命名风格字段。
 * @param {object} part 零件对象。
 * @returns {string|number|null}
 */
export function getPartCode(part) {
  return valueFromAliases(part, PART_CODE_ALIASES, null);
}

/**
 * 获取 ERP 行用于匹配的编号（按约定仅使用 pCode）。
 * @param {object} part ERP 零件行。
 * @returns {string|number|null}
 */
function getErpMatchCode(part) {
  return valueFromAliases(part, ERP_MATCH_CODE_ALIASES, null);
}

/**
 * 获取 IPC 行用于匹配的编号（按约定仅使用 p_code）。
 * @param {object} part IPC 零件行。
 * @returns {string|number|null}
 */
function getIpcMatchCode(part) {
  return valueFromAliases(part, IPC_MATCH_CODE_ALIASES, null);
}

/**
 * 规范化零件编号，统一清理隐藏字符、首尾空格并转大写。
 * @param {string|number|null|undefined} code 零件编号。
 * @returns {string}
 */
export function normalizePartCode(code) {
  if (code === null || code === undefined) {
    return "";
  }
  return String(code).replace(ZERO_WIDTH_CHAR_REGEXP, "").trim().toUpperCase();
}

/**
 * 将零件编号中的不可见字符替换为可视占位符，便于定位“看起来相同却匹配失败”的问题。
 * @param {string|number|null|undefined} code 零件编号。
 * @returns {string}
 */
export function toVisiblePartCode(code) {
  if (code === null || code === undefined || code === "") {
    return "-";
  }
  return String(code)
    .replace(/\u200B/g, "<ZWSP>")
    .replace(/\u200C/g, "<ZWNJ>")
    .replace(/\u200D/g, "<ZWJ>")
    .replace(/\uFEFF/g, "<BOM>")
    .replace(WHITESPACE_CHAR_REGEXP, (value) => {
      if (value === " ") {
        return "<SPACE>";
      }
      if (value === "\t") {
        return "<TAB>";
      }
      if (value === "\r") {
        return "<CR>";
      }
      return "<LF>";
    });
}

/**
 * 为 ERP 行补充 IPC 下发字段，保持“除 base64/paramList 外全部使用 ERP 数据”。
 * @param {object} erpPart ERP 行。
 * @param {object|undefined} contextPart IPC 上下文行。
 * @returns {object}
 */
function mergeOnePart(erpPart, contextPart) {
  return {
    ...erpPart,
    base64: contextPart?.base64 ?? "",
    paramList: Array.isArray(contextPart?.paramList) ? contextPart.paramList : []
  };
}

/**
 * 构建页面调试行：统一附加匹配状态、两侧原始/归一化编号、不匹配原因等元信息。
 * @param {object} baseRow 页面零件基础数据。
 * @param {{
 *   matchStatus: string,
 *   matchReason: string,
 *   refreshRawCode: string|number|null,
 *   refreshNormalizedCode: string,
 *   ipcRawCode: string|number|null,
 *   ipcNormalizedCode: string,
 *   rowKey: string
 * }} meta 调试元数据。
 * @returns {object}
 */
function attachComparisonMeta(baseRow, meta) {
  return {
    ...baseRow,
    __matchStatus: meta.matchStatus,
    __matchReason: meta.matchReason,
    __refreshCodeRaw: meta.refreshRawCode ?? "",
    __refreshCodeNormalized: meta.refreshNormalizedCode ?? "",
    __refreshCodeVisible: toVisiblePartCode(meta.refreshRawCode),
    __ipcCodeRaw: meta.ipcRawCode ?? "",
    __ipcCodeNormalized: meta.ipcNormalizedCode ?? "",
    __ipcCodeVisible: toVisiblePartCode(meta.ipcRawCode),
    __rowKey: meta.rowKey
  };
}

/**
 * 同时构建 IPC 与刷新查询的对照数据行：
 * 1. 刷新结果优先作为主数据行（保持业务字段完整）；
 * 2. 能匹配上 IPC 时补齐 base64/paramList；
 * 3. 未匹配的刷新行与 IPC 行都会保留，并附带不匹配原因。
 * @param {object[]} contextParts IPC 下发零件列表。
 * @param {object[]} erpRows 刷新查询零件列表。
 * @returns {object[]}
 */
export function buildPartComparisonRows(contextParts, erpRows) {
  const normalizedContextParts = Array.isArray(contextParts) ? contextParts : [];
  const normalizedErpRows = Array.isArray(erpRows) ? erpRows : [];
  const hasRefreshRows = normalizedErpRows.length > 0;
  const contextEntries = normalizedContextParts.map((part, index) => {
    const ipcRawCode = getIpcMatchCode(part);
    const ipcNormalizedCode = normalizePartCode(ipcRawCode);
    return {
      part,
      index,
      ipcRawCode,
      ipcNormalizedCode
    };
  });
  const contextPartMap = new Map();

  // IPC 按编号建索引，重复编号默认保留首条（与历史逻辑一致）。
  contextEntries.forEach((entry) => {
    if (!entry.ipcNormalizedCode || contextPartMap.has(entry.ipcNormalizedCode)) {
      return;
    }
    contextPartMap.set(entry.ipcNormalizedCode, entry);
  });

  const consumedContextIndexSet = new Set();
  const comparisonRows = normalizedErpRows.map((erpPart, erpIndex) => {
    const refreshRawCode = getErpMatchCode(erpPart);
    const refreshNormalizedCode = normalizePartCode(refreshRawCode);
    const matchedContextEntry = refreshNormalizedCode ? contextPartMap.get(refreshNormalizedCode) : undefined;

    if (matchedContextEntry) {
      consumedContextIndexSet.add(matchedContextEntry.index);
      return attachComparisonMeta(mergeOnePart(erpPart, matchedContextEntry.part), {
        matchStatus: PART_MATCH_STATUS.MATCHED,
        matchReason: "编号归一化后一致",
        refreshRawCode,
        refreshNormalizedCode,
        ipcRawCode: matchedContextEntry.ipcRawCode,
        ipcNormalizedCode: matchedContextEntry.ipcNormalizedCode,
        rowKey: `refresh-${erpIndex}-matched-${refreshNormalizedCode || "no-code"}`
      });
    }

    return attachComparisonMeta(mergeOnePart(erpPart, undefined), {
      matchStatus: PART_MATCH_STATUS.REFRESH_ONLY,
      matchReason: refreshNormalizedCode ? "IPC 中未找到同编号" : "刷新结果缺少匹配编号(pCode/pcode)",
      refreshRawCode,
      refreshNormalizedCode,
      ipcRawCode: null,
      ipcNormalizedCode: "",
      rowKey: `refresh-${erpIndex}-only-${refreshNormalizedCode || "no-code"}`
    });
  });

  contextEntries.forEach((entry) => {
    if (consumedContextIndexSet.has(entry.index)) {
      return;
    }
    comparisonRows.push(
      attachComparisonMeta(
        {
          ...entry.part,
          base64: entry.part?.base64 ?? "",
          paramList: Array.isArray(entry.part?.paramList) ? entry.part.paramList : []
        },
        {
          matchStatus: PART_MATCH_STATUS.IPC_ONLY,
          matchReason: !hasRefreshRows
            ? "刷新结果为空"
            : entry.ipcNormalizedCode
              ? "刷新结果中未找到同编号"
              : "IPC 缺少匹配编号(p_code)",
          refreshRawCode: null,
          refreshNormalizedCode: "",
          ipcRawCode: entry.ipcRawCode,
          ipcNormalizedCode: entry.ipcNormalizedCode,
          rowKey: `ipc-${entry.index}-only-${entry.ipcNormalizedCode || "no-code"}`
        }
      )
    );
  });

  return comparisonRows;
}

/**
 * 用 ERP 数据覆盖 IPC 零件：
 * 1. 先按 `ERP.pcode/pCode/p_code` 与 `IPC.p_code/pcode/pCode` 做匹配；
 * 2. 匹配成功后仅保留 IPC 的 `base64`、`paramList`，其它字段全部使用 ERP 返回。
 * 3. 若 IPC 没有可匹配编号，则回退为 ERP 原始列表（并补空 base64/paramList）。
 * @param {object[]} contextParts IPC 下发零件列表。
 * @param {object[]} erpRows ERP 查询零件列表。
 * @returns {object[]}
 */
export function mergeContextAndErpParts(contextParts, erpRows) {
  const normalizedContextParts = Array.isArray(contextParts) ? contextParts : [];
  const normalizedErpRows = Array.isArray(erpRows) ? erpRows : [];
  const contextPartMap = new Map();

  // 仅使用 IPC 的 p_code 参与匹配，避免 importPartCode 等别名造成误命中。
  normalizedContextParts.forEach((contextPart) => {
    const ipcCode = normalizePartCode(getIpcMatchCode(contextPart));
    if (!ipcCode || contextPartMap.has(ipcCode)) {
      return;
    }
    contextPartMap.set(ipcCode, contextPart);
  });

  // IPC 编号缺失时不做交集裁剪，避免页面出现空列表。
  if (contextPartMap.size === 0) {
    return normalizedErpRows.map((erpPart) => mergeOnePart(erpPart, undefined));
  }

  return normalizedErpRows
    .filter((erpPart) => {
      const erpCode = normalizePartCode(getErpMatchCode(erpPart));
      return Boolean(erpCode) && contextPartMap.has(erpCode);
    })
    .map((erpPart) => {
      const erpCode = normalizePartCode(getErpMatchCode(erpPart));
      const contextPart = erpCode ? contextPartMap.get(erpCode) : undefined;
      return mergeOnePart(erpPart, contextPart);
    });
}
