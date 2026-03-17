<!--
  @file BaseSelect.vue
  @description 基础下拉选择组件，使用自绘弹层替代原生 select。
  @author Codex
  @date 2026-02-27
-->
<template>
  <div ref="rootRef" class="select-wrap" @focusout="handleRootFocusOut">
    <button
      ref="triggerRef"
      type="button"
      class="glass-input control-glass select-trigger"
      :class="{ 'select-open': open, 'select-disabled': disabled }"
      :disabled="disabled"
      :id="triggerId"
      role="combobox"
      aria-haspopup="listbox"
      :aria-expanded="open ? 'true' : 'false'"
      :aria-controls="listboxId"
      :aria-activedescendant="open && highlightedIndex >= 0 ? optionId(highlightedIndex) : undefined"
      @pointerdown="handleTriggerPointerDown"
      @mousedown="handleTriggerPointerDown"
      @click="togglePanel"
      @keydown="handleTriggerKeydown"
    >
      <span class="select-label" :class="{ 'select-placeholder': !selectedOption }">
        {{ selectedOption ? selectedOption.label : placeholder }}
      </span>
      <span class="select-arrow" :class="{ 'select-arrow-open': open }">▾</span>
    </button>

    <div
      v-if="open"
      ref="panelRef"
      :id="listboxId"
      class="chrome-glass select-panel"
      role="listbox"
      tabindex="-1"
      :aria-labelledby="triggerId"
      @keydown="handleListboxKeydown"
    >
      <div v-if="isFilterEnabled" class="select-filter-wrap">
        <input
          ref="filterInputRef"
          v-model="filterKeyword"
          type="text"
          class="glass-input control-glass select-filter-input"
          :placeholder="filterPlaceholder"
          :aria-label="`${placeholder}筛选`"
          @keydown.stop="handleFilterInputKeydown"
        />
      </div>
      <p v-if="visibleOptions.length === 0" class="select-empty-tip">无匹配选项</p>
      <button
        v-for="(option, index) in visibleOptions"
        :key="String(option.value)"
        :id="optionId(index)"
        type="button"
        class="select-option"
        role="option"
        :aria-selected="option.value === modelValue ? 'true' : 'false'"
        :class="{
          'select-option-active': option.value === modelValue,
          'select-option-highlighted': index === highlightedIndex
        }"
        :disabled="option.disabled"
        @pointerdown.prevent="handleOptionPointerDown(option)"
        @click.stop.prevent="handleOptionClick(option)"
      >
        <span class="select-option-indicator" aria-hidden="true">
          {{ option.value === modelValue ? "✓" : "" }}
        </span>
        <span class="select-option-text">{{ option.label }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { resolvePanelOpenStateByTriggerClick } from "@/components/base/panel-toggle";
import { filterSelectOptions } from "@/components/base/select-filter";

const props = defineProps({
  modelValue: {
    type: [String, Number, Boolean, null],
    default: ""
  },
  options: {
    type: Array,
    default: () => []
  },
  placeholder: {
    type: String,
    default: "请选择"
  },
  disabled: {
    type: Boolean,
    default: false
  },
  filterable: {
    type: Boolean,
    default: false
  },
  filterPlaceholder: {
    type: String,
    default: "输入关键词筛选"
  }
});

const emit = defineEmits(["update:modelValue", "change"]);

/** 下拉展开状态。 */
const open = ref(false);
/** 根节点引用，用于点击外部关闭。 */
const rootRef = ref(null);
/** 触发器引用，用于关闭后恢复焦点。 */
const triggerRef = ref(null);
/** 面板引用，用于键盘导航。 */
const panelRef = ref(null);
/** 筛选输入框引用，用于打开后自动聚焦。 */
const filterInputRef = ref(null);
/** 键盘高亮索引。 */
const highlightedIndex = ref(-1);
/** 选项筛选关键词。 */
const filterKeyword = ref("");
/** 标记是否由 pointer 触发选择，避免 click 重复提交。 */
const selectingByPointer = ref(false);
/** 记录触发器 pointerdown 时的展开态，修复 pointer/click 时序竞争。 */
const openAtTriggerPointerDown = ref(false);
/** 最近一次外部关闭时间戳，用于抑制 label 合成 click 导致的误 reopen。 */
const lastExternalCloseAt = ref(0);
/** 组件唯一 ID，确保 aria-controls / option id 稳定。 */
const baseId = `base-select-${Math.random().toString(36).slice(2, 10)}`;

const triggerId = `${baseId}-trigger`;
const listboxId = `${baseId}-listbox`;

/**
 * 标准化选项结构，防止外部传入字段缺失。
 * @returns {{label:string, value:any, disabled:boolean}[]}
 */
const normalizedOptions = computed(() => {
  return props.options.map((item) => ({
    label: String(item?.label ?? ""),
    value: item?.value,
    disabled: Boolean(item?.disabled)
  }));
});

/**
 * 当前下拉是否启用筛选。
 * @returns {boolean}
 */
const isFilterEnabled = computed(() => props.filterable);

/**
 * 当前可见选项（启用筛选时按关键词过滤）。
 * @returns {{label:string, value:any, disabled:boolean}[]}
 */
const visibleOptions = computed(() => {
  if (!isFilterEnabled.value) {
    return normalizedOptions.value;
  }
  return filterSelectOptions(normalizedOptions.value, filterKeyword.value);
});

/**
 * 当前选中项。
 * @returns {{label:string, value:any, disabled:boolean}|undefined}
 */
const selectedOption = computed(() => {
  return normalizedOptions.value.find((item) => item.value === props.modelValue);
});

/**
 * 切换面板显隐。
 */
function togglePanel(event) {
  if (props.disabled) {
    return;
  }
  if (shouldSuppressSyntheticReopen(event)) {
    openAtTriggerPointerDown.value = false;
    return;
  }
  const nextOpen = resolvePanelOpenStateByTriggerClick({
    openAtPointerDown: openAtTriggerPointerDown.value,
    openAtClick: open.value
  });
  openAtTriggerPointerDown.value = false;
  if (nextOpen) {
    openPanel();
    return;
  }
  closePanel({ restoreFocus: true });
}

/**
 * 记录触发器按下时面板状态，供 click 阶段做稳定判定。
 * 同时监听 pointerdown + mousedown，兼容 QtWebEngine 下 pointer 事件缺失场景。
 */
function handleTriggerPointerDown() {
  if (props.disabled) {
    return;
  }
  openAtTriggerPointerDown.value = open.value;
}

/**
 * 抑制“外部点击先关闭 -> label 合成 click 立刻重开”的时序抖动。
 * @param {MouseEvent|undefined} event 点击事件对象。
 * @returns {boolean}
 */
function shouldSuppressSyntheticReopen(event) {
  if (open.value || openAtTriggerPointerDown.value) {
    return false;
  }
  if (!event || event.detail !== 0) {
    return false;
  }
  if (!lastExternalCloseAt.value) {
    return false;
  }
  return window.performance.now() - lastExternalCloseAt.value < 240;
}

/**
 * 处理选项选择。
 * @param {{label:string, value:any, disabled:boolean}} option 选项对象。
 */
function handleSelect(option) {
  if (option.disabled) {
    return;
  }
  emit("update:modelValue", option.value);
  emit("change", option.value);
  closePanel({ restoreFocus: true });
}

/**
 * 指针按下即提交选择，规避 QtWebEngine 下 click/focus 时序竞争。
 * @param {{label:string, value:any, disabled:boolean}} option 选项对象。
 */
function handleOptionPointerDown(option) {
  if (option.disabled) {
    return;
  }
  selectingByPointer.value = true;
  handleSelect(option);
  queueMicrotask(() => {
    selectingByPointer.value = false;
  });
}

/**
 * 键盘触发 click 时执行选择；若已由 pointer 处理则跳过。
 * @param {{label:string, value:any, disabled:boolean}} option 选项对象。
 */
function handleOptionClick(option) {
  if (selectingByPointer.value) {
    return;
  }
  handleSelect(option);
}

/**
 * 获取可用项的首个索引。
 * @returns {number}
 */
function getFirstEnabledIndex() {
  return visibleOptions.value.findIndex((item) => !item.disabled);
}

/**
 * 获取指定方向下一个可用项索引。
 * @param {number} start 起始索引。
 * @param {1|-1} direction 方向。
 * @returns {number}
 */
function getNextEnabledIndex(start, direction) {
  const total = visibleOptions.value.length;
  if (total === 0) {
    return -1;
  }
  for (let step = 1; step <= total; step += 1) {
    const nextIndex = (start + step * direction + total) % total;
    if (!visibleOptions.value[nextIndex].disabled) {
      return nextIndex;
    }
  }
  return -1;
}

/**
 * 生成选项节点 ID。
 * @param {number} index 选项索引。
 * @returns {string}
 */
function optionId(index) {
  return `${baseId}-option-${index}`;
}

/**
 * 同步高亮索引，优先选中项，其次首个可用项。
 */
function syncHighlightedIndex() {
  const selectedIndex = visibleOptions.value.findIndex((item) => item.value === props.modelValue && !item.disabled);
  highlightedIndex.value = selectedIndex >= 0 ? selectedIndex : getFirstEnabledIndex();
}

/**
 * 让当前高亮项滚动到可见区域。
 */
function scrollHighlightedIntoView() {
  if (!panelRef.value || highlightedIndex.value < 0) {
    return;
  }
  const optionElement = panelRef.value.querySelector(`#${optionId(highlightedIndex.value)}`);
  optionElement?.scrollIntoView({ block: "nearest" });
}

/**
 * 打开面板并初始化键盘焦点。
 */
function openPanel() {
  if (isFilterEnabled.value) {
    filterKeyword.value = "";
  }
  open.value = true;
}

/**
 * 关闭面板并按需恢复焦点。
 * @param {{restoreFocus?: boolean}} [options] 控制参数。
 */
function closePanel(options = {}) {
  const { restoreFocus = false } = options;
  if (!open.value) {
    return;
  }
  open.value = false;
  highlightedIndex.value = -1;
  selectingByPointer.value = false;
  filterKeyword.value = "";
  if (restoreFocus) {
    nextTick(() => {
      triggerRef.value?.focus();
    });
  }
}

/**
 * 触发器键盘交互：支持开闭、方向导航与确认。
 * @param {KeyboardEvent} event 键盘事件对象。
 */
function handleTriggerKeydown(event) {
  if (props.disabled) {
    return;
  }
  if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    if (!open.value) {
      openPanel();
      return;
    }
  }
  if (event.key === "Escape") {
    event.preventDefault();
    closePanel({ restoreFocus: true });
  }
}

