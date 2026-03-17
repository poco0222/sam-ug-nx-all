/**
 * @file part-param-diff.test.mjs
 * @description 零件参数“服务器 vs IPC”差异模型与 UG 覆盖策略单测。
 * @author Codex
 * @date 2026-03-04
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeParamCode,
  buildPartParamDiffModel,
  applyIpcParamListToServerParams,
  buildPartParamSaveConfirmPayload
} from "../src/pages/parts-order/utils/part-param-diff.js";

/**
 * 验证参数编号归一化：去空白并转大写，保障匹配稳定。
 */
test("normalizeParamCode 统一去空白与大小写", () => {
  assert.equal(normalizeParamCode("  p-01 "), "P-01");
  assert.equal(normalizeParamCode(null), "");
});

/**
 * 编号匹配成功且关键字段一致时，不应产生差异标记。
 */
test("buildPartParamDiffModel 匹配且字段一致时标记 matched_equal", () => {
  const serverParams = [{ id: 1, paramCode: " P-01 ", paramName: "长度", paramCountValue: "10", paramDeliverValue: "11" }];
  const ipcParams = [{ code: "p-01", name: "长度", countValue: 10, deliverValue: 11 }];

  const model = buildPartParamDiffModel({
    serverParams,
    ipcParams,
    resolveServerRowKey: (row) => row.id
  });

  assert.equal(model.rowDiffByKey[1].status, "matched_equal");
  assert.deepEqual(model.rowDiffByKey[1].diffFields, []);
  assert.equal(model.stats.matched, 1);
  assert.equal(model.stats.diff, 0);
  assert.equal(model.stats.serverOnly, 0);
  assert.equal(model.stats.ipcOnly, 0);
});

/**
 * 数值字段格式不同但数值相等时（如 98 与 98.000000），不应误判为差异。
 */
test("buildPartParamDiffModel 对数值等价格式差异不标记", () => {
  const serverParams = [{ id: 101, paramCode: "U.LK1-S", paramName: "U.LK1-S", paramCountValue: "98", paramDeliverValue: "100" }];
  const ipcParams = [{ paramCode: "u.lk1-s", paramName: "U.LK1-S", paramCountValue: "98.000000", paramDeliverValue: "100.000000" }];

  const model = buildPartParamDiffModel({
    serverParams,
    ipcParams,
    resolveServerRowKey: (row) => row.id
  });

  assert.equal(model.rowDiffByKey[101].status, "matched_equal");
  assert.deepEqual(model.rowDiffByKey[101].diffFields, []);
  assert.equal(model.stats.diff, 0);
});

/**
 * 参数名称差异不参与标记，仅数值字段参与差异判断。
 */
test("buildPartParamDiffModel 忽略参数名称差异，仅标记数值差异", () => {
  const serverParams = [{ id: 2, paramCode: "P-02", paramName: "宽度", paramCountValue: "12", paramDeliverValue: "14" }];
  const ipcParams = [{ paramCode: "p-02", paramName: "宽度(UG)", paramCountValue: "13", paramDeliverValue: "14.5" }];

  const model = buildPartParamDiffModel({
    serverParams,
    ipcParams,
    resolveServerRowKey: (row) => row.id
  });

  assert.equal(model.rowDiffByKey[2].status, "matched_diff");
  assert.deepEqual(model.rowDiffByKey[2].diffFields, ["paramCountValue", "paramDeliverValue"]);
  assert.equal(model.stats.matched, 1);
  assert.equal(model.stats.diff, 1);
});

/**
 * 仅参数名称不同、数值字段一致时，不应标记差异。
 */
test("buildPartParamDiffModel 名称不同但数值一致时标记 matched_equal", () => {
  const serverParams = [{ id: 202, paramCode: "P-22", paramName: "服务器名称", paramCountValue: "12", paramDeliverValue: "14" }];
  const ipcParams = [{ paramCode: "P-22", paramName: "UG名称", paramCountValue: "12", paramDeliverValue: "14.0" }];

  const model = buildPartParamDiffModel({
    serverParams,
    ipcParams,
    resolveServerRowKey: (row) => row.id
  });

  assert.equal(model.rowDiffByKey[202].status, "matched_equal");
  assert.deepEqual(model.rowDiffByKey[202].diffFields, []);
});

/**
 * 服务器参数存在但 IPC 无对应编号时，应标记为 server_only。
 */
test("buildPartParamDiffModel 识别服务器独有参数", () => {
  const serverParams = [{ id: 3, paramCode: "P-03", paramName: "厚度" }];
  const ipcParams = [{ paramCode: "P-04", paramName: "孔径" }];

  const model = buildPartParamDiffModel({
    serverParams,
    ipcParams,
    resolveServerRowKey: (row) => row.id
  });

  assert.equal(model.rowDiffByKey[3].status, "server_only");
  assert.equal(model.stats.serverOnly, 1);
});

/**
 * IPC 参数存在但服务器无对应编号时，应进入 unmatchedIpcEntries。
 */
test("buildPartParamDiffModel 识别 IPC 独有参数", () => {
  const serverParams = [{ id: 4, paramCode: "P-04" }];
  const ipcParams = [{ paramCode: "P-04" }, { paramCode: "P-05" }, { name: "无编号参数" }];

  const model = buildPartParamDiffModel({
    serverParams,
    ipcParams,
    resolveServerRowKey: (row) => row.id
  });

  assert.equal(model.stats.ipcOnly, 2);
  assert.equal(model.unmatchedIpcEntries.length, 2);
  assert.deepEqual(
    model.unmatchedIpcEntries.map((item) => item.normalizedCode),
    ["P-05", ""]
  );
});

