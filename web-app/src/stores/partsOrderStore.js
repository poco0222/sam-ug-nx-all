/**
 * @file partsOrderStore.js
 * @description 零件工单页状态仓库，统一管理桥接上下文与页面主数据。
 * @author Codex
 * @date 2026-02-27
 */
import { defineStore } from "pinia";

export const usePartsOrderStore = defineStore("partsOrder", {
  state: () => ({
    // 桥接上下文消息。
    contextMessage: null,
    // 当前零件集合。
    parts: [],
    // 当前选中零件。
    selectedPart: null,
    // 当前多选零件列表（发布/上传等批量动作使用）。
    selectedParts: [],
    // 当前选中工艺。
    selectedCraft: null,
    // 工艺列表。
    craftList: [],
    // 参数列表。
    paramsList: [],
    // 当前编制人候选用户列表（以前端接口结果为主）。
    compilerCandidates: [],
    // 页面加载状态。
    loading: false,
    // 错误信息。
    error: ""
  }),
  actions: {
    /**
     * @param {object} message 桥接消息对象。
     */
    applyContextMessage(message) {
      this.contextMessage = message;
      // 收到 IPC 后不直接把 payload.parts 作为最终列表：
      // 页面会先调用 queryPartListByOrderNum，再按运行策略决定是否与 IPC 合并。
      this.parts = [];
      this.selectedPart = null;
      // 默认不勾选任何零件，交由用户手动选择批量操作对象。
      this.selectedParts = [];
    },
    /**
     * @param {{label:string,value:string}[]} candidates 编制人候选项。
     */
    setCompilerCandidates(candidates) {
      this.compilerCandidates = Array.isArray(candidates) ? candidates : [];
    },
    /**
     * @param {string} message 错误说明。
     */
    setError(message) {
      this.error = message;
    },
    clearError() {
      this.error = "";
    },
    /**
     * @param {object|null} part 单个零件对象。
     */
    setSelectedPart(part) {
      this.selectedPart = part;
    },
    /**
     * @param {object[]} parts 多选零件数组。
     */
    setSelectedParts(parts) {
      this.selectedParts = parts;
    },
    /**
     * @param {object|null} craft 工艺对象。
     */
    setSelectedCraft(craft) {
      this.selectedCraft = craft;
    }
  }
});
