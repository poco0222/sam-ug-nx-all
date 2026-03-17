<!--
  @file index.vue
  @description 零件工单主页面（Vue3 实现版，不包含左侧树）。
  @author Codex
  @date 2026-02-27
-->
<template>
  <section ref="pageRootRef" class="parts-order-page app-page app-page-fluid">
    <section class="liquid-command-bar" :class="{ 'is-condensed': isCommandBarCondensed }">
      <div class="liquid-command-meta app-command-meta-inline">
        <h1 class="liquid-command-title">零件工单</h1>
        <label class="command-compiler-field">
          <span class="text-caption">制造令号</span>
          <BaseInput v-model="moldOrderNum" :disabled="isCommandInputsLocked" placeholder="等待宿主传入" />
        </label>
        <label class="command-compiler-field">
          <span class="text-caption">零件名称</span>
          <BaseInput v-model="bomName" :disabled="isCommandInputsLocked" placeholder="等待宿主传入" />
        </label>
      </div>
      <div class="liquid-toolbar-group" role="group" aria-label="页面控制区">
        <div class="liquid-toolbar-cluster liquid-toolbar-cluster-main liquid-command-controls" role="group" aria-label="编制人控制">
          <label class="command-compiler-field">
            <span class="text-caption">当前编制人</span>
            <BaseSelect
              v-model="compilerDraftValue"
              :options="compilerOptions"
              :disabled="compilerOptions.length === 0"
              filterable
              @change="handleCompilerChange"
            />
          </label>
        </div>
      </div>
    </section>

    <p v-if="store.error" class="app-error-tip">{{ store.error }}</p>

    <section class="app-content-grid app-content-grid-2x2-left">
      <article class="surface-content liquid-panel app-panel app-panel-part-list animate-glass-emerge">
        <div class="app-panel-header">
          <div>
            <h2 class="text-title">零件列表</h2>
          </div>
          <div class="app-header-actions app-header-actions-inline">
            <div class="app-action-group">
              <BaseButton size="sm" variant="primary" @click="handlePartListRefresh">刷新</BaseButton>
              <BaseButton size="sm" variant="primary" :disabled="store.selectedParts.length !== 1" @click="openUploadDialog = true">上传图片</BaseButton>
              <BaseButton size="sm" variant="success" :disabled="store.selectedParts.length === 0" @click="handleReleasePartOrder">发布</BaseButton>
            </div>
            <div class="app-action-group">
              <BaseButton size="sm" variant="primary" :disabled="store.selectedParts.length === 0" @click="openTemplateDialog = true">匹配工艺模板</BaseButton>
              <BaseButton size="sm" variant="primary" :disabled="store.selectedParts.length === 0" @click="openHistoryDialog = true">匹配历史模板</BaseButton>
            </div>
          </div>
        </div>
        <BaseTable
          :key="`part-${dictRenderVersion}`"
          :columns="partColumns"
          :data="store.parts"
          :row-key="partRowKey"
          :row-style="legacyTableStyleConfig.rowStyle"
          :cell-style="legacyTableStyleConfig.cellStyle"
          :header-row-style="legacyTableStyleConfig.headerRowStyle"
          :header-cell-style="legacyTableStyleConfig.headerCellStyle"
          :row-class-name="partRowClassName"
          @row-click="handlePartClick"
        >
          <template #part-select-header>
            <BaseCheckbox
              context="table"
              :model-value="isAllPartSelected"
              :indeterminate="isPartSelectionIndeterminate"
              :disabled="selectablePartRows.length === 0"
              @click.stop
              @update:model-value="toggleAllPartSelection"
            />
          </template>
          <template #part-select="{ row }">
            <BaseCheckbox
              context="table"
              :model-value="isSelectedPart(row)"
              @click.stop
              @update:model-value="togglePartSelection(row, $event)"
            />
          </template>
        </BaseTable>
      </article>

      <article class="surface-content liquid-panel app-panel app-panel-part-params app-panel-muted animate-glass-emerge stagger-1">
        <div class="app-panel-header">
          <h2 class="text-title">零件参数</h2>
          <div class="app-header-actions app-header-actions-inline app-part-param-actions">
            <BaseButton
              v-if="isHostContextMode"
              size="sm"
              variant="primary"
              :disabled="isApplyUgParamsDisabled"
              @click="handleApplyUgParams"
            >
              引用UG参数
            </BaseButton>
            <BaseButton size="sm" variant="primary" :disabled="isSavePartParamsDisabled" @click="submitChangeParams">保存参数</BaseButton>
          </div>
        </div>
        <p v-if="partParamDiffModel.stats.ipcOnly > 0" class="app-part-param-warning text-caption">
          未匹配UG参数 {{ partParamDiffModel.stats.ipcOnly }} 项：{{ unmatchedIpcParamCodesText }}
        </p>
        <BaseTable
          :columns="partParamColumns"
          :data="store.paramsList"
          :row-key="paramRowKey"
          :row-class-name="partParamRowClassName"
          :row-style="legacyTableStyleConfig.rowStyle"
          :cell-class-name="partParamCellClassName"
          :cell-style="legacyTableStyleConfig.cellStyle"
          :header-row-style="legacyTableStyleConfig.headerRowStyle"
          :header-cell-style="legacyTableStyleConfig.headerCellStyle"
          :clickable="false"
        >
          <template #part-deliver-value="{ row, index }">
            <BaseInput
              class="app-inline-input"
              type="number"
              :model-value="row.paramDeliverValue"
              @update:model-value="updateParamDeliverValue(index, $event)"
              @blur="normalizeParamDeliverValue(index)"
            />
          </template>
        </BaseTable>
      </article>

      <article class="surface-content liquid-panel app-panel app-panel-craft-list animate-glass-emerge stagger-2">
        <div class="app-panel-header">
          <h2 class="text-title">工艺列表</h2>
          <div class="app-header-actions app-header-actions-inline">
            <div class="app-action-group">
              <BaseButton size="sm" variant="success" :disabled="isAddCraftDisabled" @click="openAddCraftDialog">添加工艺</BaseButton>
              <BaseButton size="sm" variant="primary" :disabled="!store.selectedPart" @click="refreshCraft">刷新</BaseButton>
            </div>
            <div class="app-action-group app-action-group-secondary">
              <BaseButton size="sm" variant="danger" :disabled="isDeleteCraftDisabled" @click="handleDeleteCraft">删除</BaseButton>
            </div>
          </div>
        </div>
        <BaseTable
          :key="`craft-${dictRenderVersion}`"
          :columns="craftColumns"
          :data="store.craftList"
          :row-key="craftRowKey"
          :row-style="legacyTableStyleConfig.rowStyle"
          :cell-style="legacyTableStyleConfig.cellStyle"
          :header-row-style="legacyTableStyleConfig.headerRowStyle"
          :header-cell-style="legacyTableStyleConfig.headerCellStyle"
          :row-class-name="craftRowClassName"
          @row-click="handleCraftClick"
        >
          <template #craft-select-header>
            <BaseCheckbox
              context="table"
              :model-value="isAllCraftSelected"
              :indeterminate="isCraftSelectionIndeterminate"
              :disabled="selectableCraftRows.length === 0"
              @click.stop
              @update:model-value="toggleAllCraftSelection"
            />
          </template>
          <template #craft-select="{ row }">
            <BaseCheckbox
              context="table"
              :model-value="isSelectedCraft(row)"
              @click.stop
              @update:model-value="toggleCraftSelection(row, $event)"
            />
          </template>
          <template #craft-special-requirement="{ row }">
            <button
              class="app-link-button"
              type="button"
              :title="specialRequirementDisplayText(row)"
              @click.stop="openSpecialRequirementDialogByCraft(row)"
            >
              {{ specialRequirementDisplayText(row) }}
            </button>
          </template>
        </BaseTable>
      </article>

      <article class="surface-content liquid-panel app-panel app-panel-craft-params app-panel-muted animate-glass-emerge stagger-3">
        <div class="app-panel-header">
          <h2 class="text-title">工艺参数</h2>
          <BaseButton size="sm" variant="primary" :disabled="isSaveCraftParamsDisabled" @click="submitChangeCraftForm">保存参数</BaseButton>
        </div>
        <div class="app-form-grid-inline">
          <label class="app-form-item-inline">
            <span>是否自动</span>
            <BaseSelect v-model="craftForm.isAuto" :options="yesNoOptions" :disabled="isCraftAutoDisabled" filterable />
          </label>
          <label class="app-form-item-inline">
            <span>是否必要</span>
            <BaseSelect v-model="craftForm.isNeed" :options="yesNoOptions" :disabled="isCraftNeedDisabled" filterable />
          </label>
          <label class="app-form-item-inline">
            <span>顺序</span>
            <BaseInput v-model="craftForm.duration" type="number" :disabled="isCraftCommonFieldsDisabled" />
          </label>
          <label class="app-form-item-inline">
            <span>计划日期</span>
            <BaseDatePicker v-model="craftForm.plnDate" :disabled="isCraftCommonFieldsDisabled" />
          </label>
          <label class="app-form-item-inline">
            <span>人员工时R</span>
            <BaseInput v-model="craftForm.shareManStandardHours" type="number" :disabled="isCraftCommonFieldsDisabled" />
          </label>
          <label class="app-form-item-inline">
            <span>机械工时R</span>
            <BaseInput v-model="craftForm.shareMachineryStandardHours" type="number" :disabled="isCraftCommonFieldsDisabled" />
          </label>
          <label class="app-form-item-inline app-form-item-inline-full">
            <span>备注</span>
            <BaseInput v-model="craftForm.remark" :disabled="isCraftCommonFieldsDisabled" />
          </label>
        </div>
        <div class="app-header-actions app-header-actions-inline app-process-actions">
          <div class="app-action-group">
            <BaseButton size="sm" variant="success" :disabled="isAddProductionDisabled" @click="openAddProductionDialog">添加工序</BaseButton>
          </div>
          <div class="app-action-group app-action-group-secondary">
            <BaseButton size="sm" variant="danger" :disabled="isDeleteProductionDisabled" @click="openDeleteProductionDialog">删除工序</BaseButton>
          </div>
        </div>
        <BaseTable
          :columns="processColumns"
          :data="craftForm.processContentEntityList"
          :row-key="productionRowKey"
          :row-style="legacyTableStyleConfig.rowStyle"
          :cell-style="legacyTableStyleConfig.cellStyle"
          :header-row-style="legacyTableStyleConfig.headerRowStyle"
          :header-cell-style="legacyTableStyleConfig.headerCellStyle"
          :row-class-name="productionRowClassName"
          @row-click="handleProductionClick"
        />
      </article>
    </section>

    <!-- 与原项目保持一致：模板匹配弹窗使用全屏展示。 -->
    <BaseDialog v-model="openTemplateDialog" title="匹配工艺模板" fullscreen>
      <ParsCraftTemplate @confirm="handleTemplateConfirm" @cancel="handleTemplateCancel" />
    </BaseDialog>

    <!-- 与原项目保持一致：历史模板匹配弹窗使用全屏展示。 -->
    <BaseDialog v-model="openHistoryDialog" title="匹配历史模板" fullscreen>
      <HistoryTem @confirm="handleHistoryConfirm" @cancel="handleHistoryCancel" />
    </BaseDialog>

    <BaseDialog v-model="openUploadDialog" title="上传图片">
      <div class="app-upload-box">
        <p class="text-caption">仅支持 png/jpg/jpeg，支持多文件。</p>
        <div class="app-upload-actions-row">
          <BaseFileTrigger
            accept=".png,.jpg,.jpeg"
            multiple
            variant="primary"
            button-text="选择图片文件"
            @change="handleFileChange"
          />
          <BaseButton
            v-if="isHostContextMode"
            size="sm"
            variant="primary"
            :disabled="store.selectedParts.length !== 1"
            @click="handleUgReferenceClick"
          >
            UG引用
          </BaseButton>
        </div>
        <ul class="app-file-list">
          <li v-for="item in uploadFiles" :key="item.name + item.size + item.lastModified">{{ item.name }}</li>
        </ul>
        <div v-if="ugPreviewUrl" class="app-upload-preview">
          <p class="text-caption">UG引用预览</p>
          <img class="app-upload-preview-image" :src="ugPreviewUrl" alt="UG引用图片预览" />
        </div>
        <BaseButton size="sm" variant="success" :disabled="uploadFiles.length === 0" @click="submitUpload">开始上传</BaseButton>
      </div>
    </BaseDialog>

    <BaseDialog v-model="openCraftFormDialog" title="添加工艺">
      <div class="app-upload-box app-craft-dialog-form">
        <!-- 与原项目保持一致：添加工艺弹窗采用左右双列布局。 -->
        <div class="app-craft-dialog-grid">
          <section class="app-craft-dialog-column">
            <label>
              <span class="text-caption">工艺名称</span>
              <BaseSelect
                v-model="craftCreateForm.partRoutingId"
                :options="craftTemplateOptions"
                filterable
                @change="handleSelectCraftTemplate"
              />
            </label>
            <label>
              <span class="text-caption">工艺内容</span>
              <BaseInput
                class="app-textarea-input"
                multiline
                readonly
                :rows="4"
                :model-value="craftCreateForm.craftContent"
              />
            </label>
            <label>
              <span class="text-caption">是否必要</span>
              <BaseSelect
                v-model="craftCreateForm.isNeed"
                :options="yesNoOptions"
                filterable
              />
            </label>
            <label>
              <span class="text-caption">是否自动</span>
              <BaseSelect
                v-model="craftCreateForm.isAuto"
                :options="yesNoOptions"
                filterable
              />
            </label>
          </section>
          <section class="app-craft-dialog-column">
            <label>
              <span class="text-caption">顺序</span>
              <BaseInput v-model="craftCreateForm.duration" type="number" />
            </label>
            <label>
              <span class="text-caption">人员工时R</span>
              <BaseInput v-model="craftCreateForm.shareManStandardHours" type="number" />
            </label>
            <label>
              <span class="text-caption">机械工时R</span>
              <BaseInput v-model="craftCreateForm.shareMachineryStandardHours" type="number" />
            </label>
            <label>
              <span class="text-caption">计划日期</span>
              <BaseDatePicker v-model="craftCreateForm.plnDate" />
            </label>
            <label>
              <span class="text-caption">备注</span>
              <BaseInput v-model="craftCreateForm.remark" />
            </label>
          </section>
        </div>
        <div class="app-dialog-actions">
          <BaseButton size="sm" variant="primary" :disabled="!craftCreateForm.partRoutingId" @click="submitCraftForm">确定</BaseButton>
          <BaseButton size="sm" @click="openCraftFormDialog = false">取消</BaseButton>
        </div>
      </div>
    </BaseDialog>

    <BaseDialog v-model="openProductionDialog" class="app-production-dialog" :title="productionDialogTitle">
      <div class="app-upload-box">
        <label>
          <span class="text-caption">工序内容</span>
          <BaseSelect
            v-model="productionForm.processId"
            :options="processContentSelectOptions"
            :disabled="isDeleteProduction"
            filterable
          />
        </label>
        <label>
          <span class="text-caption">人员工时(+-)</span>
          <BaseInput v-model="productionForm.manResult" type="number" />
        </label>
        <label>
          <span class="text-caption">机械工时(+-)</span>
          <BaseInput v-model="productionForm.machineryResult" type="number" />
        </label>
        <div class="app-dialog-actions">
          <BaseButton
            size="sm"
            variant="primary"
            :disabled="!hasUsablePrimaryKey(productionForm.processId)"
            @click="submitProduction"
          >
            确定
          </BaseButton>
          <BaseButton size="sm" @click="cancelProductionDialog">取消</BaseButton>
        </div>
      </div>
    </BaseDialog>

    <BaseDialog v-model="openSpecialRequirementDialog" title="修改特殊性要求">
      <div class="app-upload-box">
        <label>
          <span class="text-caption">特殊性要求</span>
          <BaseInput
            v-model="specialRequirementForm.specialRequirement"
            class="app-textarea-input"
            multiline
            :rows="4"
            placeholder="请输入特殊性要求"
          />
        </label>
        <div class="app-dialog-actions">
          <BaseButton size="sm" variant="primary" :disabled="specialRequirementLoading" @click="submitSpecialRequirement">
            {{ specialRequirementLoading ? "保存中..." : "确定" }}
          </BaseButton>
          <BaseButton size="sm" @click="cancelSpecialRequirementDialog">取消</BaseButton>
        </div>
      </div>
    </BaseDialog>

    <BaseDialog v-model="openCompilerConfirmDialog" title="确认切换编制人">
      <section class="app-upload-box app-compiler-confirm-box">
        <p class="text-caption">
          当前编制人将从“{{ currentCompilerLabel }}”切换为“{{ pendingCompilerLabel }}”，是否继续？
        </p>
        <div class="app-dialog-actions">
          <BaseButton size="sm" variant="primary" @click="confirmCompilerChange">确认切换</BaseButton>
          <BaseButton size="sm" @click="cancelCompilerChange">取消</BaseButton>
        </div>
      </section>
    </BaseDialog>

    <BaseDialog v-model="openPartParamSaveConfirmDialog" title="参数差异提示">
      <section class="app-upload-box">
        <p class="text-caption">{{ partParamSaveConfirmSummary }}</p>
        <p
          v-for="(line, index) in partParamSaveConfirmDetails"
          :key="`part-param-save-diff-${index}`"
          class="text-caption"
        >
          {{ line }}
        </p>
        <section v-if="partParamSaveConfirmDetailItems.length > 0" class="app-part-param-save-diff-panel">
          <div class="app-part-param-save-diff-header">
            <p class="text-caption">差异明细 {{ partParamSaveConfirmDetailItems.length }} 条</p>
            <BaseButton v-if="isPartParamSaveDetailOverflow" size="sm" @click="togglePartParamSaveDetailExpanded">
              {{ isPartParamSaveDetailExpanded ? "收起明细" : `展开全部(${partParamSaveConfirmDetailItems.length})` }}
            </BaseButton>
          </div>
          <BaseTable
            class="app-part-param-save-diff-table"
            :columns="partParamSaveDetailColumns"
            :data="visiblePartParamSaveDetailItems"
            :row-key="partParamSaveDetailRowKey"
            :clickable="false"
          />
          <p v-if="isPartParamSaveDetailOverflow && !isPartParamSaveDetailExpanded" class="text-caption">
            当前仅展示前 {{ PART_PARAM_SAVE_DETAIL_PREVIEW_LIMIT }} 条差异，点击“展开全部”可查看完整列表。
          </p>
        </section>
        <div class="app-dialog-actions">
          <BaseButton size="sm" variant="primary" @click="confirmPartParamSaveWithDiff">仍然保存</BaseButton>
          <BaseButton size="sm" @click="cancelPartParamSaveWithDiff">取消</BaseButton>
        </div>
      </section>
    </BaseDialog>

    <BaseDialog v-model="openActionConfirmDialog" :title="actionConfirmDialogTitle">
      <section class="app-upload-box app-compiler-confirm-box">
        <p class="text-caption">{{ actionConfirmDialogMessage }}</p>
        <div class="app-dialog-actions">
          <BaseButton size="sm" variant="primary" @click="confirmPendingAction">{{ actionConfirmDialogConfirmText }}</BaseButton>
          <BaseButton size="sm" @click="cancelPendingAction">取消</BaseButton>
        </div>
      </section>
    </BaseDialog>
  </section>
