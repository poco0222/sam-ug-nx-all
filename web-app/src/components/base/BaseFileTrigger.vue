<!--
  @file BaseFileTrigger.vue
  @description 基础文件选择触发器，隐藏原生文件输入控件并统一为玻璃按钮。
  @author Codex
  @date 2026-02-27
-->
<template>
  <div class="file-trigger-wrap">
    <input
      ref="nativeFileInputRef"
      class="file-trigger-native"
      type="file"
      :accept="accept"
      :multiple="multiple"
      :disabled="disabled"
      @change="handleNativeFileChange"
    />
    <BaseButton
      class="file-trigger-btn"
      size="sm"
      shape="pill"
      :variant="variant"
      :disabled="disabled"
      @click="openNativeFileDialog"
    >
      {{ buttonText }}
    </BaseButton>
  </div>
</template>

<script setup>
import { ref } from "vue";
import BaseButton from "@/components/base/BaseButton.vue";

const props = defineProps({
  accept: {
    type: String,
    default: ""
  },
  multiple: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  variant: {
    type: String,
    default: "default"
  },
  buttonText: {
    type: String,
    default: "选择文件"
  }
});

const emit = defineEmits(["change"]);
const nativeFileInputRef = ref(null);

/**
 * 打开原生文件选择框，兼容键盘与鼠标触发。
 */
function openNativeFileDialog() {
  if (props.disabled || !nativeFileInputRef.value) {
    return;
  }
  nativeFileInputRef.value.click();
}

/**
 * 转换文件列表并上抛到父组件，保持业务层 API 不变。
 * @param {Event} event 原生 input change 事件。
 */
function handleNativeFileChange(event) {
  const fileList = Array.from(event.target.files ?? []);
  emit("change", fileList);

  // 清空原生值，允许重复选择同名文件也能触发 change。
  event.target.value = "";
}
</script>

<style scoped>
.file-trigger-wrap {
  display: inline-flex;
  align-items: center;
}

.file-trigger-native {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.file-trigger-btn {
  font-size: 12px;
  min-width: 120px;
}
</style>