/**
 * 面板键盘交互：方向键移动、Enter 选中、Escape 关闭。
 * @param {KeyboardEvent} event 键盘事件对象。
 */
function handleListboxKeydown(event) {
  if (!open.value) {
    return;
  }
  if (event.key === "Escape") {
    event.preventDefault();
    closePanel({ restoreFocus: true });
    return;
  }
  if (event.key === "ArrowDown") {
    event.preventDefault();
    highlightedIndex.value = getNextEnabledIndex(highlightedIndex.value, 1);
    scrollHighlightedIntoView();
    return;
  }
  if (event.key === "ArrowUp") {
    event.preventDefault();
    highlightedIndex.value = getNextEnabledIndex(highlightedIndex.value, -1);
    scrollHighlightedIntoView();
    return;
  }
  if (event.key === "Enter") {
    event.preventDefault();
    if (highlightedIndex.value < 0) {
      return;
    }
    const option = visibleOptions.value[highlightedIndex.value];
    if (option) {
      handleSelect(option);
    }
  }
}

/**
 * 筛选输入框键盘交互：方向键移动、Enter 选中、Escape 关闭。
 * @param {KeyboardEvent} event 键盘事件对象。
 */
function handleFilterInputKeydown(event) {
  if (!open.value) {
    return;
  }
  if (event.key === "Escape") {
    event.preventDefault();
    closePanel({ restoreFocus: true });
    return;
  }
  if (event.key === "ArrowDown") {
    event.preventDefault();
    highlightedIndex.value = getNextEnabledIndex(highlightedIndex.value, 1);
    scrollHighlightedIntoView();
    return;
  }
  if (event.key === "ArrowUp") {
    event.preventDefault();
    highlightedIndex.value = getNextEnabledIndex(highlightedIndex.value, -1);
    scrollHighlightedIntoView();
    return;
  }
  if (event.key === "Enter") {
    event.preventDefault();
    if (highlightedIndex.value < 0) {
      return;
    }
    const option = visibleOptions.value[highlightedIndex.value];
    if (option) {
      handleSelect(option);
    }
  }
}

