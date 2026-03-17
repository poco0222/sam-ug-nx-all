/**
 * @file command-bar-condense.js
 * @description 指挥条凝练态判定工具，默认仅由页面主滚动驱动，避免嵌套表格滚动误触发。
 * @author Codex
 * @date 2026-03-02
 */

/**
 * 判断顶部指挥条是否应进入凝练态。
 * @param {{
 *  pageScrollTop?: number,
 *  nestedScrollTops?: number[],
 *  threshold?: number,
 *  includeNestedScroll?: boolean
 * }} options 判定参数。
 * @returns {boolean}
 */
export function shouldCondenseCommandBar(options = {}) {
  const pageScrollTop = Number.isFinite(options.pageScrollTop) ? options.pageScrollTop : 0;
  const threshold = Number.isFinite(options.threshold) ? options.threshold : 0;
  const includeNestedScroll = Boolean(options.includeNestedScroll);
  let maxScrollTop = pageScrollTop;

  // 仅在显式开启时才合并嵌套滚动，默认忽略 table 内部滚动带来的样式抖动。
  if (includeNestedScroll && Array.isArray(options.nestedScrollTops)) {
    options.nestedScrollTops.forEach((scrollTop) => {
      const normalized = Number.isFinite(scrollTop) ? scrollTop : 0;
      maxScrollTop = Math.max(maxScrollTop, normalized);
    });
  }

  return maxScrollTop >= threshold;
}
