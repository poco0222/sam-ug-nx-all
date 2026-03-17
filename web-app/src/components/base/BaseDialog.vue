<!--
  @file BaseDialog.vue
  @description 基础弹窗组件，提供统一遮罩和内容容器。
  @author Codex
  @date 2026-02-27
-->
<template>
  <section
    v-if="modelValue"
    class="dialog-mask"
    @click.self="closeDialog"
  >
    <article
      ref="panelRef"
      :class="dialogPanelClass"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      tabindex="-1"
    >
      <header class="dialog-header">
        <h3 :id="titleId" class="text-title">{{ title }}</h3>
        <BaseButton
          ref="closeButtonRef"
          class="dialog-close"
          variant="ghost"
          size="sm"
          shape="circle"
          icon-only
          aria-label="关闭弹窗"
          @click="closeDialog"
        >
          ×
        </BaseButton>
      </header>
      <div :class="dialogBodyClass">
        <slot />
      </div>
    </article>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import BaseButton from "@/components/base/BaseButton.vue";

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: "弹窗"
  },
  fullscreen: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(["update:modelValue"]);
/** 弹窗面板节点，用于焦点管理。 */
const panelRef = ref(null);
/** 关闭按钮节点，作为首选焦点回落位。 */
const closeButtonRef = ref(null);
/** 打开弹窗前的焦点来源，用于关闭后恢复。 */
const lastActiveElement = ref(null);
/** 弹窗标题 ID，供 aria-labelledby 关联。 */
const titleId = `base-dialog-title-${Math.random().toString(36).slice(2, 10)}`;
/** 弹窗容器样式类，支持按需切换全屏态。 */
const dialogPanelClass = computed(() => ({
  "dialog-panel": true,
  "chrome-glass": true,
  "dialog-panel-fullscreen": props.fullscreen
}));
/** 弹窗内容区样式类：全屏模式下改为内部组件自管滚动。 */
const dialogBodyClass = computed(() => ({
  "dialog-body": true,
  "dialog-body-fullscreen": props.fullscreen
}));

/**
 * 统一关闭弹窗，保持 ESC/遮罩/按钮行为一致。
 */
function closeDialog() {
  emit("update:modelValue", false);
}

/**
 * ESC 键关闭弹窗，行为与 DishVision 的 GlassDialog 对齐。
 * @param {KeyboardEvent} event 键盘事件对象。
 */
function handleKeydown(event) {
  if (!props.modelValue) {
    return;
  }
  if (event.key === "Escape") {
    event.preventDefault();
    closeDialog();
    return;
  }
  if (event.key === "Tab") {
    trapFocus(event);
  }
}

/**
 * 获取弹窗内所有可聚焦元素（按 DOM 顺序）。
 * @returns {HTMLElement[]}
 */
function getFocusableElements() {
  if (!panelRef.value) {
    return [];
  }
  const selector = [
    "button:not([disabled])",
    "[href]",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "[tabindex]:not([tabindex='-1'])"
  ].join(",");
  return Array.from(panelRef.value.querySelectorAll(selector)).filter((node) => !node.hasAttribute("aria-hidden"));
}

/**
 * 打开弹窗后优先聚焦首个可交互元素，缺失时回退到弹窗容器。
 */
function focusFirstInteractiveElement() {
  const focusables = getFocusableElements();
  if (focusables.length > 0) {
    focusables[0].focus();
    return;
  }
  closeButtonRef.value?.focus();
  panelRef.value?.focus();
}

/**
 * 在弹窗内进行 Tab 循环，形成焦点陷阱。
 * @param {KeyboardEvent} event 键盘事件对象。
 */
function trapFocus(event) {
  const focusables = getFocusableElements();
  if (focusables.length === 0) {
    event.preventDefault();
    panelRef.value?.focus();
    return;
  }
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  const active = document.activeElement;

  if (event.shiftKey) {
    if (active === first || !panelRef.value?.contains(active)) {
      event.preventDefault();
      last.focus();
    }
    return;
  }

  if (active === last) {
    event.preventDefault();
    first.focus();
  }
}

/**
 * 关闭后恢复焦点到触发源，避免键盘用户丢失上下文。
 */
function restoreFocusToTrigger() {
  const target = lastActiveElement.value;
  if (target && typeof target.focus === "function") {
    target.focus();
  }
  lastActiveElement.value = null;
}

/**
 * 根据弹窗状态切换 body 滚动锁，避免背景页面滚动穿透。
 * @param {boolean} visible 当前弹窗可见状态。
 */
function toggleBodyScrollLock(visible) {
  document.body.style.overflow = visible ? "hidden" : "";
}

onMounted(() => {
  window.addEventListener("keydown", handleKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleKeydown);
  toggleBodyScrollLock(false);
  restoreFocusToTrigger();
});

watch(
  () => props.modelValue,
  (visible) => {
    toggleBodyScrollLock(visible);
    if (visible) {
      lastActiveElement.value = document.activeElement;
      nextTick(() => {
        focusFirstInteractiveElement();
      });
      return;
    }
    nextTick(() => {
      restoreFocusToTrigger();
    });
  },
  { immediate: true }
);
</script>

<style scoped>
.dialog-mask {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 16px;
  background: var(--dialog-mask-bg);
  z-index: 50;
  animation: fade-in var(--duration-slow) var(--ease-glass) both;
}

.dialog-panel {
  width: min(760px, 100%);
  max-height: min(82dvh, 860px);
  border-radius: var(--radius-4xl);
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  animation: glass-emerge var(--duration-slow) var(--ease-glass) both;
}

.dialog-panel-fullscreen {
  width: calc(100dvw - 32px);
  height: calc(100dvh - 32px);
  max-height: none;
  border-radius: var(--radius-xl);
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.dialog-close {
  min-width: 0;
  font-size: 16px;
  line-height: 1;
}

.dialog-body {
  /* 允许全屏弹窗把剩余空间分配给内容区，供内部组件做 1fr 高度布局。 */
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.dialog-body-fullscreen {
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>
