<!--
  @file BaseCheckbox.vue
  @description 基础复选框组件，统一液态玻璃风格并提供键盘可访问性。
  @author Codex
  @date 2026-02-27
-->
<template>
  <button
    type="button"
    :class="[
      'checkbox-root',
      'transition-glass-fast',
      contextClass,
      { 'checkbox-checked': modelValue, 'checkbox-indeterminate': indeterminate && !modelValue, 'checkbox-disabled': disabled }
    ]"
    role="checkbox"
    :aria-checked="ariaCheckedValue"
    :aria-disabled="disabled ? 'true' : 'false'"
    :disabled="disabled"
    @click.stop="toggleChecked"
    @keydown="handleKeydown"
  >
    <span class="checkbox-box" aria-hidden="true">
      <span v-if="modelValue" class="checkbox-mark">✓</span>
      <span v-else-if="indeterminate" class="checkbox-mark">-</span>
    </span>
    <span v-if="label" class="checkbox-label">{{ label }}</span>
  </button>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  indeterminate: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  label: {
    type: String,
    default: ""
  },
  context: {
    type: String,
    default: "default",
    validator: (value) => ["default", "table"].includes(value)
  }
});

const emit = defineEmits(["update:modelValue", "change"]);

/**
 * 切换勾选状态，并对外同步 update 与 change 事件。
 */
function toggleChecked() {
  if (props.disabled) {
    return;
  }
  const nextValue = !props.modelValue;
  emit("update:modelValue", nextValue);
  emit("change", nextValue);
}

/**
 * 支持 Enter / Space 键切换，满足键盘可访问性。
 * @param {KeyboardEvent} event 键盘事件。
 */
function handleKeydown(event) {
  if (props.disabled) {
    return;
  }
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }
  event.preventDefault();
  toggleChecked();
}

/**
 * 解析视觉上下文：默认控件态 or 表格紧凑态。
 * @returns {string}
 */
const contextClass = computed(() => {
  if (props.context === "table") {
    return "checkbox-table";
  }
  return "control-glass";
});

/**
 * 解析 aria-checked 值，支持 mixed 语义，提升读屏一致性。
 * @returns {"true"|"false"|"mixed"}
 */
const ariaCheckedValue = computed(() => {
  if (props.modelValue) {
    return "true";
  }
  if (props.indeterminate) {
    return "mixed";
  }
  return "false";
});
</script>

<style scoped>
.checkbox-root {
  min-height: var(--liquid-control-height-sm, var(--liquid-control-height));
  min-width: var(--liquid-control-height-sm, var(--liquid-control-height));
  border-radius: var(--radius-lg);
  border: 1px solid var(--control-glass-border);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 var(--liquid-control-padding-sm, 10px);
  cursor: pointer;
  transition:
    border-color var(--duration-fast) var(--ease-glass),
    box-shadow var(--duration-fast) var(--ease-glass),
    background-color var(--duration-fast) var(--ease-glass);
}

.checkbox-table {
  min-height: calc(var(--liquid-checkbox-box-size, 15px) + 6px);
  min-width: calc(var(--liquid-checkbox-box-size, 15px) + 6px);
  padding: 2px;
  gap: 4px;
  border-radius: var(--radius-sm);
  border-color: var(--checkbox-table-border);
  background: var(--checkbox-table-bg);
  box-shadow: none;
}

.checkbox-root:hover:not(.checkbox-disabled) {
  border-color: var(--liquid-accent-hover);
  background: rgba(240, 243, 248, 0.92);
}

.checkbox-root.checkbox-table:hover:not(.checkbox-disabled) {
  border-color: rgba(59, 130, 246, 0.50);
  background: var(--checkbox-table-hover-bg);
}

.checkbox-root:focus-visible {
  outline: none;
  border-color: var(--liquid-accent-focus);
  box-shadow:
    var(--glass-glow-inner),
    0 0 0 var(--liquid-focus-ring-width) var(--liquid-focus-ring-color, var(--liquid-accent-ring-soft));
}

.checkbox-root.checkbox-disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.checkbox-box {
  width: var(--liquid-checkbox-box-size, 15px);
  height: var(--liquid-checkbox-box-size, 15px);
  border: 1px solid var(--control-glass-border);
  border-radius: 5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  /* 复选框底色跟随控件材质令牌，保证深浅色一致。 */
  background: var(--control-glass-bg);
  transition:
    border-color var(--duration-fast) var(--ease-glass),
    background-color var(--duration-fast) var(--ease-glass),
    box-shadow var(--duration-fast) var(--ease-glass);
}

.checkbox-root.checkbox-table .checkbox-box {
  border-radius: 4px;
  border-color: var(--checkbox-table-border);
  background: rgba(245, 246, 248, 0.88);
  box-shadow: none;
}

.checkbox-root.checkbox-checked .checkbox-box {
  /* 勾选态叠加强调色，但仍保留当前控件材质基底。 */
  background: rgba(59, 130, 246, 0.28);
  border-color: var(--liquid-accent-focus);
}

.checkbox-root.checkbox-table.checkbox-checked .checkbox-box {
  background: var(--checkbox-table-selected-bg);
  border-color: var(--checkbox-table-selected-border);
}

.checkbox-root.checkbox-indeterminate .checkbox-box {
  background: rgba(59, 130, 246, 0.16);
  border-color: var(--liquid-accent-focus);
}

.checkbox-root.checkbox-table.checkbox-indeterminate .checkbox-box {
  background: rgba(59, 130, 246, 0.20);
  border-color: rgba(59, 130, 246, 0.52);
}

.checkbox-mark {
  color: var(--liquid-accent);
  font-size: 12px;
  line-height: 1;
  font-weight: 700;
}

.checkbox-root.checkbox-table .checkbox-mark {
  font-size: 11px;
  color: var(--date-cell-selected-foreground);
}

.checkbox-label {
  color: var(--foreground);
  font-size: 12px;
  line-height: 1.2;
}
</style>
