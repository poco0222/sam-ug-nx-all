<!--
  @file history-tem.vue
  @description 历史模板匹配弹窗内容，迁移自 Vue2 history_tem。
  @author Codex
  @date 2026-02-28
-->
<template>
  <section class="history-template-panel">
    <div class="history-form-grid">
      <label class="history-form-item">
        <span>模具号</span>
        <BaseInput v-model="queryForm.moldCode" @blur="handleMoldCodeBlur" />
      </label>
      <label class="history-form-item">
        <span>制造令号</span>
        <BaseSelect v-model="queryForm.mouldMakeOrder" :options="mouldMakeOrderOptions" filterable />
      </label>
      <label class="history-form-item">
        <span>引用工时</span>
        <BaseSelect v-model="queryForm.isReference" :options="referenceOptions" filterable />
      </label>
      <div class="history-form-item history-form-item-action">
        <BaseButton size="sm" variant="primary" :disabled="!queryForm.mouldMakeOrder" @click="generateHistoryTemplate">生成模板</BaseButton>
      </div>
    </div>

    <p v-if="errorText" class="app-error-tip">{{ errorText }}</p>

    <div class="history-content-grid">
      <section class="history-grid-col">
        <div class="history-grid-header">
          <h4 class="text-title">零件类型</h4>
          <p class="text-caption">{{ partTypeLoading ? "加载中..." : `共 ${partTypeList.length} 条` }}</p>
        </div>
        <BaseTable
          :key="`history-part-type-${dictRenderVersion}`"
          :columns="partTypeColumns"
          :data="partTypeList"
          :row-key="partTypeRowKey"
          :row-class-name="partTypeRowClassName"
          @row-click="handlePartTypeClick"
        />
      </section>
      <section class="history-grid-col">
        <div class="history-grid-header">
          <h4 class="text-title">工艺列表</h4>
          <p class="text-caption">{{ craftLoading ? "加载中..." : `共 ${craftList.length} 条` }}</p>
        </div>
        <BaseTable
          :columns="craftColumns"
          :data="craftList"
          :clickable="false"
          :row-key="craftRowKey"
        />
      </section>
    </div>

    <div class="app-dialog-actions">
      <BaseButton size="sm" variant="primary" :disabled="!queryForm.mouldMakeOrder" @click="handleConfirm">确定</BaseButton>
      <BaseButton size="sm" @click="handleCancel">取消</BaseButton>
    </div>
  </section>
</template>

<script setup>
/**
 * @description 历史模板匹配逻辑：模具号查制令号 -> 生成历史模板 -> 选择零件预览工艺 -> 回传参数。
 */
import { computed, onMounted, reactive, ref } from "vue";

import BaseButton from "@/components/base/BaseButton.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import BaseSelect from "@/components/base/BaseSelect.vue";
import BaseTable from "@/components/base/BaseTable.vue";
import { buildDictLabelMapFromResponse, formatDictLabel } from "@/pages/parts-order/utils/dict-format";
import { normalizeListResponse } from "@/pages/parts-order/utils/list-response";
import { getDictByType } from "@/services/api/dict";
import { getHistoryTem } from "@/services/api/samMoldCraftTemplate";
import { getMouldMakeOrderByMoldCode } from "@/services/api/samMesPartsOrder";

const emit = defineEmits(["confirm", "cancel"]);
/** 零件类型字典编码（与 Vue2 getDicts('mould_part_category') 对齐）。 */
const partCategoryDictType = "mould_part_category";
/** 零件类型字典回退映射。 */
const partCategoryFallbackMap = Object.freeze({
  "0": "锻件",
  "1": "标准件",
  "2": "非标件",
  "3": "附图订购件",
  "4": "厂标件",
  "5": "铸铁件",
  "6": "铸钢件",
  "7": "电气配件",
  "8": "现场配做件",
  "9": "埋入件",
  "11": "锻件坯料",
  "12": "铸铁件坯料",
  "13": "实型",
  "14": "铸钢件坯料",
  "15": "钢板件"
});