</template>

<script setup>
/**
 * @description 本页核心迁移链路：发布、上传、工艺编辑保存。
 */
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";

import BaseButton from "@/components/base/BaseButton.vue";
import BaseCheckbox from "@/components/base/BaseCheckbox.vue";
import BaseDatePicker from "@/components/base/BaseDatePicker.vue";
import BaseDialog from "@/components/base/BaseDialog.vue";
import BaseFileTrigger from "@/components/base/BaseFileTrigger.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import BaseSelect from "@/components/base/BaseSelect.vue";
import BaseTable from "@/components/base/BaseTable.vue";
import ParsCraftTemplate from "@/pages/parts-order/components/pars-craft-template.vue";
import HistoryTem from "@/pages/parts-order/components/history-tem.vue";
import { hasCraftEditingContext, hasUsablePrimaryKey, resolveCraftPrimaryKey } from "@/pages/parts-order/utils/craft-context";
import { resolveCraftCodeFromContext } from "@/pages/parts-order/utils/craft-code";
import { buildCompilerOptions } from "@/pages/parts-order/utils/compiler-options";
import { resolveCraftParamDisabledState } from "@/pages/parts-order/utils/craft-param-disable";
import { normalizeDetailResponse } from "@/pages/parts-order/utils/detail-response";
import { shouldCondenseCommandBar } from "@/pages/parts-order/utils/command-bar-condense";
import { buildDictLabelMapFromResponse, formatDictLabel, formatYesNoLabel } from "@/pages/parts-order/utils/dict-format";
import {
  hasAuthToken,
  shouldLoadPageDataOnContextChange,
  shouldPreloadDictsOnMounted
} from "@/pages/parts-order/utils/init-load-gate";
import { normalizeListResponse } from "@/pages/parts-order/utils/list-response";
import {
  applyIpcParamListToServerParams,
  buildPartParamDiffModel,
  buildPartParamSaveConfirmPayload
} from "@/pages/parts-order/utils/part-param-diff";
import { getPartCode, mergeContextAndErpParts, normalizePartCode } from "@/pages/parts-order/utils/part-merge";
import { decodeBase64ImageToFile } from "@/pages/parts-order/utils/ug-reference";
import { buildUploadImageFormData } from "@/pages/parts-order/utils/upload-image-payload";
import { resolveSelectedPartAfterSync } from "@/pages/parts-order/utils/part-selection";
import { mapProcessContentOptions } from "@/pages/parts-order/utils/process-content-options";
import {
  resolveCraftRowSelectionState,
  resolvePartRowSelectionState
} from "@/pages/parts-order/utils/row-selection";
import { collectSelectableRows, nextSelectionAfterToggleAll, resolveSelectAllState } from "@/pages/parts-order/utils/table-selection";
import { partsOrderRuntimePolicy } from "@/config/parts-order-runtime";
import { getDictByType } from "@/services/api/dict";
import { selectCraftPTList } from "@/services/api/samMoldCraftTemplate";
import {
  addCraft,
  addProduction,
  addProductionList,
  changeParams,
  deleteProductionList,
  deleteBachListByPartIdAndRoutingId,
  deleteProduction,
  editSpecialRequirement,
  getMaintenanceParams,
  getOrderById,
  getOrderByPartId2,
  getReferenceDetailListByOrderId,
  queryPartListByOrderNum,
  releasePartOrder,
  saveHistoryTemCraft,
  savePartsCraft,
  selectReferenceDetailListByCraftCode,
  upLoadFileList,
  updateCraft
} from "@/services/api/samMesPartsOrder";
import { saveCompilerSelection, triggerFreeLogin } from "@/services/bridge";
import { usePartsOrderStore } from "@/stores/partsOrderStore";

const store = usePartsOrderStore();
/** 页面运行策略：开发手输模式 / 打包宿主模式。 */
const isDevManualMode = partsOrderRuntimePolicy.isDevManualMode;
/** 当前是否处于宿主上下文驱动模式（非开发手输模式）。 */
const isHostContextMode = !isDevManualMode;
/** 顶部输入框是否锁定（仅开发手输模式允许编辑）。 */
const isCommandInputsLocked = !partsOrderRuntimePolicy.allowManualCommandInputs;
/** 是否启用 IPC 与 ERP 的零件匹配。 */
const enableIpcPartMatching = partsOrderRuntimePolicy.enableIpcPartMatching;
/** 是否在收到上下文后强制覆盖输入框。 */
const forceContextOverwriteInputs = partsOrderRuntimePolicy.forceContextOverwriteInputs;
/** 零件工单页面使用的字典类型编码（与原 Vue2 保持一致）。 */
const partsOrderDictTypes = Object.freeze({
  partCategory: "mould_part_category",
  craftType: "eng_craft_type",
  releaseStatus: "e_is_release",
  yesNo: "sys_yes_no"
});
/** 零件类型字典回退映射，字典接口失败时兜底。 */
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
/** 工艺类型字典回退映射。 */
const craftTypeFallbackMap = Object.freeze({
  "1": "机加工",
  "2": "热处理",
  "3": "表面处理",
  "4": "检测"
});
/** 发布状态字典回退映射。 */
const releaseStatusFallbackMap = Object.freeze({
  "0": "未编制",
  "1": "部分编制",
  "2": "已编制"
});
/** 是/否字典回退映射（兼容布尔与数字表达）。 */
const yesNoFallbackMap = Object.freeze({
  Y: "是",
  N: "否",
  TRUE: "是",
  FALSE: "否",
  "1": "是",
  "0": "否"
});
/** 页面滚动容器，用于驱动液态指挥条凝练态。 */
const pageRootRef = ref(null);
/** 指挥条是否进入凝练态。 */
const isCommandBarCondensed = ref(false);
/** 零件类型字典标签映射。 */
const partCategoryDictMap = ref({ ...partCategoryFallbackMap });
/** 工艺类型字典标签映射。 */
const craftTypeDictMap = ref({ ...craftTypeFallbackMap });
/** 发布状态字典标签映射。 */
const releaseStatusDictMap = ref({ ...releaseStatusFallbackMap });
/** 是/否字典标签映射。 */
const yesNoDictMap = ref({ ...yesNoFallbackMap });
/** 字典加载版本号，用于驱动表格在字典更新后强制重渲染。 */
const dictRenderVersion = ref(0);
/** 原项目表格密度样式配置（由 adaptiveTableHeightMixin 迁移）。 */
const legacyTableStyleConfig = Object.freeze({
  headerRowStyle: { height: "10px" },
  rowStyle: { height: "10px" },
  // 仅压缩上下内边距，保留左右留白，避免列内容视觉粘连与贴边。
  headerCellStyle: { paddingTop: "0", paddingBottom: "0", fontSize: "13px" },
  // 仅压缩上下内边距，左右沿用 BaseTable 默认值，提升可读性。
  cellStyle: { paddingTop: "1px", paddingBottom: "1px" }
});

