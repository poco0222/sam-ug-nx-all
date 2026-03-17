<!--
  @file BaseButton.vue
  @description 基础按钮组件，统一模板风格按钮样式。
  @author Codex
  @date 2026-02-27
-->
<template>
  <button
    type="button"
    :class="['base-button', buttonClass]"
    :disabled="disabled"
    @click="$emit('click', $event)"
  >
    <slot />
  </button>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  disabled: {
    type: Boolean,
    default: false
  },
  variant: {
    type: String,
    default: "default"
  },
  size: {
    type: String,
    default: "md"
  },
  shape: {
    type: String,
    default: "rounded"
  },
  iconOnly: {
    type: Boolean,
    default: false
  }
});

defineEmits(["click"]);

/**
 * 根据按钮类型映射模板样式类。
 */
const buttonClass = computed(() => {
  const classList = [];

  // 按页面业务语义映射按钮颜色类型，仅改变颜色，不改变尺寸与布局结构。
  if (props.variant === "primary") {
    classList.push("glass-btn-primary", "control-glass");
  } else if (props.variant === "success") {
    classList.push("glass-btn-success", "control-glass");
  } else if (props.variant === "warning") {
    classList.push("glass-btn-warning", "control-glass");
  } else if (props.variant === "danger") {
    classList.push("glass-btn-danger", "control-glass");
  } else if (props.variant === "ghost") {
    classList.push("glass-btn-ghost");
  } else {
    classList.push("glass-btn", "control-glass");
  }

  // 按 DishVision 规范映射尺寸。
  if (props.size === "sm") {
    classList.push("btn-size-sm");
  } else if (props.size === "lg") {
    classList.push("btn-size-lg");
  } else {
    classList.push("btn-size-md");
  }

  // 统一圆角语义：普通圆角、胶囊、圆形。
  if (props.shape === "circle") {
    classList.push("btn-shape-circle");
  } else if (props.shape === "pill") {
    classList.push("btn-shape-pill");
  } else {
    classList.push("btn-shape-rounded");
  }

  // 图标按钮收敛为等宽高尺寸，避免文本按钮尺寸策略影响。
  if (props.iconOnly) {
    classList.push("btn-icon-only");
  }

  return classList;
});
</script>

<style scoped>
.base-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  line-height: 1;
  white-space: nowrap;
  position: relative;
  overflow: hidden;
  isolation: isolate;
}

.base-button::after {
  content: “”;
  position: absolute;
  inset: 1px;
  border-radius: inherit;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.24), transparent 60%);
  pointer-events: none;
  z-index: -1;
}

.btn-size-sm {
  min-height: var(--liquid-control-height-sm, var(--liquid-control-height));
  padding: 0 var(--liquid-control-padding-sm, 10px);
  font-size: var(--liquid-control-font-size-sm, 13px);
}

.btn-size-md {
  min-height: var(--liquid-control-height);
  padding: 0 var(--liquid-control-padding-md, 14px);
  font-size: var(--liquid-control-font-size-md, 13px);
}

.btn-size-lg {
  min-height: var(--liquid-control-height-lg, calc(var(--liquid-control-height) + 6px));
  padding: 0 var(--liquid-control-padding-lg, 22px);
  font-size: var(--liquid-control-font-size-lg, 15px);
}

.btn-shape-rounded {
  border-radius: var(--radius-lg);
}

.btn-shape-pill {
  border-radius: var(--liquid-radius-pill);
}

.btn-shape-circle {
  border-radius: var(--liquid-radius-pill);
  aspect-ratio: 1 / 1;
  padding: 0;
}

.btn-icon-only {
  width: var(--liquid-control-height);
  padding: 0 !important;
}

.btn-size-sm.btn-icon-only {
  width: var(--liquid-control-height-sm, var(--liquid-control-height));
}

.btn-size-md.btn-icon-only {
  width: var(--liquid-control-height);
}

.btn-size-lg.btn-icon-only {
  width: var(--liquid-control-height-lg, calc(var(--liquid-control-height) + 6px));
}
</style>
