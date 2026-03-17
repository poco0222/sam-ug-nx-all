<!--
  @file pars-craft-template.vue
  @description 工艺模板匹配弹窗内容，迁移自 Vue2 pars_craft_template。
  @author Codex
  @date 2026-02-28
-->
<template>
  <section class="template-match-panel">
    <div class="template-form-grid">
      <label class="template-form-item">
        <span>模板名称</span>
        <BaseSelect v-model="queryForm.id" :options="templateOptions" filterable @change="handleTemplateChange" />
      </label>
      <label class="template-form-item">
        <span>编制人</span>
        <BaseInput :model-value="queryForm.createBy" readonly />
      </label>
      <label class="template-form-item">
        <span>编制时间</span>
        <BaseInput :model-value="queryForm.createTime" readonly />
      </label>
      <label class="template-form-item template-form-item-wide">
        <span>模板说明</span>
        <BaseInput :model-value="queryForm.templateRemark" readonly multiline :rows="2" />
      </label>
    </div>

    <p v-if="errorText" class="app-error-tip">{{ errorText }}</p>

    <div class="template-content-grid">
      <section class="template-grid-col">
        <div class="template-grid-header">
          <h4 class="text-title">零件类型</h4>
          <p class="text-caption">{{ partTypeLoading ? "加载中..." : `共 ${partTypeList.length} 条` }}</p>
        </div>
        <BaseTable
          :key="`part-type-${dictRenderVersion}`"
          :columns="partTypeColumns"
          :data="partTypeList"
          :row-key="partTypeRowKey"
          :row-class-name="partTypeRowClassName"
          @row-click="handlePartTypeClick"
        />
      </section>
      <section class="template-grid-col">
        <div class="template-grid-header">
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
      <BaseButton size="sm" variant="primary" :disabled="!queryForm.id" @click="handleConfirm">确定</BaseButton>
      <BaseButton size="sm" @click="handleCancel">取消</BaseButton>
    </div>
  </section>
</template>

<script setup>
/**
 * @description 工艺模板匹配逻辑：模板选择 -> 零件类型 -> 工艺预览 -> 回传模板 ID。
 */
import { computed, onMounted, reactive, ref } from "vue";

import BaseButton from "@/components/base/BaseButton.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import BaseSelect from "@/components/base/BaseSelect.vue";
import BaseTable from "@/components/base/BaseTable.vue";
import { buildDictLabelMapFromResponse, formatDictLabel } from "@/pages/parts-order/utils/dict-format";
import { normalizeListResponse } from "@/pages/parts-order/utils/list-response";
import { getDictByType } from "@/services/api/dict";
import { getCraftListByPartId, getListByNodeId } from "@/services/api/samMoldCraftTemplate";
import { getTemplateList } from "@/services/api/samMesPartsOrder";

const emit = defineEmits(["confirm", "cancel"]);
/** 零件类型字典编码（与 Vue2 getDicts('mould_part_category') 对齐）。 */
const partCategoryDictType = "mould_part_category";
/** 零件类型字典回退映射，字典请求失败时兜底。 */
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

/** 模板查询表单。 */
const queryForm = reactive({
  id: null,
  createBy: "",
  createTime: "",
  templateRemark: ""
});
/** 模板下拉数据。 */
const templateList = ref([]);
/** 零件类型列表。 */
const partTypeList = ref([]);
/** 工艺列表。 */
const craftList = ref([]);
/** 当前选中的零件类型主键。 */
const selectedPartTypeId = ref(null);
/** 错误提示。 */
const errorText = ref("");
/** 零件类型加载状态。 */
const partTypeLoading = ref(false);
/** 工艺加载状态。 */
const craftLoading = ref(false);
/** 零件类型字典标签映射。 */
const partCategoryDictMap = ref({ ...partCategoryFallbackMap });
/** 字典渲染版本号，确保异步字典回填后表格重新渲染。 */
const dictRenderVersion = ref(0);

const templateOptions = computed(() => {
  return templateList.value.map((item) => ({
    label: item.templateName ?? "-",
    value: item.id
  }));
});

/** 模板零件类型列定义。 */
const partTypeColumns = [
  { key: "req", title: "排序", width: "50px", align: "center", formatter: (row) => row.req ?? "-" },
  { key: "partCategory", title: "零件类型", width: "110px", formatter: (row) => formatPartCategory(row.partCategory) },
  { key: "moldPartTypeName", title: "零件名称", width: "150px", formatter: (row) => row.moldPartTypeName ?? "-" },
  { key: "remark", title: "备注", width: "130px", formatter: (row) => row.remark ?? "-" }
];

/** 模板工艺列定义。 */
const craftColumns = [
  { key: "req", title: "排序", width: "50px", align: "center", formatter: (row, index) => row.req ?? index + 1 },
  { key: "standardCraftName", title: "工艺名称", width: "140px", formatter: (row) => row.standardCraftName ?? "-" },
  { key: "standardCraftCode", title: "工艺编号", width: "120px", formatter: (row) => row.standardCraftCode ?? "-" },
  { key: "craftContent", title: "工艺内容", width: "180px", formatter: (row) => row.craftContent ?? "-" },
  { key: "specialRequirement", title: "特殊性要求", width: "150px", formatter: (row) => row.specialRequirement ?? "-" },
  { key: "remark", title: "备注", width: "120px", formatter: (row) => row.remark ?? "-" }
];