/** 弹窗开关状态。 */
const openTemplateDialog = ref(false);
const openHistoryDialog = ref(false);
const openUploadDialog = ref(false);
const openCraftFormDialog = ref(false);
const openProductionDialog = ref(false);
const openSpecialRequirementDialog = ref(false);
const openCompilerConfirmDialog = ref(false);
const openPartParamSaveConfirmDialog = ref(false);
const openActionConfirmDialog = ref(false);

/** 二次确认动作类型：发布、保存参数、删除工艺。 */
const actionConfirmTypes = Object.freeze({
  releasePartOrder: "releasePartOrder",
  savePartParams: "savePartParams",
  saveCraftParams: "saveCraftParams",
  deleteCraft: "deleteCraft"
});
/** 当前待确认动作类型。 */
const pendingActionType = ref("");
/** 二次确认弹窗标题。 */
const actionConfirmDialogTitle = ref("二次确认");
/** 二次确认弹窗提示文案。 */
const actionConfirmDialogMessage = ref("");
/** 二次确认主按钮文案。 */
const actionConfirmDialogConfirmText = ref("确认");

/** 编制人下拉草稿值，未确认时可回滚。 */
const compilerDraftValue = ref("");
/** 已确认生效的编制人值。 */
const currentCompilerValue = ref("");
/** 待确认切换的编制人值。 */
const pendingCompilerValue = ref("");
/** 保存参数前的差异确认摘要。 */
const partParamSaveConfirmSummary = ref("");
/** 保存参数前的差异确认明细。 */
const partParamSaveConfirmDetails = ref([]);
/** 保存参数前的差异明细表格行。 */
const partParamSaveConfirmDetailItems = ref([]);
/** 差异明细默认展示上限：超过后可展开全部。 */
const PART_PARAM_SAVE_DETAIL_PREVIEW_LIMIT = 30;
/** 差异明细是否展开全部。 */
const isPartParamSaveDetailExpanded = ref(false);

/** 当前待上传文件列表。 */
const uploadFiles = ref([]);
/** 当前 UG 引用生成的文件（用于替换与去重）。 */
const ugReferenceFile = ref(null);
/** 当前 UG 引用图片预览地址。 */
const ugPreviewUrl = ref("");
/** 当前工艺多选集合（用于批量删除工艺）。 */
const craftSelections = ref([]);
/** 当前工艺参数区选中工序。 */
const selectedProduction = ref(null);
/** 工序弹窗删除模式。 */
const isDeleteProduction = ref(false);
/** 工艺模板下拉选项。 */
const standardCraftOptions = ref([]);
/** 当前工艺下可选工序列表。 */
const processContentOptions = ref([]);
/** 特殊性要求弹窗提交状态。 */
const specialRequirementLoading = ref(false);

/** 特殊性要求编辑表单。 */
const specialRequirementForm = reactive({
  id: null,
  specialRequirement: ""
});

/** 工序新增/删除弹窗表单。 */
const productionForm = reactive({
  processId: null,
  manResult: "",
  machineryResult: ""
});

/** 添加工艺弹窗表单。 */
const craftCreateForm = reactive({
  partId: null,
  partRoutingId: null,
  craftContent: "",
  isProgram: "",
  isNeed: "N",
  isAuto: "N",
  duration: "",
  shareManStandardHours: "",
  shareMachineryStandardHours: "",
  plnDate: "",
  remark: ""
});

/** 当前工艺编辑表单。 */
const craftForm = reactive({
  id: null,
  isAuto: "",
  isNeed: "",
  duration: "",
  plnDate: "",
  shareManStandardHours: "",
  shareMachineryStandardHours: "",
  remark: "",
  processContentEntityList: []
});

/** 顶部 command 条制造令号（开发手输模式可编辑，打包态由宿主强约束）。 */
const moldOrderNum = ref("");
/** 顶部 command 条零件名称（开发手输模式可编辑，打包态由宿主强约束）。 */
const bomName = ref("");
const productionDialogTitle = computed(() => (isDeleteProduction.value ? "删除工序" : "添加工序"));
const yesNoOptions = computed(() => {
  return [
    { label: formatYesNoLabel("Y", yesNoDictMap.value, yesNoFallbackMap), value: "Y" },
    { label: formatYesNoLabel("N", yesNoDictMap.value, yesNoFallbackMap), value: "N" }
  ];
});
const craftTemplateOptions = computed(() => {
  return standardCraftOptions.value.map((item) => ({
    label: item.standardCraftName ?? "-",
    value: item.standardCraftId
  }));
});
const processContentSelectOptions = computed(() => {
  return mapProcessContentOptions(processContentOptions.value);
});
/** 零件参数卡是否存在可保存的参数行。 */
const hasPartParamsData = computed(() => Array.isArray(store.paramsList) && store.paramsList.length > 0);
/** 当前选中零件中的 IPC 参数列表。 */
const selectedPartIpcParamList = computed(() => {
  return Array.isArray(store.selectedPart?.paramList) ? store.selectedPart.paramList : [];
});
/** 零件参数差异模型（服务器参数 vs IPC paramList）。 */
const partParamDiffModel = computed(() => {
  return buildPartParamDiffModel({
    serverParams: store.paramsList,
    ipcParams: selectedPartIpcParamList.value,
    resolveServerRowKey: (row, index) => paramRowKey(row, index)
  });
});
/** 头部未匹配 IPC 参数编号展示文本。 */
const unmatchedIpcParamCodesText = computed(() => {
  return partParamDiffModel.value.unmatchedIpcEntries.map((entry) => entry.visibleCode).join("、");
});
/** 参数保存差异弹窗明细表列定义。 */
const partParamSaveDetailColumns = [
  { key: "diffTypeLabel", title: "差异类型", width: "120px", formatter: (row) => row.diffTypeLabel ?? "-" },
  { key: "paramCode", title: "参数编号", width: "140px", formatter: (row) => row.paramCode ?? "-" },
  { key: "fieldLabel", title: "差异字段", width: "110px", formatter: (row) => row.fieldLabel ?? "-" },
  { key: "currentValue", title: "当前值", width: "220px", formatter: (row) => row.currentValue ?? "-", overflowTooltip: true },
  { key: "ugValue", title: "UG计算值", width: "220px", formatter: (row) => row.ugValue ?? "-", overflowTooltip: true }
];
/** 差异明细是否超出默认预览上限。 */
const isPartParamSaveDetailOverflow = computed(() => partParamSaveConfirmDetailItems.value.length > PART_PARAM_SAVE_DETAIL_PREVIEW_LIMIT);
/** 差异明细当前可视行（默认前 N 条，可展开全部）。 */
const visiblePartParamSaveDetailItems = computed(() => {
  if (isPartParamSaveDetailExpanded.value) {
    return partParamSaveConfirmDetailItems.value;
  }
  return partParamSaveConfirmDetailItems.value.slice(0, PART_PARAM_SAVE_DETAIL_PREVIEW_LIMIT);
});
/** 工艺列表卡是否存在任何工艺行。 */
const hasCraftListData = computed(() => Array.isArray(store.craftList) && store.craftList.length > 0);
/** 当前选中工艺主键。 */
const selectedCraftPrimaryKey = computed(() => resolveCraftPrimaryKey(store.selectedCraft));
/** 工艺参数卡是否处于有效工艺上下文。 */
const hasSelectedCraftContext = computed(() => hasCraftEditingContext(store.selectedCraft, selectedCraftPrimaryKey.value));
/** 零件参数保存按钮禁用条件。 */
const isSavePartParamsDisabled = computed(() => !store.selectedPart || !hasPartParamsData.value);
/** “引用UG参数”按钮禁用条件。 */
const isApplyUgParamsDisabled = computed(() => {
  return !store.selectedPart || !hasPartParamsData.value || selectedPartIpcParamList.value.length === 0;
});
/** 工艺参数区统一禁用态（与原 Vue2 isCraftEdit 门控行为对齐）。 */
const craftParamDisabledState = computed(() => {
  return resolveCraftParamDisabledState({
    hasCraftContext: hasSelectedCraftContext.value,
    isAutoValue: craftForm.isAuto
  });
});
/** 工艺参数保存按钮禁用条件。 */
const isSaveCraftParamsDisabled = computed(() => craftParamDisabledState.value.saveCraftParams);
/** “是否自动”字段禁用条件。 */
const isCraftAutoDisabled = computed(() => craftParamDisabledState.value.isAutoField);
/** “是否必要”字段禁用条件。 */
const isCraftNeedDisabled = computed(() => craftParamDisabledState.value.isNeedField);
/** 工艺参数常规字段禁用条件。 */
const isCraftCommonFieldsDisabled = computed(() => craftParamDisabledState.value.commonFormFields);
/**
 * 添加工艺按钮禁用条件：仅在未选中零件时禁用。
 * 兼容旧版业务闭环：允许“零件当前无工艺”时新增首条工艺，避免入口被错误锁死。
 */
const isAddCraftDisabled = computed(() => !store.selectedPart);
/** 删除工艺按钮禁用条件：列表空、未勾选或无操作零件时禁用。 */
const isDeleteCraftDisabled = computed(() => {
  return !store.selectedPart || !hasCraftListData.value || craftSelections.value.length === 0 || store.selectedParts.length === 0;
});
/** 添加工序按钮禁用条件：工艺参数区无有效上下文时禁用。 */
const isAddProductionDisabled = computed(() => craftParamDisabledState.value.addProduction);
/** 删除工序按钮禁用条件：与 Vue2 对齐，仅按工艺上下文门控。 */
const isDeleteProductionDisabled = computed(() => craftParamDisabledState.value.deleteProduction);
/** 零件表可参与勾选的行集合（仅保留有效主键行）。 */
const selectablePartRows = computed(() => collectSelectableRows(store.parts, getPartId));
/** 零件表全选状态（全选/半选）。 */
const partSelectAllState = computed(() => resolveSelectAllState(selectablePartRows.value, isSelectedPart));
/** 零件表是否全选。 */
const isAllPartSelected = computed(() => partSelectAllState.value.allSelected);
/** 零件表是否半选。 */
const isPartSelectionIndeterminate = computed(() => partSelectAllState.value.indeterminate);
/** 工艺表可参与勾选的行集合（仅保留有效主键行）。 */
const selectableCraftRows = computed(() =>
  collectSelectableRows(store.craftList, (row) => resolveCraftPrimaryKey(row))
);
/** 工艺表全选状态（全选/半选）。 */
const craftSelectAllState = computed(() => resolveSelectAllState(selectableCraftRows.value, isSelectedCraft));
/** 工艺表是否全选。 */
const isAllCraftSelected = computed(() => craftSelectAllState.value.allSelected);
/** 工艺表是否半选。 */
const isCraftSelectionIndeterminate = computed(() => craftSelectAllState.value.indeterminate);
/** 当前可选编制人列表，优先取前端候选用户接口结果，不足时回退当前用户名。 */
const compilerOptions = computed(() => {
  return buildCompilerOptions({
    compilerCandidates: store.compilerCandidates,
    payload: store.contextMessage?.payload ?? {}
  });
});
const currentCompilerLabel = computed(() => {
  return labelFromOptionValue(currentCompilerValue.value, compilerOptions.value);
});
const pendingCompilerLabel = computed(() => {
  return labelFromOptionValue(pendingCompilerValue.value, compilerOptions.value);
});

/**
 * 从上下文中解析当前编制人账号（优先账号字段，昵称仅作兜底）。
 * @returns {string}
 */
function resolveContextCompilerAccount() {
  const payload = store.contextMessage?.payload ?? {};
  const userObj = payload.currentUser ?? payload.userInfo ?? null;
  if (userObj && typeof userObj === "object") {
    const fromUserObj = String(
      userObj.userName ?? userObj.username ?? userObj.userCode ?? userObj.account ?? ""
    );
    if (fromUserObj) {
      return fromUserObj;
    }
  }

  const fromPayload = String(
    payload.createBy ??
      payload.userName ??
      payload.username ??
      payload.userCode ??
      payload.operatorUserName ??
      payload.account ??
      ""
  );
  if (fromPayload) {
    return fromPayload;
  }

  return typeof payload.operator === "string" ? payload.operator : "";
}

/**
 * 将上下文中的编制人账号映射为下拉 value。
 * @returns {string}
 */