/** 历史模板查询表单。 */
const queryForm = reactive({
  moldCode: "",
  mouldMakeOrder: "",
  isReference: ""
});
/** 制造令号下拉数据。 */
const mouldMakeOrderList = ref([]);
/** 历史模板返回的零件类型列表。 */
const partTypeList = ref([]);
/** 历史模板返回的完整工艺列表。 */
const craftSourceList = ref([]);
/** 当前零件筛选后的工艺列表。 */
const craftList = ref([]);
/** 当前选中的零件主键。 */
const selectedPartId = ref(null);
/** 错误信息。 */
const errorText = ref("");
/** 零件列表加载状态。 */
const partTypeLoading = ref(false);
/** 工艺列表加载状态。 */
const craftLoading = ref(false);
/** 零件类型字典标签映射。 */
const partCategoryDictMap = ref({ ...partCategoryFallbackMap });
/** 字典渲染版本号，确保异步字典回填后表格重新渲染。 */
const dictRenderVersion = ref(0);

const referenceOptions = [
  { label: "是", value: "1" },
  { label: "否", value: "2" }
];

const mouldMakeOrderOptions = computed(() => {
  return mouldMakeOrderList.value.map((item) => ({
    label: item.moldOrderNum ?? "-",
    value: item.moldOrderNum
  }));
});

/** 历史模板零件列定义。 */
const partTypeColumns = [
  { key: "seq", title: "排序", width: "50px", align: "center", formatter: (_, index) => index + 1 },
  { key: "partCategory", title: "零件类型", width: "110px", formatter: (row) => formatPartCategory(row.partCategory) },
  { key: "pname", title: "零件名称", width: "150px", formatter: (row) => row.pname ?? row.moldPartTypeName ?? "-" },
  { key: "remark", title: "备注", width: "130px", formatter: (row) => row.remark ?? "-" }
];

/** 历史模板工艺列定义。 */
const craftColumns = [
  { key: "duration", title: "排序", width: "50px", align: "center", formatter: (row, index) => row.duration ?? index + 1 },
  { key: "craftName", title: "工艺名称", width: "140px", formatter: (row) => row.craftName ?? "-" },
  { key: "craftCode", title: "工艺编号", width: "120px", formatter: (row) => row.craftCode ?? "-" },
  { key: "craftContent", title: "工艺内容", width: "180px", formatter: (row) => row.craftContent ?? "-" },
  { key: "specialRequirement", title: "特殊性要求", width: "150px", formatter: (row) => row.specialRequirement ?? "-" },
  { key: "remark", title: "备注", width: "120px", formatter: (row) => row.remark ?? "-" }
];

onMounted(async () => {
  queryForm.isReference = "";
  await loadPartCategoryDict();
});

/**
 * 加载零件类型字典映射，保持与原 Vue2 页面一致的翻译来源。
 */
async function loadPartCategoryDict() {
  try {
    const response = await getDictByType(partCategoryDictType);
    partCategoryDictMap.value = buildDictLabelMapFromResponse(response, partCategoryFallbackMap);
    dictRenderVersion.value += 1;
  } catch (error) {
    partCategoryDictMap.value = { ...partCategoryFallbackMap };
    dictRenderVersion.value += 1;
    if (!errorText.value) {
      errorText.value = "零件类型字典加载失败，当前使用内置回退映射";
    }
    console.warn("[history-tem] 零件类型字典加载失败", error);
  }
}

/**
 * 输入模具号后拉取制造令号列表。
 */
async function handleMoldCodeBlur() {
  queryForm.mouldMakeOrder = "";
  mouldMakeOrderList.value = [];
  errorText.value = "";

  const moldCode = String(queryForm.moldCode ?? "").trim();
  if (!moldCode) {
    return;
  }

  try {
    const response = await getMouldMakeOrderByMoldCode(moldCode);
    mouldMakeOrderList.value = normalizeListResponse(response);
  } catch (error) {
    errorText.value = `查询制造令号失败: ${error}`;
  }
}

/**
 * 根据制造令号生成历史模板数据。
 */