onMounted(async () => {
  await Promise.all([loadTemplateList(), loadPartCategoryDict()]);
});

/**
 * 加载零件类型字典映射，确保与原 Vue2 字典翻译行为一致。
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
    console.warn("[pars-craft-template] 零件类型字典加载失败", error);
  }
}

/**
 * 获取模板下拉数据。
 */
async function loadTemplateList() {
  errorText.value = "";
  try {
    const response = await getTemplateList();
    templateList.value = normalizeListResponse(response);
  } catch (error) {
    errorText.value = `加载模板失败: ${error}`;
  }
}

/**
 * 变更模板后回填基础信息并加载零件类型列表。
 * @param {number|string|null} value 模板主键。
 */
async function handleTemplateChange(value) {
  errorText.value = "";
  selectedPartTypeId.value = null;
  partTypeList.value = [];
  craftList.value = [];

  if (!value) {
    resetFormMeta();
    return;
  }

  const matchedTemplate = templateList.value.find((item) => item.id === value);
  queryForm.createBy = matchedTemplate?.createBy ?? "";
  queryForm.createTime = matchedTemplate?.createTime ?? "";
  queryForm.templateRemark = matchedTemplate?.templateRemark ?? "";
  await loadPartTypeList(value);
}

/**
 * 加载模板零件类型数据。
 * @param {number|string} templateId 模板主键。
 */
async function loadPartTypeList(templateId) {
  partTypeLoading.value = true;
  try {
    const response = await getListByNodeId(templateId);
    partTypeList.value = normalizeListResponse(response);
  } catch (error) {
    errorText.value = `加载零件类型失败: ${error}`;
  } finally {
    partTypeLoading.value = false;
  }
}

/**
 * 点击零件类型后加载对应工艺列表。
 * @param {object} row 零件类型行。
 */
async function handlePartTypeClick(row) {
  const rowId = row?.id ?? null;
  selectedPartTypeId.value = rowId;
  craftList.value = [];

  if (!rowId) {
    return;
  }

  craftLoading.value = true;
  errorText.value = "";
  try {
    const response = await getCraftListByPartId(rowId);
    craftList.value = normalizeListResponse(response);
  } catch (error) {
    errorText.value = `加载模板工艺失败: ${error}`;
  } finally {
    craftLoading.value = false;
  }
}

/**
 * 回传模板确认事件。
 */
function handleConfirm() {
  if (!queryForm.id) {
    errorText.value = "请选择模板";
    return;
  }
  emit("confirm", { templateId: queryForm.id });
}

/**
 * 回传取消事件并复位界面数据。
 */
function handleCancel() {
  resetAll();
  emit("cancel");
}

/**
 * 根据零件类型主键设置行高亮类。
 * @param {object} row 行数据。
 * @returns {string}
 */
function partTypeRowClassName(row) {
  return row?.id === selectedPartTypeId.value ? "app-row-selected" : "";
}

/**
 * 零件类型行主键解析。
 * @param {object} row 行数据。
 * @param {number} index 行索引。
 * @returns {number|string}
 */
function partTypeRowKey(row, index) {
  return row?.id ?? index;
}

/**
 * 工艺行主键解析。
 * @param {object} row 行数据。
 * @param {number} index 行索引。
 * @returns {number|string}
 */
function craftRowKey(row, index) {
  return row?.id ?? `${row?.standardCraftCode ?? "craft"}-${index}`;
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
 * 复位模板基础字段。
 */
function resetFormMeta() {
  queryForm.createBy = "";
  queryForm.createTime = "";
  queryForm.templateRemark = "";
}

/**
 * 复位组件完整状态，供父页关闭弹窗后重用。
 */
function resetAll() {
  queryForm.id = null;
  resetFormMeta();
  partTypeList.value = [];
  craftList.value = [];
  selectedPartTypeId.value = null;
  errorText.value = "";
}
</script>

<style scoped>
.template-match-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  height: 100%;
  max-height: 100%;
  overflow: hidden;
}

.template-form-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  flex-shrink: 0;
}

.template-form-item {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.template-form-item > span {
  font-size: 12px;
}

.template-form-item-wide {
  grid-column: 1 / -1;
}

.template-content-grid {
  display: grid;
  /* 左侧零件类型更窄，右侧工艺列表更宽。 */
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.5fr);
  gap: 8px;
  min-height: 0;
  flex: 1;
  overflow: hidden;
}

.template-grid-col {
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 6px;
  min-height: 0;
  overflow: hidden;
}

/* 让 BaseTable 在列布局中占满剩余高度，滚动由 table-wrap 承担。 */
.template-grid-col :deep(.table-card) {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.template-grid-col :deep(.table-wrap) {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.template-grid-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
}

.template-grid-header .text-title {
  margin: 0;
  font-size: 13px;
}

.template-grid-header .text-caption {
  margin: 0;
}

@media (max-width: 980px) {
  .template-form-grid {
    grid-template-columns: 1fr;
  }

  .template-content-grid {
    grid-template-columns: 1fr;
  }
}
</style>