function resolveContextCompilerValue() {
  const contextAccount = resolveContextCompilerAccount();
  if (!contextAccount) {
    return "";
  }
  const accountMatch = compilerOptions.value.find((item) => String(item.value) === contextAccount);
  if (accountMatch) {
    return String(accountMatch.value);
  }
  // 兼容上下文仅下发昵称的场景。
  const labelMatch = compilerOptions.value.find((item) => String(item.label) === contextAccount);
  if (labelMatch) {
    return String(labelMatch.value);
  }
  return "";
}
/** 指挥条凝练态触发阈值（px）。 */
const commandBarCondenseThreshold = 24;
/** 指挥条滚动侦听源（页面滚动 + 表格滚动容器）。 */
const commandBarScrollTargets = new Set();
/** requestAnimationFrame 任务 ID，用于节流滚动计算。 */
let commandBarRafId = 0;

/**
 * 统一移除已注册的滚动监听，避免重复绑定导致性能回退。
 */
function clearCommandBarScrollTargets() {
  commandBarScrollTargets.forEach((element) => {
    element.removeEventListener("scroll", handleCommandBarScroll);
  });
  commandBarScrollTargets.clear();
}

/**
 * 绑定单个滚动源，重复绑定会自动跳过。
 * @param {Element} element 待绑定的滚动容器。
 */
function bindCommandBarScrollTarget(element) {
  if (!element || commandBarScrollTargets.has(element)) {
    return;
  }
  element.addEventListener("scroll", handleCommandBarScroll, { passive: true });
  commandBarScrollTargets.add(element);
}

/**
 * 刷新指挥条滚动源：仅监听页面主容器滚动，避免表格内滚动误触发顶部收窄。
 */
function refreshCommandBarScrollTargets() {
  clearCommandBarScrollTargets();
  bindCommandBarScrollTarget(pageRootRef.value);
}

/**
 * 计算当前最大滚动深度并更新指挥条形态。
 */
function updateCommandBarCondensedState() {
  const pageScrollTop = pageRootRef.value?.scrollTop ?? 0;
  const nestedScrollTops = [];
  commandBarScrollTargets.forEach((element) => {
    if (element !== pageRootRef.value) {
      nestedScrollTops.push(element.scrollTop ?? 0);
    }
  });
  isCommandBarCondensed.value = shouldCondenseCommandBar({
    pageScrollTop,
    nestedScrollTops,
    threshold: commandBarCondenseThreshold
  });
}

/**
 * 滚动回调：通过 rAF 合并高频滚动事件，降低重排开销。
 */
function handleCommandBarScroll() {
  if (commandBarRafId) {
    return;
  }
  commandBarRafId = window.requestAnimationFrame(() => {
    commandBarRafId = 0;
    updateCommandBarCondensedState();
  });
}

/**
 * 拉取单个字典并构建标签映射。
 * @param {string} dictType 字典类型编码。
 * @param {Record<string,string>} fallbackMap 回退映射。
 * @returns {Promise<{labelMap:Record<string,string>,loadError:boolean}>}
 */
async function loadDictLabelMap(dictType, fallbackMap) {
  try {
    const response = await getDictByType(dictType);
    return {
      labelMap: buildDictLabelMapFromResponse(response, fallbackMap),
      loadError: false
    };
  } catch (error) {
    // 字典失败会直接影响表格文案，输出日志便于现场排查。
    console.warn(`[parts-order] 字典加载失败: ${dictType}`, error);
    return {
      labelMap: { ...fallbackMap },
      loadError: true
    };
  }
}

/**
 * 加载页面展示所需字典，保持与原 Vue2 getDicts 行为一致。
 */
async function loadBusinessDicts() {
  const [partCategoryResult, craftTypeResult, releaseStatusResult, yesNoResult] = await Promise.all([
    loadDictLabelMap(partsOrderDictTypes.partCategory, partCategoryFallbackMap),
    loadDictLabelMap(partsOrderDictTypes.craftType, craftTypeFallbackMap),
    loadDictLabelMap(partsOrderDictTypes.releaseStatus, releaseStatusFallbackMap),
    loadDictLabelMap(partsOrderDictTypes.yesNo, yesNoFallbackMap)
  ]);
  partCategoryDictMap.value = partCategoryResult.labelMap;
  craftTypeDictMap.value = craftTypeResult.labelMap;
  releaseStatusDictMap.value = releaseStatusResult.labelMap;
  yesNoDictMap.value = yesNoResult.labelMap;
  dictRenderVersion.value += 1;

  const hasError =
    partCategoryResult.loadError ||
    craftTypeResult.loadError ||
    releaseStatusResult.loadError ||
    yesNoResult.loadError;
  if (hasError) {
    store.setError("字典加载失败，当前已使用内置回退映射（请检查字典接口与后端连通性）");
  }
}


/**
 * 同步编制人选择状态，确保草稿值和已确认值始终可用。
 */
function syncCompilerSelection() {
  if (compilerOptions.value.length === 0) {
    compilerDraftValue.value = "";
    currentCompilerValue.value = "";
    pendingCompilerValue.value = "";
    openCompilerConfirmDialog.value = false;
    return;
  }

  // 优先使用宿主上下文中的当前编制人，避免刷新后误回退到列表首项（如 admin）。
  const contextCompilerValue = resolveContextCompilerValue();
  if (contextCompilerValue) {
    currentCompilerValue.value = contextCompilerValue;
    compilerDraftValue.value = contextCompilerValue;
    if (!openCompilerConfirmDialog.value) {
      pendingCompilerValue.value = contextCompilerValue;
    }
    return;
  }

  const hasCurrentValue = compilerOptions.value.some((item) => item.value === currentCompilerValue.value);
  if (!hasCurrentValue) {
    const fallbackValue = compilerOptions.value[0].value;
    currentCompilerValue.value = fallbackValue;
    compilerDraftValue.value = fallbackValue;
    pendingCompilerValue.value = fallbackValue;
    openCompilerConfirmDialog.value = false;
    return;
  }

  compilerDraftValue.value = currentCompilerValue.value;
  if (!openCompilerConfirmDialog.value) {
    pendingCompilerValue.value = currentCompilerValue.value;
  }
}

/**
 * 编制人下拉变更回调：变更后先弹窗二次确认。
 * @param {string|number|null} value 选中的编制人值。
 */
function handleCompilerChange(value) {
  const normalizedValue = value === null || value === undefined ? "" : String(value);
  if (!normalizedValue || normalizedValue === currentCompilerValue.value) {
    compilerDraftValue.value = currentCompilerValue.value;
    return;
  }
  pendingCompilerValue.value = normalizedValue;
  openCompilerConfirmDialog.value = true;
}

/**
 * 确认切换编制人。
 */
async function confirmCompilerChange() {
  if (!pendingCompilerValue.value) {
    cancelCompilerChange();
    return;
  }

  const matchedOption = compilerOptions.value.find((item) => item.value === pendingCompilerValue.value) ?? null;
  const nextUserName = String(matchedOption?.value ?? pendingCompilerValue.value);
  const nextNickName = String(matchedOption?.label ?? pendingCompilerValue.value);

  currentCompilerValue.value = pendingCompilerValue.value;
  compilerDraftValue.value = pendingCompilerValue.value;
  openCompilerConfirmDialog.value = false;

  // 与参考项目一致：切换后立即将编制人写入本地 userName.txt。
  const persistSuccess = await saveCompilerSelection({ userName: nextUserName, nickName: nextNickName });
  if (!persistSuccess) {
    store.setError("编制人已切换，但写入本地用户文件失败");
    return;
  }

  // 切换编制人后立即触发一次免登录，确保后续接口使用新账号 token。
  const loginSuccess = await triggerFreeLogin(nextUserName);
  if (!loginSuccess) {
    store.setError("编制人已切换，但免登录失败，请检查网络或账号配置");
    return;
  }

  if (store.error === "编制人已切换，但写入本地用户文件失败") {
    store.clearError();
  }
  if (store.error === "编制人已切换，但免登录失败，请检查网络或账号配置") {
    store.clearError();
  }
}

/**
 * 取消切换编制人并回滚到当前值。
 */
function cancelCompilerChange() {
  pendingCompilerValue.value = currentCompilerValue.value;
  compilerDraftValue.value = currentCompilerValue.value;
  openCompilerConfirmDialog.value = false;
}

/**
 * 根据动作类型构建二次确认弹窗文案。
 * @param {string} actionType 动作类型。
 * @returns {{title:string,message:string,confirmText:string}}
 */
function resolveActionConfirmMeta(actionType) {
  if (actionType === actionConfirmTypes.releasePartOrder) {
    // 发布属于批量不可逆动作，展示当前选中数量便于操作者复核。
    const selectedCount = store.selectedParts.length;
    return {
      title: "确认发布",
      message: `即将发布已选中的 ${selectedCount} 个零件，是否继续？`,
      confirmText: "确认发布"
    };
  }

  if (actionType === actionConfirmTypes.savePartParams) {
    return {
      title: "确认保存参数",
      message: "将保存当前零件参数修改，是否继续？",
      confirmText: "确认保存"
    };
  }

  if (actionType === actionConfirmTypes.saveCraftParams) {
    return {
      title: "确认保存参数",
      message: "将保存当前工艺参数修改，是否继续？",
      confirmText: "确认保存"
    };
  }

  if (actionType === actionConfirmTypes.deleteCraft) {
    // 删除属于高风险动作，明确提示不可恢复并展示删除条数。
    const selectedCount = craftSelections.value.length;
    return {
      title: "确认删除工艺",
      message: `即将删除已选中的 ${selectedCount} 条工艺记录，删除后不可恢复，是否继续？`,
      confirmText: "确认删除"
    };
  }

  return {
    title: "二次确认",
    message: "是否继续当前操作？",
    confirmText: "确认"
  };
}

/**
 * 打开统一二次确认弹窗。
 * @param {string} actionType 动作类型。
 */
function openActionConfirm(actionType) {
  const meta = resolveActionConfirmMeta(actionType);
  pendingActionType.value = actionType;
  actionConfirmDialogTitle.value = meta.title;
  actionConfirmDialogMessage.value = meta.message;
  actionConfirmDialogConfirmText.value = meta.confirmText;
  openActionConfirmDialog.value = true;
}

/**
 * 重置二次确认弹窗状态，避免跨动作复用旧文案。
 */
function resetActionConfirmState() {
  pendingActionType.value = "";
  actionConfirmDialogTitle.value = "二次确认";
  actionConfirmDialogMessage.value = "";
  actionConfirmDialogConfirmText.value = "确认";
}

/**
 * 取消二次确认并复位弹窗态。
 */
function cancelPendingAction() {
  openActionConfirmDialog.value = false;
  resetActionConfirmState();
}

/**
 * 确认执行当前待处理动作。
 */
async function confirmPendingAction() {
  const actionType = pendingActionType.value;
  openActionConfirmDialog.value = false;
  resetActionConfirmState();

  if (actionType === actionConfirmTypes.releasePartOrder) {
    await handleReleasePartOrder({ skipActionConfirm: true });
    return;
  }
  if (actionType === actionConfirmTypes.savePartParams) {
    await submitChangeParams({ skipDiffConfirm: true, skipActionConfirm: true });
    return;
  }
  if (actionType === actionConfirmTypes.saveCraftParams) {
    await submitChangeCraftForm({ skipActionConfirm: true });
    return;
  }
  if (actionType === actionConfirmTypes.deleteCraft) {
    await handleDeleteCraft({ skipActionConfirm: true });
  }
}


const craftColumns = [
  { key: "selected", title: "选择", width: "50px", fixed: "left", align: "center", slot: "craft-select", headerSlot: "craft-select-header" },
  { key: "duration", title: "排序", width: "50px", fixed: "left", align: "center", formatter: (row, index) => valueFromAliases(row, ["duration", "seq"], index + 1) },
  { key: "craftName", title: "工艺名称", width: "150px", fixed: "left", headerAlign: "center", showOverflowTooltip: true, formatter: (row) => valueFromAliases(row, ["craftName", "standardCraftName"]) },
  { key: "craftCode", title: "工艺编号", width: "120px", fixed: "left", headerAlign: "center", showOverflowTooltip: true, formatter: (row) => valueFromAliases(row, ["craftCode", "standardCraftCode"]) },
  { key: "isNeed", title: "必要", width: "70px", align: "center", formatter: (row) => formatYesNo(valueFromAliases(row, ["isNeed"], "")) },
  { key: "isAuto", title: "自动", width: "70px", align: "center", formatter: (row) => formatYesNo(valueFromAliases(row, ["isAuto"], "")) },
  { key: "craftType", title: "工艺类型", width: "120px", headerAlign: "center", formatter: (row) => formatCraftType(valueFromAliases(row, ["craftType"], "")) },
  { key: "manStandardHours", title: "人员工时S", width: "110px", align: "right", headerAlign: "center", formatter: (row) => valueFromAliases(row, ["manStandardHours", "manHours"]) },
  { key: "machineryStandardHours", title: "机械工时S", width: "110px", align: "right", headerAlign: "center", formatter: (row) => valueFromAliases(row, ["machineryStandardHours", "machineHours"]) },
  { key: "shareManStandardHours", title: "人员工时R", width: "110px", align: "right", headerAlign: "center", formatter: (row) => valueFromAliases(row, ["shareManStandardHours"]) },
  { key: "shareMachineryStandardHours", title: "机械工时R", width: "110px", align: "right", headerAlign: "center", formatter: (row) => valueFromAliases(row, ["shareMachineryStandardHours"]) },
  { key: "plnDate", title: "计划日期", width: "120px", align: "center", formatter: (row) => valueFromAliases(row, ["plnDate", "planDate"]) },
  { key: "craftContent", title: "工艺内容", width: "180px", headerAlign: "center", showOverflowTooltip: true, formatter: (row) => valueFromAliases(row, ["craftContent"]) },
  { key: "deviceList", title: "加工设备", width: "140px", headerAlign: "center", formatter: (row) => valueFromAliases(row, ["deviceList", "deviceNameList"]) },
  { key: "specialRequirement", title: "特殊性要求", width: "160px", headerAlign: "center", slot: "craft-special-requirement" },
  { key: "remark", title: "备注", width: "140px", headerAlign: "center", showOverflowTooltip: true, formatter: (row) => valueFromAliases(row, ["remark"]) }
];