async function generateHistoryTemplate() {
  if (!queryForm.mouldMakeOrder) {
    errorText.value = "请选择制造令号";
    return;
  }

  partTypeLoading.value = true;
  craftLoading.value = true;
  errorText.value = "";
  selectedPartId.value = null;
  craftList.value = [];

  try {
    const response = await getHistoryTem(queryForm.mouldMakeOrder);
    const payload = response?.data ?? {};
    partTypeList.value = Array.isArray(payload.part) ? payload.part : [];
    craftSourceList.value = Array.isArray(payload.craft) ? payload.craft : [];
  } catch (error) {
    errorText.value = `生成历史模板失败: ${error}`;
  } finally {
    partTypeLoading.value = false;
    craftLoading.value = false;
  }
}

/**
 * 点击零件后筛选其对应工艺。
 * @param {object} row 零件行数据。
 */
function handlePartTypeClick(row) {
  const partId = row?.id ?? null;
  selectedPartId.value = partId;
  craftLoading.value = true;

  // 使用 partId 精准筛选，兼容后端历史模板返回结构。
  craftList.value = craftSourceList.value.filter((item) => item.partId === partId);
  craftLoading.value = false;
}

/**
 * 回传历史模板确认事件。
 */
function handleConfirm() {
  if (!queryForm.isReference) {
    errorText.value = "请选择是否引用工时";
    return;
  }
  if (!queryForm.mouldMakeOrder) {
    errorText.value = "请选择制造令号";
    return;
  }
  emit("confirm", {
    mouldMakeOrder: queryForm.mouldMakeOrder,
    isReference: queryForm.isReference
  });
}

/**
 * 取消并复位界面状态。
 */
function handleCancel() {
  resetAll();
  emit("cancel");
}

/**
 * 零件行高亮样式。
 * @param {object} row 行数据。
 * @returns {string}
 */
function partTypeRowClassName(row) {
  return row?.id === selectedPartId.value ? "app-row-selected" : "";
}

/**
 * 零件行主键。
 * @param {object} row 行数据。
 * @param {number} index 行索引。
 * @returns {number|string}
 */
function partTypeRowKey(row, index) {
  return row?.id ?? index;
}

/**
 * 工艺行主键。
 * @param {object} row 行数据。
 * @param {number} index 行索引。
 * @returns {number|string}
 */
function craftRowKey(row, index) {
  return row?.id ?? `${row?.craftCode ?? "craft"}-${index}`;
}

/**
 * 零件类型字典格式化。
 * @param {number|string|null|undefined} value 类型编码。
 * @returns {string}
 */
function formatPartCategory(value) {
  return formatDictLabel(value, partCategoryDictMap.value, partCategoryFallbackMap);
}

/**
 * 复位组件完整状态。
 */
function resetAll() {
  queryForm.moldCode = "";
  queryForm.mouldMakeOrder = "";
  queryForm.isReference = "";
  mouldMakeOrderList.value = [];
  partTypeList.value = [];
  craftSourceList.value = [];
  craftList.value = [];
  selectedPartId.value = null;
  errorText.value = "";
}
</script>

<style scoped>
.history-template-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  height: 100%;
  max-height: 100%;
  overflow: hidden;
}

.history-form-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  flex-shrink: 0;
}

.history-form-item {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.history-form-item > span {
  font-size: 12px;
}

.history-form-item-action {
  display: flex;
  align-items: end;
}

.history-content-grid {
  display: grid;
  /* 左侧零件类型更窄，右侧工艺列表更宽。 */
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.5fr);
  gap: 8px;
  min-height: 0;
  flex: 1;
  overflow: hidden;
}

.history-grid-col {
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 6px;
  min-height: 0;
  overflow: hidden;
}

/* 让 BaseTable 在列布局中占满剩余高度，滚动由 table-wrap 承担。 */
.history-grid-col :deep(.table-card) {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.history-grid-col :deep(.table-wrap) {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.history-grid-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
}

.history-grid-header .text-title {
  margin: 0;
  font-size: 13px;
}

.history-grid-header .text-caption {
  margin: 0;
}

@media (max-width: 980px) {
  .history-form-grid {
    grid-template-columns: 1fr;
  }

  .history-form-item-action {
    align-items: stretch;
  }

  .history-content-grid {
    grid-template-columns: 1fr;
  }
}
</style>
