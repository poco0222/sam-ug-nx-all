<!--
  @file BaseDatePicker.vue
  @description 基础日期选择组件，提供自绘日历面板以替代原生 date 输入框。
  @author Codex
  @date 2026-02-27
-->
<template>
  <div ref="rootRef" class="date-wrap" @focusout="handleRootFocusOut">
    <button
      ref="triggerRef"
      type="button"
      class="glass-input control-glass date-trigger"
      :class="{ 'date-open': open, 'date-disabled': disabled }"
      :disabled="disabled"
      :id="triggerId"
      aria-haspopup="grid"
      :aria-expanded="open ? 'true' : 'false'"
      :aria-controls="panelId"
      @pointerdown="handleTriggerPointerDown"
      @mousedown="handleTriggerPointerDown"
      @click="togglePanel"
      @keydown="handleTriggerKeydown"
    >
      <span class="date-label" :class="{ 'date-placeholder': !modelValue }">
        {{ modelValue || placeholder }}
      </span>
      <svg class="date-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h1V3a1 1 0 0 1 1-1Zm13 8H4v9a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-9Zm-1-4H5a1 1 0 0 0-1 1v1h16V7a1 1 0 0 0-1-1Z"
        />
      </svg>
    </button>

    <div
      v-if="open"
      ref="panelRef"
      :id="panelId"
      class="chrome-glass date-panel"
      role="dialog"
      :aria-labelledby="triggerId"
      @keydown="handlePanelKeydown"
    >
      <div class="date-header">
        <button type="button" class="date-nav-btn" aria-label="上个月" @click="goPrevMonth">‹</button>
        <strong class="date-title">{{ panelYear }}年{{ panelMonth + 1 }}月</strong>
        <button type="button" class="date-nav-btn" aria-label="下个月" @click="goNextMonth">›</button>
      </div>

      <div class="date-week">
        <span v-for="item in weekNames" :key="item">{{ item }}</span>
      </div>

      <div :id="gridId" class="date-grid" role="grid" aria-label="日期网格">
        <button
          v-for="day in calendarDays"
          :key="day.key"
          type="button"
          class="date-cell"
          :data-date="day.value"
          role="gridcell"
          :tabindex="day.value === activeDateValue ? 0 : -1"
          :aria-selected="day.value === modelValue ? 'true' : 'false'"
          :aria-current="day.isToday ? 'date' : undefined"
          :class="{
            'date-cell-outside': !day.inCurrentMonth,
            'date-cell-selected': day.value === modelValue,
            'date-cell-today': day.isToday,
            'date-cell-focused': day.value === activeDateValue
          }"
          @focus="activeDateValue = day.value"
          @pointerdown.prevent="handleDayPointerDown(day)"
          @click.stop.prevent="handleDayClick(day)"
        >
          {{ day.day }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { resolvePanelOpenStateByTriggerClick } from "@/components/base/panel-toggle";

const props = defineProps({
  modelValue: {
    type: String,
    default: ""
  },
  placeholder: {
    type: String,
    default: "请选择日期"
  },
  disabled: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(["update:modelValue", "change"]);

/** 日历面板展开状态。 */
const open = ref(false);
/** 根节点引用，用于点击外部关闭。 */
const rootRef = ref(null);
/** 触发器引用，用于关闭后恢复焦点。 */
const triggerRef = ref(null);
/** 面板引用，用于日期网格键盘聚焦。 */
const panelRef = ref(null);
/** 面板年份。 */
const panelYear = ref(0);
/** 面板月份（0-11）。 */
const panelMonth = ref(0);
/** 键盘聚焦日期（YYYY-MM-DD）。 */
const activeDateValue = ref("");
/** 标记是否由 pointer 触发选择，避免 click 重复提交。 */
const selectingByPointer = ref(false);
/** 记录触发器 pointerdown 时的展开态，修复 pointer/click 时序竞争。 */
const openAtTriggerPointerDown = ref(false);
/** 最近一次外部关闭时间戳，用于抑制 label 合成 click 导致的误 reopen。 */
const lastExternalCloseAt = ref(0);
/** 星期标题。 */
const weekNames = ["日", "一", "二", "三", "四", "五", "六"];
/** 组件唯一 ID，保证 aria-controls 与网格 ID 稳定。 */
const baseId = `base-date-picker-${Math.random().toString(36).slice(2, 10)}`;

const triggerId = `${baseId}-trigger`;
const panelId = `${baseId}-panel`;
const gridId = `${baseId}-grid`;

/**
 * 解析 YYYY-MM-DD 到 Date，非法值返回 null。
 * @param {string} text 日期字符串。
 * @returns {Date|null}
 */
function parseDate(text) {
  if (!text || !/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return null;
  }
  const [year, month, day] = text.split("-").map((item) => Number(item));
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
}

/**
 * 将日期格式化为 YYYY-MM-DD。
 * @param {Date} date 日期对象。
 * @returns {string}
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 同步面板年月到当前值或今天。
 * @param {string} value 当前值。
 */
function syncPanel(value) {
  const parsed = parseDate(value) ?? new Date();
  panelYear.value = parsed.getFullYear();
  panelMonth.value = parsed.getMonth();
}

/**
 * 生成 6x7 日历网格。
 * @returns {{key:string, day:number, inCurrentMonth:boolean, value:string, isToday:boolean}[]}
 */
const calendarDays = computed(() => {
  const firstDay = new Date(panelYear.value, panelMonth.value, 1);
  const startWeekDay = firstDay.getDay();
  const startDate = new Date(panelYear.value, panelMonth.value, 1 - startWeekDay);
  const todayValue = formatDate(new Date());
  const days = [];

  for (let index = 0; index < 42; index += 1) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    const value = formatDate(date);
    days.push({
      key: `${value}-${index}`,
      day: date.getDate(),
      inCurrentMonth: date.getMonth() === panelMonth.value,
      value,
      isToday: value === todayValue
    });
  }
  return days;
});

/**
 * 切换日期面板。
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
 * 选择某一天并回写到外部。
 * @param {{value:string}} day 日历单元对象。
 */
function selectDay(day) {
  emit("update:modelValue", day.value);
  emit("change", day.value);
  closePanel({ restoreFocus: true });
}

/**
 * 指针按下即提交日期选择，规避 click/focus 时序竞争。
 * @param {{value:string}} day 日历单元对象。
 */
function handleDayPointerDown(day) {
  selectingByPointer.value = true;
  selectDay(day);
  queueMicrotask(() => {
    selectingByPointer.value = false;
  });
}

/**
 * 键盘触发 click 时执行选择；若已由 pointer 处理则跳过。
 * @param {{value:string}} day 日历单元对象。
 */
function handleDayClick(day) {
  if (selectingByPointer.value) {
    return;
  }
  selectDay(day);
}

/**
 * 切换上个月。
 */
function goPrevMonth() {
  if (panelMonth.value === 0) {
    panelMonth.value = 11;
    panelYear.value -= 1;
  } else {
    panelMonth.value -= 1;
  }
  nextTick(() => {
    focusActiveDateCell();
  });
}

/**
 * 切换下个月。
 */
function goNextMonth() {
  if (panelMonth.value === 11) {
    panelMonth.value = 0;
    panelYear.value += 1;
  } else {
    panelMonth.value += 1;
  }
  nextTick(() => {
    focusActiveDateCell();
  });
}

/**
 * 打开日期面板并初始化键盘焦点。
 */
function openPanel() {
  open.value = true;
}

/**
 * 关闭日期面板并按需恢复焦点。
 * @param {{restoreFocus?: boolean}} [options] 关闭控制选项。
 */
function closePanel(options = {}) {
  const { restoreFocus = false } = options;
  if (!open.value) {
    return;
  }
  open.value = false;
  selectingByPointer.value = false;
  if (restoreFocus) {
    nextTick(() => {
      triggerRef.value?.focus();
    });
  }
}

/**
 * 同步当前键盘焦点日期，优先当前值，否则取今天。
 */
function syncActiveDate() {
  activeDateValue.value = formatDate(parseDate(props.modelValue) ?? new Date());
}

/**
 * 聚焦当前活动日期单元格。
 */
function focusActiveDateCell() {
  if (!panelRef.value || !activeDateValue.value) {
    return;
  }
  const target = panelRef.value.querySelector(`[data-date="${activeDateValue.value}"]`);
  target?.focus();
  target?.scrollIntoView({ block: "nearest" });
}

/**
 * 以天为单位移动键盘焦点，并同步面板年月。
 * @param {number} offset 天数偏移。
 */
function moveActiveDate(offset) {
  const baseDate = parseDate(activeDateValue.value) ?? parseDate(props.modelValue) ?? new Date();
  baseDate.setDate(baseDate.getDate() + offset);
  activeDateValue.value = formatDate(baseDate);
  panelYear.value = baseDate.getFullYear();
  panelMonth.value = baseDate.getMonth();
  nextTick(() => {
    focusActiveDateCell();
  });
}

/**
 * 触发器键盘交互：支持 Enter/Space/ArrowDown 打开与 Escape 关闭。
 * @param {KeyboardEvent} event 键盘事件。
 */
function handleTriggerKeydown(event) {
  if (props.disabled) {
    return;
  }
  if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
    event.preventDefault();
    if (!open.value) {
      openPanel();
    }
    return;
  }
  if (event.key === "Escape") {
    event.preventDefault();
    closePanel({ restoreFocus: true });
  }
}

/**
 * 日期面板键盘交互：方向键导航、Enter/Space 选中、Escape 关闭。
 * @param {KeyboardEvent} event 键盘事件。
 */
function handlePanelKeydown(event) {
  if (!open.value) {
    return;
  }
  if (event.key === "Escape") {
    event.preventDefault();
    closePanel({ restoreFocus: true });
    return;
  }
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    moveActiveDate(-1);
    return;
  }
  if (event.key === "ArrowRight") {
    event.preventDefault();
    moveActiveDate(1);
    return;
  }
  if (event.key === "ArrowUp") {
    event.preventDefault();
    moveActiveDate(-7);
    return;
  }
  if (event.key === "ArrowDown") {
    event.preventDefault();
    moveActiveDate(7);
    return;
  }
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    const match = calendarDays.value.find((item) => item.value === activeDateValue.value);
    if (match) {
      selectDay(match);
    }
  }
}