/** 零件列表列定义，统一走 BaseTable 样式。 */
const partColumns = [
  { key: "selected", title: "选择", width: "50px", fixed: "left", align: "center", slot: "part-select", headerSlot: "part-select-header" },
  { key: "seq", title: "排序", width: "50px", fixed: "left", align: "center", formatter: (_, index) => index + 1 },
  // 同时兼容 camelCase / PascalCase / snake_case，避免后端字段风格差异导致列表空白。
  { key: "pname", title: "零件名称", width: "150px", fixed: "left", headerAlign: "center", showOverflowTooltip: true, formatter: (row) => valueFromAliases(row, ["pname", "pName", "partName", "p_name"]) },
  { key: "pcode", title: "零件编号", width: "150px", fixed: "left", headerAlign: "center", showOverflowTooltip: true, formatter: (row) => valueFromAliases(row, ["pcode", "pCode", "partCode", "p_code"]) },
  { key: "importPartCode", title: "件号", width: "120px", fixed: "left", headerAlign: "center", showOverflowTooltip: true, formatter: (row) => valueFromAliases(row, ["importPartCode", "import_part_code", "partNumber"]) },
  {
    key: "partCategory",
    title: "零件类型",
    width: "110px",
    headerAlign: "center",
    showOverflowTooltip: true,
    formatter: (row) =>
      formatPartCategory(
        valueFromAliases(row, [
          "partCategoryName",
          "partCategoryLabel",
          "partCategoryDesc",
          "partCategory",
          "childrenType",
          "part_category"
        ], "")
      )
  },
  { key: "qty", title: "数量", width: "70px", align: "right", headerAlign: "center", showOverflowTooltip: true, formatter: (row) => valueFromAliases(row, ["qty", "quantity"]) },
  { key: "materialCode", title: "材质", width: "100px", headerAlign: "center", showOverflowTooltip: true, formatter: (row) => valueFromAliases(row, ["materialCode", "material"]) },
  { key: "specificationCode", title: "规格代号", width: "140px", headerAlign: "center", showOverflowTooltip: true, formatter: (row) => valueFromAliases(row, ["specificationCode", "specCode"]) },
  { key: "isRelease", title: "发布状态", width: "120px", headerAlign: "center", showOverflowTooltip: true, formatter: (row) => formatReleaseStatus(valueFromAliases(row, ["isRelease"], "")) },
  { key: "weight", title: "重量", width: "90px", align: "right", headerAlign: "center", showOverflowTooltip: true, formatter: (row) => valueFromAliases(row, ["weight"]) }
];

/** 零件参数列定义，交付值通过插槽编辑。 */
const partParamColumns = [
  { key: "seq", title: "序号", width: "50px", align: "center", formatter: (_, index) => index + 1 },
  { key: "paramName", title: "参数名称", width: "180px", headerAlign: "center", showOverflowTooltip: true, formatter: (row) => valueFromAliases(row, ["paramName", "name"]) },
  { key: "paramCode", title: "参数编号", width: "140px", headerAlign: "center", showOverflowTooltip: true, formatter: (row) => valueFromAliases(row, ["paramCode", "code"]) },
  { key: "paramCountValue", title: "计算值", width: "110px", align: "right", headerAlign: "center", showOverflowTooltip: true, formatter: (row) => valueFromAliases(row, ["paramCountValue", "countValue"]) },
  { key: "paramDeliverValue", title: "交付值", width: "180px", slot: "part-deliver-value", align: "right", headerAlign: "center", showOverflowTooltip: true }
];

/** 工序表列定义，和 Vue2 原结构保持一致。 */
const processColumns = [
  { key: "req", title: "序号", width: "50px", align: "center", formatter: (row, index) => valueFromAliases(row, ["req"], index + 1) },
  { key: "jobContent", title: "工序内容", width: "220px", headerAlign: "center", showOverflowTooltip: true, formatter: (row) => valueFromAliases(row, ["jobContent"]) },
  { key: "smchF", title: "机械计算公式", width: "150px", align: "right", headerAlign: "center", showOverflowTooltip: true, formatter: (row) => valueFromAliases(row, ["smchF"]) },
  { key: "smch", title: "机械工时", width: "110px", align: "right", headerAlign: "center", showOverflowTooltip: true, formatter: (row) => valueFromAliases(row, ["smch"]) },
  { key: "smshF", title: "人员计算公式", width: "150px", align: "right", headerAlign: "center", showOverflowTooltip: true, formatter: (row) => valueFromAliases(row, ["smshF"]) },
  { key: "smsh", title: "人员工时", width: "110px", align: "right", headerAlign: "center", showOverflowTooltip: true, formatter: (row) => valueFromAliases(row, ["smsh"]) }
];

/**
 * 页面初始化与手动刷新共用的数据加载入口。
 * @param {{includePartName?: boolean}} options 加载选项。
 */
async function loadPageData(options = {}) {
  const { includePartName = false, autoSelectFirstPart = true } = options;
  // 每次页面数据刷新前先同步字典，避免首屏时机导致的字典缺失长期不更新。
  await loadBusinessDicts();
  await loadPartList({ includePartName, autoSelectFirstPart });

  await loadCraftAndParams();
  await nextTick();
  refreshCommandBarScrollTargets();
  updateCommandBarCondensedState();
}

/**
 * 根据桥接上下文拉取零件列表，优先后端结果，失败时兜底桥接数据。
 * @param {{includePartName?: boolean}} options 加载选项。
 */
async function loadPartList(options = {}) {
  const { includePartName = false, autoSelectFirstPart = true } = options;
  const currentMoldOrderNum = resolveMoldOrderNum();
  store.loading = true;
  store.clearError();
  // 统一读取 IPC 原始零件，后续用于兜底与 base64 合并。
  const contextParts = Array.isArray(store.contextMessage?.payload?.parts) ? store.contextMessage.payload.parts : [];

  try {
    if (!currentMoldOrderNum) {
      // 开发手输模式下，制造令号为空时不使用 IPC 列表，避免混淆“查询结果”和“宿主上下文”。
      if (isDevManualMode) {
        applyPartListWithSelection([], { autoSelectFirstPart });
        if (includePartName) {
          store.setError("请输入制造令号后刷新");
        }
      } else {
        applyPartListWithSelection(contextParts, { autoSelectFirstPart });
      }
      // 刷新后保持默认未勾选，避免自动全选触发误操作。
      store.setSelectedParts([]);
      return;
    }

    // 刷新按钮场景附带 command 条零件名称，满足后端按零件名称过滤需求。
    const requestParams = {
      moldOrderNum: currentMoldOrderNum,
      ...(includePartName ? { pName: resolveCommandPartName() } : {})
    };
    const response = await queryPartListByOrderNum(requestParams);
    const rows = normalizeListResponse(response);
    // 开发手输模式只展示查询结果；打包态保留 ERP + IPC 匹配逻辑。
    const nextRows = enableIpcPartMatching ? mergeContextAndErpParts(contextParts, rows) : rows;
    applyPartListWithSelection(nextRows, { autoSelectFirstPart });
    store.setSelectedParts([]);
  } catch (error) {
    if (isDevManualMode) {
      // 开发手输模式下严格不使用 IPC 列表，查询失败时直接置空并提示。
      applyPartListWithSelection([], { autoSelectFirstPart });
      store.setError(`加载零件列表失败: ${error}`);
    } else {
      // 打包态维持原容错策略：查询失败时回退 IPC，保障页面可继续操作。
      applyPartListWithSelection(contextParts, { autoSelectFirstPart });
      store.setError(`加载零件列表失败，已使用上下文兜底: ${error}`);
    }
    store.setSelectedParts([]);
  } finally {
    store.loading = false;
  }
}

/**
 * 零件列表卡片刷新入口：按业务要求附带 command 条零件名称参数。
 */
async function handlePartListRefresh() {
  // 手动刷新时先清空选中，避免刷新后沿用旧选中导致看起来“默认锁定第一条”。
  store.setSelectedPart(null);
  await loadPageData({ includePartName: true, autoSelectFirstPart: false });
}

/**
 * 加载当前选中零件对应的工艺与参数。
 */
async function loadCraftAndParams() {
  if (!store.selectedPart) {
    clearSelectedPartDetailState();
    return;
  }

  await Promise.all([loadCraftByPart(), loadParamsByPart()]);
}

/**
 * 同步零件列表并按 pcode 尽量保持当前选中项，避免刷新后选中状态错位。
 * @param {object[]} nextParts 新零件列表。
 */
function applyPartListWithSelection(nextParts, options = {}) {
  const { autoSelectFirstPart = true } = options;
  const normalizedList = Array.isArray(nextParts) ? nextParts : [];
  const previousSelectedCode = normalizePartCode(getPartCode(store.selectedPart));
  const nextSelectedPart = resolveSelectedPartAfterSync({
    partList: normalizedList,
    previousSelectedCode,
    autoSelectFirst: autoSelectFirstPart,
    resolvePartCode: (part) => normalizePartCode(getPartCode(part))
  });
  store.parts = normalizedList;
  store.setSelectedPart(nextSelectedPart);
}

/**
 * 当当前零件为空时，清空右侧明细区，避免残留上次选中的工艺与参数。
 */
function clearSelectedPartDetailState() {
  store.craftList = [];
  store.paramsList = [];
  store.setSelectedCraft(null);
  craftSelections.value = [];
  resetCraftForm();
}

/**
 * 获取用于批量操作的零件集合。
 * 优先使用表格勾选集合，若为空则回退当前选中零件。
 * @returns {object[]}
 */
function getOperatePartList() {
  if (store.selectedParts.length > 0) {
    return store.selectedParts;
  }
  if (store.selectedPart) {
    return [store.selectedPart];
  }
  return [];
}

/**
 * 工艺模板匹配确认回调。
 * @param {{templateId:number|string}} payload 模板参数。
 */
async function handleTemplateConfirm(payload) {
  const templateId = payload?.templateId ?? null;
  const partList = getOperatePartList();
  if (!templateId) {
    store.setError("请选择模板");
    return;
  }
  if (partList.length === 0) {
    store.setError("请选择零件");
    return;
  }

  const formData = new FormData();
  formData.append("templateId", JSON.stringify(templateId));
  formData.append("partList", JSON.stringify(partList));

  store.loading = true;
  store.clearError();
  try {
    await savePartsCraft(formData);
    openTemplateDialog.value = false;
    await loadPageData();
  } catch (error) {
    store.setError(`匹配工艺模板失败: ${error}`);
  } finally {
    store.loading = false;
  }
}

/**
 * 工艺模板匹配取消回调。
 */
function handleTemplateCancel() {
  openTemplateDialog.value = false;
}

/**
 * 历史模板匹配确认回调。
 * @param {{mouldMakeOrder:string,isReference:string}} payload 历史模板参数。
 */
async function handleHistoryConfirm(payload) {
  const mouldMakeOrder = payload?.mouldMakeOrder ?? "";
  const isReference = payload?.isReference ?? "";
  const partList = getOperatePartList();

  if (!mouldMakeOrder) {
    store.setError("请选择制造令号");
    return;
  }
  if (!isReference) {
    store.setError("请选择是否引用工时");
    return;
  }
  if (partList.length === 0) {
    store.setError("请选择零件");
    return;
  }

  const formData = new FormData();
  formData.append("mouldMakeOrder", JSON.stringify(mouldMakeOrder));
  formData.append("isReference", JSON.stringify(isReference));
  formData.append("partList", JSON.stringify(partList));

  store.loading = true;
  store.clearError();
  try {
    await saveHistoryTemCraft(formData);
    openHistoryDialog.value = false;
    await loadPageData();
  } catch (error) {
    store.setError(`匹配历史模板失败: ${error}`);
  } finally {
    store.loading = false;
  }
}

