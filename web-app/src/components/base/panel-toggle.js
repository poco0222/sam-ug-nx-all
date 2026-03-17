/**
 * @file panel-toggle.js
 * @description 面板触发器点击开关判定工具，解决 pointer/click 时序竞争导致的“无法二次收起”问题。
 * @author Codex
 * @date 2026-03-02
 */

/**
 * 根据 pointerdown 与 click 阶段状态，计算触发器点击后的目标展开状态。
 * @param {{
 *  openAtPointerDown?: boolean,
 *  openAtClick?: boolean
 * }} state 当前状态快照。
 * @returns {boolean} true 表示点击后应展开；false 表示点击后应关闭。
 */
export function resolvePanelOpenStateByTriggerClick(state = {}) {
  const openAtPointerDown = Boolean(state.openAtPointerDown);
  const openAtClick = Boolean(state.openAtClick);

  // 若 pointerdown 时已展开，本次交互语义应为“收起”，即使 click 前已因焦点迁移关闭也保持关闭。
  if (openAtPointerDown) {
    return false;
  }

  // 其余情况按当前 click 时状态做常规切换。
  return !openAtClick;
}