/**
 * 点击外部时关闭面板。
 * @param {PointerEvent} event 指针事件。
 */
function handleDocumentPointerDown(event) {
  if (!open.value || !rootRef.value) {
    return;
  }
  // 若点击发生在组件外部则关闭，避免弹层滞留。
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
  () => props.modelValue,
  (value) => {
    syncPanel(value);
    if (!open.value) {
      syncActiveDate();
    }
  },
  { immediate: true }
);

watch(
  () => open.value,
  (isOpen) => {
    if (!isOpen) {
      return;
    }
    syncActiveDate();
    nextTick(() => {
      focusActiveDateCell();
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
.date-wrap {
  position: relative;
  width: 100%;
}

.date-trigger {
  width: 100%;
  min-height: var(--liquid-control-height);
  padding: 0 10px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  cursor: pointer;
}

.date-open {
  border-color: var(--liquid-accent-focus);
}

.date-trigger:focus-visible {
  border-color: var(--liquid-accent-focus);
  box-shadow:
    var(--glass-glow-inner),
    0 0 0 var(--liquid-focus-ring-width) var(--liquid-focus-ring-color, var(--liquid-accent-ring-soft));
}

.date-disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.date-label {
  font-size: 13px;
  color: var(--foreground);
}

.date-placeholder {
  color: var(--muted-foreground);
}

.date-icon {
  width: 14px;
  height: 14px;
  /* 图标颜色走语义令牌，避免暗色模式下固定色偏。 */
  fill: var(--muted-foreground);
  opacity: 0.9;
  flex-shrink: 0;
}

.date-panel {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  width: 260px;
  z-index: 40;
  border-radius: var(--radius-xl);
  padding: 10px;
  animation: fade-in var(--duration-fast) var(--ease-glass) both;
}

.date-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.date-title {
  font-size: 13px;
}

.date-nav-btn {
  width: calc(var(--liquid-control-height) - 8px);
  height: calc(var(--liquid-control-height) - 8px);
  border: 0;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--foreground);
  cursor: pointer;
}

.date-nav-btn:hover {
  background: var(--glass-bg-light);
}

.date-nav-btn:focus-visible {
  outline: none;
  box-shadow:
    var(--glass-glow-inner),
    0 0 0 var(--liquid-focus-ring-width) var(--liquid-focus-ring-color, var(--liquid-accent-ring-soft));
}

.date-week {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  font-size: 11px;
  color: var(--muted-foreground);
  text-align: center;
  margin-bottom: 4px;
}

.date-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.date-cell {
  min-height: calc(var(--liquid-control-height) - 4px);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  background: transparent;
  font-size: 12px;
  color: var(--foreground);
  cursor: pointer;
  transition:
    border-color var(--duration-fast) var(--ease-glass),
    background-color var(--duration-fast) var(--ease-glass),
    color var(--duration-fast) var(--ease-glass),
    box-shadow var(--duration-fast) var(--ease-glass);
}

.date-cell:hover {
  border-color: rgba(213, 217, 224, 0.58);
  background: var(--select-option-highlight-bg);
}

.date-cell-outside {
  opacity: 0.45;
}

.date-cell-selected {
  border-color: var(--date-cell-selected-border);
  background: var(--date-cell-selected-bg);
  color: var(--date-cell-selected-foreground);
  font-weight: 600;
}

.date-cell-focused:not(.date-cell-selected) {
  border-color: rgba(59, 130, 246, 0.42);
  background: rgba(245, 247, 250, 0.82);
}

.date-cell-today {
  box-shadow: inset 0 0 0 1px var(--liquid-accent-focus);
}

.date-cell-today.date-cell-selected {
  box-shadow:
    inset 0 0 0 1px rgba(59, 130, 246, 0.52),
    inset 0 1px 0 rgba(255, 255, 255, 0.28);
}
</style>
