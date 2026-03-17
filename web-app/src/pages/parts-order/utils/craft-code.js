/**
 * @file craft-code.js
 * @description 工艺编码解析工具，统一兼容不同接口返回字段别名。
 * @author Codex
 * @date 2026-03-03
 */

/**
 * 解析工艺编码，优先使用详情对象字段，其次回退工艺列表行字段。
 * @param {{
 *  detail?: Record<string, any>|null,
 *  craft?: Record<string, any>|null,
 *  routingId?: string|number|null,
 *  standardCraftOptions?: Record<string, any>[]
 * }} payload 解析上下文。
 * @returns {string}
 */
export function resolveCraftCodeFromContext(payload = {}) {
  const detail = payload.detail && typeof payload.detail === "object" ? payload.detail : null;
  const craft = payload.craft && typeof payload.craft === "object" ? payload.craft : null;
  const standardCraftOptions = Array.isArray(payload.standardCraftOptions) ? payload.standardCraftOptions : [];
  const aliases = ["craftCode", "standardCraftCode", "craft_code", "standard_craft_code"];
  const routingAliases = ["partRoutingId", "part_routing_id", "routingId", "standardCraftId", "id"];

  const fromDetail = readFirstValueByAliases(detail, aliases);
  if (fromDetail) {
    return fromDetail;
  }

  const fromCraft = readFirstValueByAliases(craft, aliases);
  if (fromCraft) {
    return fromCraft;
  }

  if (standardCraftOptions.length > 0) {
    const candidateRoutingId = normalizeLookupKey(
      payload.routingId ?? readFirstValueByAliases(craft, routingAliases) ?? readFirstValueByAliases(detail, routingAliases)
    );
    if (candidateRoutingId) {
      const matchedCraftOption = standardCraftOptions.find((item) => {
        const optionRoutingId = normalizeLookupKey(readFirstValueByAliases(item, routingAliases));
        return optionRoutingId === candidateRoutingId;
      });
      const fromOption = readFirstValueByAliases(matchedCraftOption, aliases);
      if (fromOption) {
        return fromOption;
      }
    }
  }

  return "";
}

/**
 * 从对象中按别名顺序读取首个非空字符串。
 * @param {Record<string, any>|null} source 数据源对象。
 * @param {string[]} aliases 字段别名列表。
 * @returns {string}
 */
function readFirstValueByAliases(source, aliases) {
  if (!source || !Array.isArray(aliases)) {
    return "";
  }
  for (const alias of aliases) {
    const value = source[alias];
    const rawString = String(value ?? "");
    if (rawString.trim()) {
      return rawString;
    }
  }
  return "";
}

/**
 * 标准化用于比对的标识值（如 partRoutingId / standardCraftId）。
 * @param {any} value 原始值。
 * @returns {string}
 */
function normalizeLookupKey(value) {
  const rawString = String(value ?? "");
  return rawString.trim();
}
