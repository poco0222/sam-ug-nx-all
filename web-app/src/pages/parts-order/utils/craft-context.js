/**
 * @file craft-context.js
 * @description 工艺上下文判定工具，统一处理主键值为 0 的有效场景。
 * @author Codex
 * @date 2026-03-03
 */

/**
 * 判定主键值是否可用。
 * 说明：0 在后端语义中仍可能是有效主键，不能按 falsy 处理。
 * @param {string|number|null|undefined} primaryKey 主键值。
 * @returns {boolean}
 */
export function hasUsablePrimaryKey(primaryKey) {
  return primaryKey !== null && primaryKey !== undefined && primaryKey !== "";
}

/**
 * 解析工艺主键，兼容常见字段别名与大小写差异。
 * @param {object|null|undefined} craft 工艺对象。
 * @returns {string|number|null}
 */
export function resolveCraftPrimaryKey(craft) {
  if (!craft || typeof craft !== "object") {
    return null;
  }
  return (
    craft.id ??
    craft.orderId ??
    craft.partRoutingId ??
    craft.orderid ??
    craft.partRoutingid ??
    craft.part_routingId ??
    craft.orderID ??
    craft.partRoutingID ??
    craft.part_routingid ??
    craft.part_routing_id ??
    craft.routingId ??
    craft.routingID ??
    craft.samMesPartsOrderId ??
    craft.sam_mes_parts_order_id ??
    null
  );
}

/**
 * 判定是否进入工艺可编辑上下文。
 * @param {object|null|undefined} selectedCraft 当前选中工艺对象。
 * @param {string|number|null|undefined} craftId 工艺主键值。
 * @returns {boolean}
 */
export function hasCraftEditingContext(selectedCraft, craftId) {
  return Boolean(selectedCraft) && hasUsablePrimaryKey(craftId);
}