/**
 * 点击组件外关闭面板。
 * @param {PointerEvent} event 指针事件对象。
 */
function handleDocumentPointerDown(event) {
  if (!open.value || !rootRef.value) {
    return;
  }
  // 若点击发生在组件外部则关闭弹层，保持交互一致性。
  if (!rootRef.value.contains(event.target)) {
    lastExternalCloseAt.value = window.performance.now();
    closePanel();
  }
}

/**
 * 焦点离开组件根节点时关闭面板，覆盖纯键盘 Tab 离场路径。
 * @param {FocusEvent} event 焦点事件对象。
 */
function handleRootFocusOut(event) {
  if (!open.value || !rootRef.value) {
    return;
  }
  // QtWebEngine 下 relatedTarget 可能为空，改为微任务读取真实 activeElement。
  queueMicrotask(() => {
    if (!open.value || !rootRef.value) {
      return;
    }
    const currentActiveElement = document.activeElement;
    if (currentActiveElement && rootRef.value.contains(currentActiveElement)) {
      return;
    }
    lastExternalCloseAt.value = window.performance.now();
    closePanel();
  });
}

watch(
  () => open.value,
  (isOpen) => {
    if (!isOpen) {
      return;
    }
    syncHighlightedIndex();
    nextTick(() => {
      if (isFilterEnabled.value) {
        filterInputRef.value?.focus();
      } else {
        panelRef.value?.focus();
      }
      scrollHighlightedIntoView();
    });
  }
);