/**
 * 点击“引用UG参数”时，仅覆盖可匹配行，不追加服务器不存在的参数。
 */
test("applyIpcParamListToServerParams 仅覆盖可匹配项且不追加新行", () => {
  const serverParams = [
    { id: 11, paramCode: "P-11", paramName: "长度", paramCountValue: "10", paramDeliverValue: "12", extraFlag: "keep" },
    { id: 12, paramCode: "P-12", paramName: "宽度", paramCountValue: "20", paramDeliverValue: "21", extraFlag: "keep2" }
  ];
  const ipcParams = [
    { code: "p-11", name: "长度-UG", countValue: "11", deliverValue: "13" },
    { code: "p-13", name: "不会新增" }
  ];

  const nextParams = applyIpcParamListToServerParams({ serverParams, ipcParams });

  assert.equal(nextParams.length, 2);
  assert.deepEqual(nextParams[0], {
    id: 11,
    paramCode: "P-11",
    paramName: "长度-UG",
    paramCountValue: "11",
    paramDeliverValue: "13",
    extraFlag: "keep"
  });
  assert.deepEqual(nextParams[1], serverParams[1]);
});

/**
 * 完全无法匹配时，应保持服务器列表结构不变，并把 IPC 全部标记为未匹配。
 */
test("完全无法匹配时保持服务器为主且 IPC 全量未匹配", () => {
  const serverParams = [{ id: 21, paramCode: "P-21", paramName: "服务器参数" }];
  const ipcParams = [{ paramCode: "UG-01", paramName: "UG参数1" }, { paramCode: "UG-02", paramName: "UG参数2" }];

  const nextParams = applyIpcParamListToServerParams({ serverParams, ipcParams });
  const model = buildPartParamDiffModel({
    serverParams: nextParams,
    ipcParams,
    resolveServerRowKey: (row) => row.id
  });

  assert.deepEqual(nextParams, serverParams);
  assert.equal(model.stats.matched, 0);
  assert.equal(model.stats.serverOnly, 1);
  assert.equal(model.stats.ipcOnly, 2);
});

/**
 * 保存前差异确认：当不存在任何差异时，不应弹出二次确认。
 */
test("buildPartParamSaveConfirmPayload 无差异时不触发确认", () => {
  const model = buildPartParamDiffModel({
    serverParams: [{ id: 31, paramCode: "P-31", paramCountValue: "10", paramDeliverValue: "11" }],
    ipcParams: [{ paramCode: "P-31", paramCountValue: "10", paramDeliverValue: "11" }],
    resolveServerRowKey: (row) => row.id
  });

  const payload = buildPartParamSaveConfirmPayload(model);

  assert.equal(payload.shouldConfirm, false);
  assert.equal(payload.summaryText, "");
  assert.deepEqual(payload.detailLines, []);
  assert.deepEqual(payload.detailItems, []);
});

/**
 * 保存前差异确认：存在差异时应返回确认文案，并包含关键统计与编号提示。
 */
test("buildPartParamSaveConfirmPayload 有差异时返回确认提示与明细", () => {
  const model = buildPartParamDiffModel({
    serverParams: [
      { id: 41, paramCode: "P-41", paramCountValue: "10", paramDeliverValue: "11" },
      { id: 42, paramCode: "P-42", paramCountValue: "20", paramDeliverValue: "21" }
    ],
    ipcParams: [
      { paramCode: "P-41", paramCountValue: "99", paramDeliverValue: "100" },
      { paramCode: "UG-ONLY", paramCountValue: "1", paramDeliverValue: "2" }
    ],
    resolveServerRowKey: (row) => row.id
  });

  const payload = buildPartParamSaveConfirmPayload(model);

  assert.equal(payload.shouldConfirm, true);
  assert.equal(payload.summaryText, "检测到当前参数与UG计算参数存在差异，是否仍要保存？");
  assert.equal(payload.detailLines.length, 3);
  assert.equal(payload.detailLines[0], "参数值不一致 1 项");
  assert.equal(payload.detailLines[1], "仅当前参数存在 1 项（P-42）");
  assert.equal(payload.detailLines[2], "仅UG计算参数存在 1 项（UG-ONLY）");
  assert.equal(payload.detailItems.length, 4);
  assert.deepEqual(payload.detailItems[0], {
    id: "value-diff-0-P-41-paramCountValue",
    diffType: "value_diff",
    diffTypeLabel: "值不一致",
    paramCode: "P-41",
    fieldLabel: "计算值",
    currentValue: "10",
    ugValue: "99"
  });
  assert.deepEqual(payload.detailItems[1], {
    id: "value-diff-1-P-41-paramDeliverValue",
    diffType: "value_diff",
    diffTypeLabel: "值不一致",
    paramCode: "P-41",
    fieldLabel: "交付值",
    currentValue: "11",
    ugValue: "100"
  });
  assert.deepEqual(payload.detailItems[2], {
    id: "server-only-0-P-42",
    diffType: "server_only",
    diffTypeLabel: "仅当前参数",
    paramCode: "P-42",
    fieldLabel: "参数行",
    currentValue: "计算值: 20；交付值: 21",
    ugValue: "-"
  });
  assert.deepEqual(payload.detailItems[3], {
    id: "ug-only-0-UG-ONLY",
    diffType: "ug_only",
    diffTypeLabel: "仅UG计算参数",
    paramCode: "UG-ONLY",
    fieldLabel: "参数行",
    currentValue: "-",
    ugValue: "计算值: 1；交付值: 2"
  });
});