/**
 * 历史模板匹配取消回调。
 */
function handleHistoryCancel() {
  openHistoryDialog.value = false;
}

/**
 * 加载工艺列表。
 */
async function loadCraftByPart() {
  const partId = getPartId(store.selectedPart);
  if (!partId) {
    return;
  }

  try {
    // 记录请求发起时零件上下文，避免异步返回后覆写到其他零件。
    const requestPartId = partId;
    const response = await getOrderByPartId2({ partId, mouldMakeOrder: resolveMoldOrderNum() || undefined });
    if (getPartId(store.selectedPart) !== requestPartId) {
      return;
    }

    // 使用“响应返回时”的最新选中工艺，避免用户首次点击被旧快照覆盖。
    const currentSelectedCraftId = resolveCraftPrimaryKey(store.selectedCraft);
    store.craftList = normalizeListResponse(response);
    craftSelections.value = [];
    if (store.craftList.length === 0) {
      store.setSelectedCraft(null);
      resetCraftForm();
      return;
    }

    const matchedCraft = store.craftList.find((item) => resolveCraftPrimaryKey(item) === currentSelectedCraftId);
    if (!matchedCraft) {
      store.setSelectedCraft(null);
      resetCraftForm();
      return;
    }
    store.setSelectedCraft(matchedCraft);
    await loadCraftDetail(matchedCraft);
  } catch (error) {
    store.setError(`加载工艺数据失败: ${error}`);
  }
}

/**
 * 加载参数列表。
 */
async function loadParamsByPart() {
  const partId = getPartId(store.selectedPart);
  if (!partId) {
    return;
  }

  try {
    const response = await getMaintenanceParams(partId);
    store.paramsList = normalizeListResponse(response);
  } catch (error) {
    store.setError(`加载参数数据失败: ${error}`);
  }
}

/**
 * 点击零件行时切换当前上下文并重载详情。
 * @param {object} part 零件对象。
 */
async function handlePartClick(part) {
  store.setSelectedPart(part);
  await loadCraftAndParams();
}

/**
 * 工艺行点击后写入编辑表单并加载工序明细。
 * @param {object} craft 工艺对象。
 */
async function handleCraftClick(craft) {
  store.setSelectedCraft(craft);
  // 切换工艺时先清空工序候选，避免误用上一条工艺缓存。
  processContentOptions.value = [];
  await loadCraftDetail(craft);
}

/**
 * 保存工艺编辑。
 */
async function submitChangeCraftForm(options = {}) {
  const { skipActionConfirm = false } = options;
  const craftId = resolveCraftPrimaryKey(store.selectedCraft);
  if (!hasUsablePrimaryKey(craftId)) {
    store.setError("请先选择要编辑的工艺");
    return;
  }

  const duration = Number(craftForm.duration);
  if (!Number.isFinite(duration) || duration <= 0 || duration > store.craftList.length + 1) {
    store.setError("顺序不合理，请检查后重试");
    return;
  }
  if (!skipActionConfirm) {
    openActionConfirm(actionConfirmTypes.saveCraftParams);
    return;
  }

  store.loading = true;
  store.clearError();

  try {
    await updateCraft({ ...store.selectedCraft, ...craftForm, id: craftId, duration });
    await loadCraftByPart();
    await restoreSelectedCraftById(craftId);
  } catch (error) {
    store.setError(`保存工艺失败: ${error}`);
  } finally {
    store.loading = false;
  }
}

/**
 * 刷新工艺列表。
 */
async function refreshCraft() {
  await loadCraftByPart();
}

/**
 * 打开添加工艺弹窗并加载工艺模板列表。
 */
async function openAddCraftDialog() {
  const partId = getPartId(store.selectedPart);
  if (!partId) {
    store.setError("请先选择零件");
    return;
  }

  resetCraftCreateForm(partId);
  store.loading = true;
  store.clearError();
  try {
    const response = await selectCraftPTList(partId);
    standardCraftOptions.value = normalizeListResponse(response);
    openCraftFormDialog.value = true;
  } catch (error) {
    store.setError(`加载工艺模板失败: ${error}`);
  } finally {
    store.loading = false;
  }
}

/**
 * 工艺模板选择后回填工艺内容与编码关联信息。
 */
function handleSelectCraftTemplate() {
  const selectedId = craftCreateForm.partRoutingId;
  if (!selectedId) {
    craftCreateForm.craftContent = "";
    craftCreateForm.isProgram = "";
    return;
  }
  const matched = standardCraftOptions.value.find((item) => item.standardCraftId === selectedId);
  if (!matched) {
    return;
  }
  craftCreateForm.craftContent = matched.craftContent ?? "";
  craftCreateForm.isProgram = matched.isProgram ?? "";
}

/**
 * 提交新增工艺。
 */
async function submitCraftForm() {
  const partId = getPartId(store.selectedPart);
  if (!partId) {
    store.setError("请先选择零件");
    return;
  }
  if (!craftCreateForm.partRoutingId) {
    store.setError("请选择工艺名称");
    return;
  }

  const duration = Number(craftCreateForm.duration);
  if (!Number.isFinite(duration) || duration <= 0 || duration > store.craftList.length + 2) {
    store.setError("顺序不合理，请检查后重试");
    return;
  }

  store.loading = true;
  store.clearError();
  try {
    await addCraft({
      ...craftCreateForm,
      partId,
      duration
    });
    openCraftFormDialog.value = false;
    await loadCraftByPart();
  } catch (error) {
    store.setError(`新增工艺失败: ${error}`);
  } finally {
    store.loading = false;
  }
}

/**
 * 删除已选工艺（与 Vue2 批量删除行为保持一致）。
 */
async function handleDeleteCraft(options = {}) {
  const { skipActionConfirm = false } = options;
  if (store.selectedParts.length === 0) {
    store.setError("请选择零件");
    return;
  }
  if (craftSelections.value.length === 0) {
    store.setError("请选择工艺");
    return;
  }
  if (!skipActionConfirm) {
    openActionConfirm(actionConfirmTypes.deleteCraft);
    return;
  }

  const formData = new FormData();
  formData.append("samMouldPartList", JSON.stringify(store.selectedParts));
  formData.append("craftList", JSON.stringify(craftSelections.value));

  store.loading = true;
  store.clearError();
  try {
    await deleteBachListByPartIdAndRoutingId(formData);
    craftSelections.value = [];
    await loadCraftByPart();
  } catch (error) {
    store.setError(`删除工艺失败: ${error}`);
  } finally {
    store.loading = false;
  }
}

/**
 * 加载工艺详情与工序列表。
 * @param {object} craft 工艺对象。
 */
async function loadCraftDetail(craft) {
  const craftId = resolveCraftPrimaryKey(craft);
  if (!hasUsablePrimaryKey(craftId)) {
    return;
  }
  const requestCraftId = craftId;

  try {
    const detailResponse = await getOrderById(craftId);
    // 仅当响应仍归属当前选中工艺时才更新表单，避免异步竞态覆盖。
    if (resolveCraftPrimaryKey(store.selectedCraft) !== requestCraftId) {
      return;
    }
    const detail = normalizeDetailResponse(detailResponse);
    craftForm.id = resolveCraftPrimaryKey(detail) ?? craftId;
    craftForm.isAuto = valueFromAliases(detail, ["isAuto"], "");
    craftForm.isNeed = valueFromAliases(detail, ["isNeed"], "");
    craftForm.duration = valueFromAliases(detail, ["duration", "seq"], "");
    craftForm.plnDate = valueFromAliases(detail, ["plnDate", "planDate"], "");
    craftForm.shareManStandardHours = valueFromAliases(detail, ["shareManStandardHours"], "");
    craftForm.shareMachineryStandardHours = valueFromAliases(detail, ["shareMachineryStandardHours"], "");
    craftForm.remark = valueFromAliases(detail, ["remark"], "");
    craftForm.processContentEntityList = Array.isArray(detail.processContentEntityList) ? detail.processContentEntityList : [];
    selectedProduction.value = null;

    const craftCode = resolveCraftCodeFromContext({
      detail,
      craft,
      routingId: valueFromAliases(craft, ["partRoutingId", "part_routing_id", "standardCraftId"], null),
      standardCraftOptions: standardCraftOptions.value
    });
    await loadProcessContentOptions(craftCode);
    await loadReferenceDetailsByOrderId(craftForm.id);
  } catch (error) {
    store.setError(`加载工艺详情失败: ${error}`);
  }
}

/**
 * 特殊性要求展示文案，空值时提示可编辑。
 * @param {object} row 工艺行。
 * @returns {string}
 */
function specialRequirementDisplayText(row) {
  const text = valueFromAliases(row, ["specialRequirement"], "");
  return text ? String(text) : "点击编辑";
}

/**
 * 打开特殊性要求编辑弹窗。
 * @param {object} row 工艺行数据。
 */
function openSpecialRequirementDialogByCraft(row) {
  const craftId = resolveCraftPrimaryKey(row);
  if (!hasUsablePrimaryKey(craftId)) {
    store.setError("当前工艺缺少主键，无法编辑特殊性要求");
    return;
  }
  specialRequirementForm.id = craftId;
  specialRequirementForm.specialRequirement = valueFromAliases(row, ["specialRequirement"], "");
  openSpecialRequirementDialog.value = true;
}

/**
 * 提交特殊性要求编辑。
 */
async function submitSpecialRequirement() {
  if (!specialRequirementForm.id) {
    store.setError("请先选择工艺");
    return;
  }
  specialRequirementLoading.value = true;
  store.clearError();
  try {
    await editSpecialRequirement({
      id: specialRequirementForm.id,
      specialRequirement: specialRequirementForm.specialRequirement
    });
    openSpecialRequirementDialog.value = false;
    await loadCraftByPart();
    await restoreSelectedCraftById(specialRequirementForm.id);
  } catch (error) {
    store.setError(`保存特殊性要求失败: ${error}`);
  } finally {
    specialRequirementLoading.value = false;
  }
}

/**
 * 取消特殊性要求编辑并复位表单。
 */
function cancelSpecialRequirementDialog() {
  specialRequirementForm.id = null;
  specialRequirementForm.specialRequirement = "";
  openSpecialRequirementDialog.value = false;
}

/**
 * 根据工艺编码加载可选工序内容。
 * @param {string} craftCode 工艺编码。
 */
async function loadProcessContentOptions(craftCode) {
  const normalizedCraftCode = String(craftCode ?? "").trim();
  if (!normalizedCraftCode) {
    processContentOptions.value = [];
    return;
  }
  const response = await selectReferenceDetailListByCraftCode(normalizedCraftCode);
  const optionList = normalizeListResponse(response);
  if (optionList.length > 0) {
    processContentOptions.value = optionList;
  } else {
    // 兼容接口在 total=1 时直接返回单对象的场景，避免下拉候选被误判为空。
    const singleOption = normalizeDetailResponse(response);
    processContentOptions.value =
      singleOption && typeof singleOption === "object" && Object.keys(singleOption).length > 0 ? [singleOption] : [];
  }
}

/**
 * 根据工艺订单 ID 拉取工序明细表。
 * @param {number|string|null} orderId 工艺订单 ID。
 */
async function loadReferenceDetailsByOrderId(orderId) {
  if (!hasUsablePrimaryKey(orderId)) {
    craftForm.processContentEntityList = [];
    return;
  }
  const response = await getReferenceDetailListByOrderId(orderId);
  craftForm.processContentEntityList = normalizeListResponse(response);
}

/**
 * 工序行点击选择。
 * @param {object} row 工序行对象。
 */
function handleProductionClick(row) {
  selectedProduction.value = row;
}

/**
 * 打开添加工序弹窗。
 */
async function openAddProductionDialog() {
  if (!store.selectedCraft) {
    store.setError("请先选择工艺");
    return;
  }
  if (!hasUsablePrimaryKey(selectedCraftPrimaryKey.value)) {
    store.setError("当前工艺缺少主键，无法添加工序");
    return;
  }

  // 若详情未就绪或仍是上一条工艺快照，先补齐当前工艺详情。
  if (!hasUsablePrimaryKey(craftForm.id) || !isSamePrimaryKey(craftForm.id, selectedCraftPrimaryKey.value)) {
    await loadCraftDetail(store.selectedCraft);
    // 详情接口异常时，回退使用列表行主键，保证弹窗可以正常进入。
    if (!hasUsablePrimaryKey(craftForm.id)) {
      craftForm.id = selectedCraftPrimaryKey.value;
    }
  }

  // 与原项目行为对齐：每次打开弹窗都按当前工艺重新拉取可选工序，避免缓存错位。
  try {
    const selectedCraftCode = resolveCraftCodeFromContext({
      craft: store.selectedCraft,
      routingId: valueFromAliases(store.selectedCraft, ["partRoutingId", "part_routing_id", "standardCraftId"], null),
      standardCraftOptions: standardCraftOptions.value
    });
    await loadProcessContentOptions(selectedCraftCode);
  } catch (error) {
    store.setError(`加载工序候选失败: ${error}`);
  }
  isDeleteProduction.value = false;
  productionForm.processId = null;
  productionForm.manResult = "";
  productionForm.machineryResult = "";
  openProductionDialog.value = true;
}