watch(
  () => visibleOptions.value,
  () => {
    if (!open.value) {
      return;
    }
    syncHighlightedIndex();
    nextTick(() => {
      scrollHighlightedIntoView();
    });
  }
);

onMounted(() => {
  window.addEventListener("pointerdown", handleDocumentPointerDown, true);
});

onBeforeUnmount(() => {
  window.removeEventListener("pointerdown", handleDocumentPointerDown, true);
});
</script>

<style scoped>
.select-wrap {
  position: relative;
  width: 100%;
}

.select-trigger {
  width: 100%;
  min-height: var(--liquid-control-height);
  padding: 0 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border-radius: var(--radius-lg);
  cursor: pointer;
}

.select-open {
  border-color: var(--liquid-accent-focus);
}

.select-trigger:focus-visible {
  border-color: var(--liquid-accent-focus);
  box-shadow:
    var(--glass-glow-inner),
    0 0 0 var(--liquid-focus-ring-width) var(--liquid-focus-ring-color, var(--liquid-accent-ring-soft));
}

.select-disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.select-label {
  font-size: 13px;
  color: var(--foreground);
  text-align: left;
}

.select-placeholder {
  color: var(--muted-foreground);
}

.select-arrow {
  font-size: 12px;
  color: var(--muted-foreground);
  flex-shrink: 0;
  transition: transform var(--duration-fast) var(--ease-glass);
}

.select-arrow-open {
  transform: rotate(180deg);
}

.select-panel {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 40;
  border-radius: var(--radius-xl);
  padding: 8px;
  max-height: 220px;
  overflow: auto;
  animation: fade-in var(--duration-fast) var(--ease-glass) both;
}

.select-filter-wrap {
  position: sticky;
  top: 0;
  z-index: 1;
  padding-bottom: 8px;
  background: inherit;
}

.select-filter-input {
  width: 100%;
  min-height: calc(var(--liquid-control-height) - 6px);
  padding: 0 10px;
  font-size: 12px;
}

.select-empty-tip {
  margin: 0;
  padding: 8px 10px;
  font-size: 12px;
  color: var(--muted-foreground);
}

.select-option {
  width: 100%;
  min-height: calc(var(--liquid-control-height) - 2px);
  border: 1px solid transparent;
  background: transparent;
  border-radius: var(--radius-md);
  padding: 0 10px 0 8px;
  text-align: left;
  font-size: 13px;
  color: var(--foreground);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition:
    border-color var(--duration-fast) var(--ease-glass),
    background-color var(--duration-fast) var(--ease-glass),
    box-shadow var(--duration-fast) var(--ease-glass);
}

.select-option-indicator {
  width: 14px;
  text-align: center;
  color: var(--liquid-accent-focus);
  font-size: 12px;
  font-weight: 700;
  opacity: 0.2;
  flex-shrink: 0;
}

.select-option-text {
  flex: 1;
  min-width: 0;
}

.select-option:hover:not(:disabled) {
  border-color: rgba(213, 217, 224, 0.72);
  background: var(--select-option-highlight-bg);
}

.select-option-active {
  border-color: var(--select-option-active-border);
  background: var(--select-option-active-bg);
  color: var(--date-cell-selected-foreground);
  font-weight: 600;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.30);
}

.select-option-active .select-option-indicator {
  opacity: 1;
}

.select-option-highlighted:not(.select-option-active) {
  border-color: rgba(213, 217, 224, 0.62);
  background: var(--select-option-highlight-bg);
}

.select-option:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
