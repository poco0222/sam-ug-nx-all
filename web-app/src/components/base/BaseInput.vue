<!--
  @file BaseInput.vue
  @description 基础输入组件，统一输入框风格与双向绑定行为。
  @author Codex
  @date 2026-02-27
-->
<template>
  <div class="input-wrap">
    <label v-if="label" :for="inputId" class="text-caption input-label">
      {{ label }}
    </label>
    <textarea
      v-if="multiline"
      :id="inputId"
      class="glass-input control-glass input-core input-multiline"
      :class="{ 'input-error': !!error }"
      :placeholder="placeholder"
      :value="modelValue"
      :rows="rows"
      :readonly="readonly"
      :disabled="disabled"
      :aria-invalid="!!error"
      :aria-describedby="describedBy"
      @input="$emit('update:modelValue', $event.target.value)"
      @blur="$emit('blur', $event)"
    />
    <input
      v-else
      :id="inputId"
      class="glass-input control-glass input-core"
      :class="{ 'input-error': !!error }"
      :placeholder="placeholder"
      :type="type"
      :value="modelValue"
      :readonly="readonly"
      :disabled="disabled"
      :aria-invalid="!!error"
      :aria-describedby="describedBy"
      @input="$emit('update:modelValue', $event.target.value)"
      @blur="$emit('blur', $event)"
    />
    <p v-if="error" :id="`${inputId}-error`" class="text-caption input-error-text">
      {{ error }}
    </p>
    <p v-else-if="hint" :id="`${inputId}-hint`" class="text-caption">
      {{ hint }}
    </p>
  </div>
</template>

<script setup>
import { computed } from "vue";

/** 组件实例级自增序号，保证未传 id 时也唯一。 */
let baseInputAutoId = 0;

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: ""
  },
  placeholder: {
    type: String,
    default: ""
  },
  type: {
    type: String,
    default: "text"
  },
  id: {
    type: String,
    default: ""
  },
  label: {
    type: String,
    default: ""
  },
  hint: {
    type: String,
    default: ""
  },
  error: {
    type: String,
    default: ""
  },
  readonly: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  multiline: {
    type: Boolean,
    default: false
  },
  rows: {
    type: Number,
    default: 4
  }
});

defineEmits(["update:modelValue", "blur"]);

const autoId = `base-input-${++baseInputAutoId}`;

/**
 * 生成输入框 ID，用于 label 与辅助文本语义关联。
 */
const inputId = computed(() => {
  if (props.id) {
    return props.id;
  }
  if (props.label) {
    return props.label.replace(/\s+/g, "-").toLowerCase();
  }
  return autoId;
});

/**
 * 生成 aria-describedby 关联，提升可访问性一致性。
 */
const describedBy = computed(() => {
  if (props.error) {
    return `${inputId.value}-error`;
  }
  if (props.hint) {
    return `${inputId.value}-hint`;
  }
  return undefined;
});
</script>

<style scoped>
.input-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.input-label {
  font-weight: 500;
}

.input-core {
  width: 100%;
  min-height: var(--liquid-control-height);
  padding-inline: var(--liquid-control-padding-md, 14px);
  font-size: var(--liquid-control-font-size-md, 13px);
  transition:
    border-color var(--duration-fast) var(--ease-glass),
    box-shadow var(--duration-fast) var(--ease-glass),
    background-color var(--duration-fast) var(--ease-glass);
}

.input-core:disabled {
  opacity: 0.58;
  cursor: not-allowed;
}

.input-multiline {
  min-height: calc(var(--liquid-control-height) * 2.4);
  padding: var(--liquid-control-padding-multiline-y, 10px) var(--liquid-control-padding-multiline-x, 12px);
  line-height: 1.4;
  resize: vertical;
}

.input-error {
  border-color: var(--destructive);
}

.input-error-text {
  color: var(--destructive);
}
</style>