/**
 * 打开删除工序弹窗并回填选中工序。
 */
async function openDeleteProductionDialog() {
  if (!store.selectedCraft) {
    store.setError("请先选择工艺");
    return;
  }
  if (!hasUsablePrimaryKey(selectedCraftPrimaryKey.value)) {
    store.setError("当前工艺缺少主键，无法删除工序");
    return;
  }

  if (!hasUsablePrimaryKey(craftForm.id) || !isSamePrimaryKey(craftForm.id, selectedCraftPrimaryKey.value)) {
    await loadCraftDetail(store.selectedCraft);
    if (!hasUsablePrimaryKey(craftForm.id)) {
      craftForm.id = selectedCraftPrimaryKey.value;
    }
  }

  if (!selectedProduction.value) {
    store.setError("请选择工序");
    return;
  }
  // 与原项目行为对齐：每次打开弹窗都按当前工艺重新拉取可选工序，避免缓存错位。
  try {
    const selectedCraftCode = resolveCraftCodeFromContext({
      craft: store.selectedCraft,
      routingId: valueFromAliases(store.selectedCraft, ["partRoutingId", "part_routing_id", "standardCraftId"], null),
      standardCraftOptions: standardCraftOptions.value
    });
    await loadProcessContentOptions(selectedCraftCode);
  } catch (error) {
    store.setError(`加载工序候选失败: ${error}`);
  }
  isDeleteProduction.value = true;
  productionForm.processId = valueFromAliases(selectedProduction.value, ["id", "processId", "process_id"], null);
  productionForm.manResult = valueFromAliases(selectedProduction.value, ["smsh"], "");
  productionForm.machineryResult = valueFromAliases(selectedProduction.value, ["smch"], "");
  openProductionDialog.value = true;
}

/**
 * 关闭工序操作弹窗并复位表单。
 */
function cancelProductionDialog() {
  isDeleteProduction.value = false;
  productionForm.processId = null;
  productionForm.manResult = "";
  productionForm.machineryResult = "";
  openProductionDialog.value = false;
}

/**
 * 提交工序新增/删除。
 */
async function submitProduction() {
  const activeCraftId = hasUsablePrimaryKey(selectedCraftPrimaryKey.value) ? selectedCraftPrimaryKey.value : craftForm.id;
  if (!hasUsablePrimaryKey(activeCraftId)) {
    store.setError("请先选择工艺");
    return;
  }
  if (!hasUsablePrimaryKey(productionForm.processId)) {
    store.setError("请选择工序");
    return;
  }

  const params = {
    id: productionForm.processId,
    orderId: activeCraftId,
    manResult: productionForm.manResult || 0,
    machineryResult: productionForm.machineryResult || 0
  };
  const operatePartList = getOperatePartList();
  const isBatchMode = operatePartList.length > 1;

  store.loading = true;
  store.clearError();
  try {
    // 删除工序前，先做工时下限校验，保持和旧页面一致。
    if (isDeleteProduction.value) {
      const manResult = Number(params.manResult) || 0;
      const machineryResult = Number(params.machineryResult) || 0;
      const manHours = Number(craftForm.shareManStandardHours) || 0;
      const machineryHours = Number(craftForm.shareMachineryStandardHours) || 0;
      if (manHours - manResult < 0 || machineryHours - machineryResult < 0) {
        store.setError("工时不合理，请检查后重试");
        return;
      }
    }

    if (isBatchMode) {
      const formData = new FormData();
      formData.append("samMesPartsOrder", JSON.stringify(store.selectedCraft ?? { id: activeCraftId }));
      formData.append("samMoldJobReferenceDetail", JSON.stringify(params));
      formData.append("partList", JSON.stringify(operatePartList));

      if (isDeleteProduction.value) {
        await deleteProductionList(formData);
      } else {
        await addProductionList(formData);
      }
    } else {
      if (isDeleteProduction.value) {
        await deleteProduction(params);
      } else {
        await addProduction(params);
      }
    }
    cancelProductionDialog();
    await loadReferenceDetailsByOrderId(activeCraftId);
    await restoreSelectedCraftById(activeCraftId);
  } catch (error) {
    store.setError(`${isDeleteProduction.value ? "删除" : "添加"}工序失败: ${error}`);
  } finally {
    store.loading = false;
  }
}

/**
 * 依据工艺 ID 恢复当前选中工艺并同步详情。
 * @param {number|string|null} craftId 工艺 ID。
 */
async function restoreSelectedCraftById(craftId) {
  if (!hasUsablePrimaryKey(craftId)) {
    return;
  }
  const matched = store.craftList.find((item) => resolveCraftPrimaryKey(item) === craftId);
  if (!matched) {
    store.setSelectedCraft(null);
    resetCraftForm();
    return;
  }
  store.setSelectedCraft(matched);
  await loadCraftDetail(matched);
}

/**
 * 重置工艺参数编辑状态，避免跨零件残留旧工艺数据。
 */
function resetCraftForm() {
  craftForm.id = null;
  craftForm.isAuto = "";
  craftForm.isNeed = "";
  craftForm.duration = "";
  craftForm.plnDate = "";
  craftForm.shareManStandardHours = "";
  craftForm.shareMachineryStandardHours = "";
  craftForm.remark = "";
  craftForm.processContentEntityList = [];
  selectedProduction.value = null;
  processContentOptions.value = [];
}

/**
 * 重置新增工艺表单。
 * @param {number|string|null} partId 零件 ID。
 */
function resetCraftCreateForm(partId) {
  craftCreateForm.partId = partId ?? null;
  craftCreateForm.partRoutingId = null;
  craftCreateForm.craftContent = "";
  craftCreateForm.isProgram = "";
  craftCreateForm.isNeed = "N";
  craftCreateForm.isAuto = "N";
  craftCreateForm.duration = "";
  craftCreateForm.shareManStandardHours = "";
  craftCreateForm.shareMachineryStandardHours = "";
  craftCreateForm.plnDate = "";
  craftCreateForm.remark = "";
}

/**
 * 保存参数交付值。
 */
async function submitChangeParams(options = {}) {
  const { skipDiffConfirm = false, skipActionConfirm = false } = options;
  const partId = getPartId(store.selectedPart);
  if (!partId) {
    store.setError("请先选择零件");
    return;
  }

  if (store.paramsList.length === 0 || store.loading) {
    return;
  }

  if (!skipDiffConfirm) {
    const confirmPayload = buildPartParamSaveConfirmPayload(partParamDiffModel.value);
    if (confirmPayload.shouldConfirm) {
      partParamSaveConfirmSummary.value = confirmPayload.summaryText;
      partParamSaveConfirmDetails.value = confirmPayload.detailLines;
      partParamSaveConfirmDetailItems.value = confirmPayload.detailItems;
      isPartParamSaveDetailExpanded.value = false;
      openPartParamSaveConfirmDialog.value = true;
      return;
    }
  }
  if (!skipActionConfirm) {
    openActionConfirm(actionConfirmTypes.savePartParams);
    return;
  }

  resetPartParamSaveConfirmState();
  await persistPartParams(partId);
}

/**
 * 用户在差异确认弹窗中选择“仍然保存”。
 */
async function confirmPartParamSaveWithDiff() {
  openPartParamSaveConfirmDialog.value = false;
  await submitChangeParams({ skipDiffConfirm: true, skipActionConfirm: true });
}

/**
 * 用户取消参数保存（保留当前编辑值，不触发接口）。
 */
function cancelPartParamSaveWithDiff() {
  openPartParamSaveConfirmDialog.value = false;
  resetPartParamSaveConfirmState();
}

/**
 * 清理参数保存确认态，避免下次弹窗复用旧文案。
 */
function resetPartParamSaveConfirmState() {
  partParamSaveConfirmSummary.value = "";
  partParamSaveConfirmDetails.value = [];
  partParamSaveConfirmDetailItems.value = [];
  isPartParamSaveDetailExpanded.value = false;
}

/**
 * 差异明细展开/收起切换。
 */
function togglePartParamSaveDetailExpanded() {
  isPartParamSaveDetailExpanded.value = !isPartParamSaveDetailExpanded.value;
}

/**
 * 调用后端接口持久化当前参数列表。
 * @param {number|string} partId 零件主键。
 */
async function persistPartParams(partId) {
  const formData = new FormData();
  formData.append("partId", JSON.stringify(partId));
  formData.append("paramsList", JSON.stringify(store.paramsList));

  store.loading = true;
  store.clearError();

  try {
    await changeParams(formData);
    await loadParamsByPart();
  } catch (error) {
    store.setError(`保存参数失败: ${error}`);
  } finally {
    store.loading = false;
  }
}

/**
 * 用 IPC paramList 覆盖当前服务器参数中的可匹配项（不自动保存）。
 */
function handleApplyUgParams() {
  if (isApplyUgParamsDisabled.value) {
    return;
  }
  store.paramsList = applyIpcParamListToServerParams({
    serverParams: store.paramsList,
    ipcParams: selectedPartIpcParamList.value
  });
}

/**
 * 发布当前多选零件。
 */
async function handleReleasePartOrder(options = {}) {
  const { skipActionConfirm = false } = options;
  if (store.selectedParts.length === 0) {
    store.setError("请选择待发布零件");
    return;
  }

  const hasUncompiledParts = store.selectedParts.some((item) => String(item.isRelease ?? "") !== "2");
  if (hasUncompiledParts) {
    store.setError("未编制工艺零件不允许发布");
    return;
  }
  if (!skipActionConfirm) {
    openActionConfirm(actionConfirmTypes.releasePartOrder);
    return;
  }

  const formData = new FormData();
  formData.append("selectPartList", JSON.stringify(store.selectedParts));

  store.loading = true;
  store.clearError();

  try {
    await releasePartOrder(formData);
    await loadPartList();
    await loadCraftAndParams();
  } catch (error) {
    store.setError(`发布失败: ${error}`);
  } finally {
    store.loading = false;
  }
}

/**
 * 上传文件选择事件。
 * @param {File[]} files 文件列表。
 */
function handleFileChange(files) {
  const localUploadFiles = files.filter((file) => validateImageFile(file));
  if (ugReferenceFile.value) {
    uploadFiles.value = [...localUploadFiles, ugReferenceFile.value];
    return;
  }
  uploadFiles.value = localUploadFiles;
}

/**
 * 以“UG引用”方式将单选零件中的 base64 转成上传文件并加入列表。
 */
function handleUgReferenceClick() {
  if (store.selectedParts.length !== 1) {
    store.setError("上传图片仅支持单选零件");
    return;
  }

  const selectedPart = store.selectedParts[0];
  const rawBase64 = String(selectedPart?.base64 ?? "");
  const importPartCode = getPartImportPartCode(selectedPart);
  if (!importPartCode) {
    store.setError("UG引用失败：当前零件缺少 importPartCode，无法匹配后端上传规则");
    return;
  }
  try {
    const { file, previewUrl } = decodeBase64ImageToFile({
      rawBase64,
      importPartCode
    });
    replaceUgReferenceFile(file);
    ugPreviewUrl.value = previewUrl;
    store.clearError();
  } catch (error) {
    store.setError(error instanceof Error ? error.message : `UG引用失败: ${error}`);
  }
}

/**
 * 替换当前 UG 引用文件，避免重复点击导致同类文件堆积。
 * @param {File} nextUgFile 新生成的 UG 引用文件。
 */
function replaceUgReferenceFile(nextUgFile) {
  const filesWithoutUg = uploadFiles.value.filter((file) => file !== ugReferenceFile.value);
  ugReferenceFile.value = nextUgFile;
  uploadFiles.value = [...filesWithoutUg, nextUgFile];
}

/**
 * 重置上传弹窗草稿状态，避免历史预览与文件残留。
 */
function resetUploadDraftState() {
  uploadFiles.value = [];
  ugReferenceFile.value = null;
  ugPreviewUrl.value = "";
}

/**
 * 提交图片上传。
 */
async function submitUpload() {
  if (store.selectedParts.length !== 1) {
    store.setError("上传图片仅支持单选零件");
    return;
  }

  if (uploadFiles.value.length === 0) {
    store.setError("请先选择上传图片");
    return;
  }

  const selectedPart = store.selectedParts[0];
  const partId = getPartId(selectedPart);
  if (partId === null || partId === undefined || partId === "") {
    store.setError("未获取到零件ID，无法上传图片");
    return;
  }

  const formData = buildUploadImageFormData({
    part: selectedPart,
    files: uploadFiles.value
  });

  store.loading = true;
  store.clearError();

  try {
    await upLoadFileList(formData);
    resetUploadDraftState();
    openUploadDialog.value = false;
  } catch (error) {
    store.setError(`上传失败: ${error}`);
  } finally {
    store.loading = false;
  }
}

/**
 * 更新参数交付值。
 * @param {number} index 参数索引。
 * @param {string|number} value 输入值。
 */
function updateParamDeliverValue(index, value) {
  store.paramsList[index].paramDeliverValue = value;
}

/**
 * 规范化交付值，防止负数或无效值。
 * @param {number} index 参数索引。
 */
function normalizeParamDeliverValue(index) {
  const currentValue = Number(store.paramsList[index].paramDeliverValue);
  if (!Number.isFinite(currentValue) || currentValue < 0) {
    store.paramsList[index].paramDeliverValue = 0;
  }
}

/**
 * 判断零件是否被选中。
 * @param {object} part 零件对象。
 * @returns {boolean}
 */
function isSelectedPart(part) {
  const partId = getPartId(part);
  if (partId === null || partId === undefined || partId === "") {
    return false;
  }
  return store.selectedParts.some((item) => getPartId(item) === partId);
}

/**
 * 单个零件选择切换。
 * @param {object} part 零件对象。
 * @param {boolean} checked 勾选状态。
 */
function togglePartSelection(part, checked) {
  const partId = getPartId(part);

  if (checked) {
    if (!isSelectedPart(part)) {
      store.setSelectedParts([...store.selectedParts, part]);
    }
    return;
  }

  store.setSelectedParts(store.selectedParts.filter((item) => getPartId(item) !== partId));
}

/**
 * 零件表全选切换。
 * @param {boolean} checked 勾选状态。
 */
function toggleAllPartSelection(checked) {
  store.setSelectedParts(nextSelectionAfterToggleAll(selectablePartRows.value, checked));
}

/**
 * 判断工艺是否被勾选。
 * @param {object} craft 工艺对象。
 * @returns {boolean}
 */
function isSelectedCraft(craft) {
  const craftId = resolveCraftPrimaryKey(craft);
  return craftSelections.value.some((item) => resolveCraftPrimaryKey(item) === craftId);
}

/**
 * 工艺勾选切换。
 * @param {object} craft 工艺对象。
 * @param {boolean} checked 勾选状态。
 */
function toggleCraftSelection(craft, checked) {
  const craftId = resolveCraftPrimaryKey(craft);
  if (!hasUsablePrimaryKey(craftId)) {
    return;
  }
  if (checked) {
    if (!isSelectedCraft(craft)) {
      craftSelections.value = [...craftSelections.value, craft];
    }
    return;
  }
  craftSelections.value = craftSelections.value.filter((item) => resolveCraftPrimaryKey(item) !== craftId);
}

/**
 * 工艺表全选切换。
 * @param {boolean} checked 勾选状态。
 */
function toggleAllCraftSelection(checked) {
  craftSelections.value = nextSelectionAfterToggleAll(selectableCraftRows.value, checked);
}

/**
 * 零件行样式：区分当前点击行与批量勾选行。
 * @param {object} row 行数据。
 * @returns {string}
 */
function partRowClassName(row) {
  const selectionState = resolvePartRowSelectionState({
    row,
    selectedPart: store.selectedPart,
    selectedParts: store.selectedParts
  });
  const classNames = [];
  if (selectionState.isChecked) {
    classNames.push("app-row-checked");
  }
  if (selectionState.isCurrent) {
    classNames.push("app-row-current");
  }
  return classNames.join(" ");
}

/**
 * 统一零件行主键，兼容 partId / id。
 * @param {object} row 行数据。
 * @param {number} index 行索引。
 * @returns {string|number}
 */
function partRowKey(row, index) {
  return getPartId(row) ?? index;
}

/**
 * 工艺行主键解析，兼容多种后端主键字段。
 * @param {object} row 行数据。
 * @param {number} index 行索引。
 * @returns {string|number}
 */
function craftRowKey(row, index) {
  return resolveCraftPrimaryKey(row) ?? index;
}

/**
 * 工艺行样式：区分当前点击行与批量勾选行。
 * @param {object} row 行数据。
 * @returns {string}
 */
function craftRowClassName(row) {
  const selectionState = resolveCraftRowSelectionState({
    row,
    selectedCraft: store.selectedCraft,
    selectedCrafts: craftSelections.value
  });
  const classNames = [];
  if (selectionState.isChecked) {
    classNames.push("app-row-checked");
  }
  if (selectionState.isCurrent) {
    classNames.push("app-row-current");
  }
  return classNames.join(" ");
}

/**
 * 参数行样式：对“仅服务器存在”的行做弱告警提示。
 * @param {object} row 行数据。
 * @param {number} index 行索引。
 * @returns {string}
 */
function partParamRowClassName(row, index) {
  const rowKey = paramRowKey(row, index);
  const rowDiff = partParamDiffModel.value.rowDiffByKey?.[rowKey];
  if (!rowDiff) {
    return "";
  }
  if (rowDiff.status === "server_only") {
    return "app-param-row-server-only";
  }
  if (rowDiff.status === "matched_diff") {
    return "app-param-row-diff";
  }
  return "";
}

/**
 * 参数单元格样式：仅对差异字段打高亮。
 * @param {{row:object,column:object,rowIndex:number}} context 单元格上下文。
 * @returns {string}
 */
function partParamCellClassName(context) {
  const { row, column, rowIndex } = context;
  const rowKey = paramRowKey(row, rowIndex);
  const rowDiff = partParamDiffModel.value.rowDiffByKey?.[rowKey];
  if (!rowDiff || rowDiff.status !== "matched_diff") {
    return "";
  }
  const fieldKey = String(column?.key ?? "");
  return rowDiff.diffFields.includes(fieldKey) ? "app-param-cell-diff" : "";
}

/**
 * 参数行主键解析，兼容 paramCode / id。
 * @param {object} row 行数据。
 * @param {number} index 行索引。
 * @returns {string|number}
 */
function paramRowKey(row, index) {
  return valueFromAliases(row, ["paramCode", "id", "code"], index);
}

/**
 * 参数保存差异明细表行主键解析。
 * @param {object} row 行数据。
 * @param {number} index 行索引。
 * @returns {string|number}
 */
function partParamSaveDetailRowKey(row, index) {
  return row?.id ?? index;
}

/**
 * 工序行主键解析。
 * @param {object} row 行数据。
 * @param {number} index 行索引。
 * @returns {string|number}
 */
function productionRowKey(row, index) {
  return valueFromAliases(row, ["id", "processId", "process_id", "req"], index);
}

/**
 * 工序行样式，高亮当前选中项。
 * @param {object} row 行数据。
 * @returns {string}
 */
function productionRowClassName(row) {
  const rowId = productionRowKey(row, -1);
  const selectedId = selectedProduction.value ? productionRowKey(selectedProduction.value, -1) : null;
  return rowId === selectedId ? "app-row-selected" : "";
}

/**
 * 发布状态文案格式化。
 * @param {string|number} isRelease 发布状态值。
 * @returns {string}
 */
function formatReleaseStatus(isRelease) {
  return formatDictLabel(isRelease, releaseStatusDictMap.value, releaseStatusFallbackMap);
}

/**
 * 是/否值格式化。
 * @param {string|number|null|undefined} value 值。
 * @returns {string}
 */
function formatYesNo(value) {
  return formatYesNoLabel(value, yesNoDictMap.value, yesNoFallbackMap);
}

/**
 * 零件类型格式化。
 * @param {string|number|null|undefined} value 类型编码。
 * @returns {string}
 */
function formatPartCategory(value) {
  return formatDictLabel(value, partCategoryDictMap.value, partCategoryFallbackMap);
}

/**
 * 工艺类型格式化。
 * @param {string|number|null|undefined} value 类型编码。
 * @returns {string}
 */
function formatCraftType(value) {
  return formatDictLabel(value, craftTypeDictMap.value, craftTypeFallbackMap);
}

/**
 * 从多个候选字段中读取值，优先返回首个有效字段。
 * @param {object} row 行对象。
 * @param {string[]} keys 候选字段名。
 * @param {any} fallback 默认值。
 * @returns {any}
 */
function valueFromAliases(row, keys, fallback = "-") {
  if (!row || !Array.isArray(keys)) {
    return fallback;
  }
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return fallback;
}

/**
 * 比对两个主键是否为同一条记录，兼容 number/string 类型差异。
 * @param {string|number|null|undefined} left 主键值 A。
 * @param {string|number|null|undefined} right 主键值 B。
 * @returns {boolean}
 */
function isSamePrimaryKey(left, right) {
  if (!hasUsablePrimaryKey(left) || !hasUsablePrimaryKey(right)) {
    return false;
  }
  return String(left) === String(right);
}

/**
 * 根据值读取选项标签，缺失时回退到值本身或占位符。
 * @param {string|number|null|undefined} value 选项值。
 * @param {{label:string,value:string|number}[]} options 选项列表。
 * @returns {string}
 */
function labelFromOptionValue(value, options) {
  if (value === null || value === undefined || value === "") {
    return "未设置";
  }
  const matched = options.find((item) => item.value === value);
  return matched?.label ?? String(value);
}

/**
 * 获取零件主键，兼容 partId/id 两种字段。
 * @param {object} part 零件对象。
 * @returns {number|string|null}
 */
function getPartId(part) {
  return part?.partId ?? part?.id ?? part?.partID ?? null;
}

/**
 * 获取零件 importPartCode，供上传图片文件名与后端匹配使用。
 * @param {object} part 零件对象。
 * @returns {string}
 */
function getPartImportPartCode(part) {
  const rawCode =
    part?.importPartCode ??
    part?.import_part_code ??
    part?.importCode ??
    part?.pCode ??
    part?.pcode ??
    part?.partCode ??
    part?.p_code ??
    "";
  return String(rawCode ?? "").trim();
}

/**
 * 读取 command 条零件名称并规范化为空字符串兜底，保证 pName 参数稳定存在。
 * @returns {string}
 */
function resolveCommandPartName() {
  return String(bomName.value ?? "").trim();
}

/**
 * 读取并规范化当前制造令号。
 * @returns {string}
 */
function resolveMoldOrderNum() {
  return String(moldOrderNum.value ?? "").trim();
}

/**
 * 从上下文回填 command 条输入值。
 * 默认仅在输入为空时回填，避免覆盖手动测试参数。
 * @param {{force?: boolean}} options 回填选项。
 */
function syncCommandInputsFromContext(options = {}) {
  const { force = forceContextOverwriteInputs } = options;
  const contextMoldOrderNum = String(store.contextMessage?.payload?.moldOrderNum ?? "").trim();
  const contextBomName = String(store.contextMessage?.payload?.bomName ?? "").trim();
  if (force || !moldOrderNum.value) {
    moldOrderNum.value = contextMoldOrderNum;
  }
  if (force || !bomName.value) {
    bomName.value = contextBomName;
  }
}

/**
 * 校验上传图片类型。
 * @param {File} file 文件对象。
 * @returns {boolean}
 */
function validateImageFile(file) {
  const allowExt = ["png", "jpg", "jpeg"];
  const ext = file.name.includes(".") ? file.name.split(".").pop().toLowerCase() : "";
  return allowExt.includes(ext);
}

onMounted(async () => {
  if (shouldPreloadDictsOnMounted()) {
    await loadBusinessDicts();
  }
  await nextTick();
  refreshCommandBarScrollTargets();
  updateCommandBarCondensedState();
});

onBeforeUnmount(() => {
  clearCommandBarScrollTargets();
  if (commandBarRafId) {
    window.cancelAnimationFrame(commandBarRafId);
    commandBarRafId = 0;
  }
});

watch(
  () => store.contextMessage,
  async (contextMessage) => {
    // 打包态（以及显式关闭手输模式）每次上下文更新都由宿主强制覆盖输入值。
    syncCommandInputsFromContext();
    const token = window.localStorage.getItem("sam_token");
    const hasToken = hasAuthToken(token);
    if (!shouldLoadPageDataOnContextChange({ contextMessage, hasToken })) {
      return;
    }
    await loadPageData();
  },
  { immediate: true }
);

watch(
  () => compilerOptions.value,
  () => {
    syncCompilerSelection();
  },
  { immediate: true }
);

watch(
  () => openUploadDialog.value,
  (isOpen) => {
    if (!isOpen) {
      resetUploadDraftState();
    }
  }
);

watch(
  () => openPartParamSaveConfirmDialog.value,
  (isOpen) => {
    // 兼容用户通过遮罩/ESC/关闭按钮退出弹窗的场景，确保文案状态及时回收。
    if (!isOpen) {
      resetPartParamSaveConfirmState();
    }
  }
);

watch(
  () => openActionConfirmDialog.value,
  (isOpen) => {
    // 兼容遮罩/ESC 关闭，确保动作与文案状态及时回收。
    if (!isOpen) {
      resetActionConfirmState();
    }
  }
);
</script>
