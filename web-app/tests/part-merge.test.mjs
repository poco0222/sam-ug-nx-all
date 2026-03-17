/**
 * @file part-merge.test.mjs
 * @description 零件编号匹配工具单测，覆盖别名读取、编号归一化与 ERP/IPC 合并逻辑。
 * @author Codex
 * @date 2026-03-02
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPartComparisonRows,
  getPartCode,
  normalizePartCode,
  mergeContextAndErpParts,
  toVisiblePartCode
} from "../src/pages/parts-order/utils/part-merge.js";

/**
 * 验证别名字段命中顺序与兼容性。
 */
test("getPartCode 支持多种字段别名", () => {
  const withPCode = { pCode: "D102-003_N01" };
  const withImportCode = { import_part_code: "X-01" };

  assert.equal(getPartCode(withPCode), "D102-003_N01");
  assert.equal(getPartCode(withImportCode), "X-01");
});

/**
 * 验证编号归一化：去空白、去零宽字符、统一大写。
 */
test("normalizePartCode 统一格式后可稳定匹配", () => {
  // 包含首尾空白、零宽字符与小写字母。
  const rawCode = "  d102-003_\u200bn01  ";
  assert.equal(normalizePartCode(rawCode), "D102-003_N01");
});

/**
 * 验证交集合并场景：仅保留命中的 ERP 行并继承 IPC 的 base64/paramList。
 */
test("mergeContextAndErpParts 命中时继承 IPC base64", () => {
  const contextParts = [{ p_code: "D102-003_N01", base64: "BASE64-A", paramList: [{ paramCode: "P1" }] }];
  const erpRows = [{ pCode: "D102-003_N01", id: 1 }, { pCode: "D102-003_N02", id: 2 }];

  const merged = mergeContextAndErpParts(contextParts, erpRows);

  assert.equal(merged.length, 1);
  assert.deepEqual(merged[0], { pCode: "D102-003_N01", id: 1, base64: "BASE64-A", paramList: [{ paramCode: "P1" }] });
});

/**
 * 验证与原 Vue2 一致的匹配口径：ERP 使用 pcode 也应命中 IPC。
 */
test("mergeContextAndErpParts 支持 ERP.pcode 与 IPC.p_code 匹配", () => {
  const contextParts = [{ p_code: "D102-003_N01", base64: "BASE64-A", paramList: [{ paramCode: "P1" }] }];
  const erpRows = [{ pcode: "D102-003_N01", id: 1 }];

  const merged = mergeContextAndErpParts(contextParts, erpRows);

  assert.equal(merged.length, 1);
  assert.deepEqual(merged[0], {
    pcode: "D102-003_N01",
    id: 1,
    base64: "BASE64-A",
    paramList: [{ paramCode: "P1" }]
  });
});

/**
 * 验证严格匹配规则：仅允许 ERP.pCode 与 IPC.p_code 匹配。
 */
test("mergeContextAndErpParts 不使用 import_part_code 参与匹配", () => {
  const contextParts = [{ p_code: "D102-003_N01", base64: "BASE64-A" }];
  const erpRows = [{ pCode: "INNER-001", import_part_code: "D102-003_N01", id: 1 }];

  const merged = mergeContextAndErpParts(contextParts, erpRows);

  assert.equal(merged.length, 0);
});

/**
 * 验证上下文编号不可用时的兜底策略：保留 ERP 结果，避免页面空列表。
 */
test("mergeContextAndErpParts 在上下文编号缺失时回退 ERP 行", () => {
  const contextParts = [{ pName: "下模座", base64: "BASE64-A" }];
  const erpRows = [{ pCode: "D102-003_N01", id: 1, p_name: "下模座-ERP" }];

  const merged = mergeContextAndErpParts(contextParts, erpRows);

  assert.equal(merged.length, 1);
  assert.deepEqual(merged[0], { pCode: "D102-003_N01", id: 1, p_name: "下模座-ERP", base64: "", paramList: [] });
});

/**
 * 验证合并后除 base64/paramList 外均使用 ERP 字段。
 */
test("mergeContextAndErpParts 合并后保留 ERP 主字段", () => {
  const contextParts = [
    { p_code: "D102-003_N01", base64: "BASE64-A", paramList: [{ paramCode: "A1", paramDeliverValue: "10" }] }
  ];
  const erpRows = [{ pCode: "D102-003_N01", id: 99, pName: "ERP零件", isRelease: "2" }];

  const merged = mergeContextAndErpParts(contextParts, erpRows);

  assert.equal(merged.length, 1);
  assert.deepEqual(merged[0], {
    pCode: "D102-003_N01",
    id: 99,
    pName: "ERP零件",
    isRelease: "2",
    base64: "BASE64-A",
    paramList: [{ paramCode: "A1", paramDeliverValue: "10" }]
  });
});

/**
 * 验证对照视图：同时输出匹配、仅刷新、仅 IPC 三类数据行。
 */
test("buildPartComparisonRows 同时保留 IPC 与刷新查询数据", () => {
  const contextParts = [
    { p_code: " A-01 ", base64: "BASE64-A", paramList: [{ paramCode: "P1" }] },
    { p_code: "C-03", pName: "IPC-C03" },
    { pName: "IPC-NO-CODE" }
  ];
  const erpRows = [
    { id: 1, pCode: "A-01", pName: "ERP-A01" },
    { id: 2, pCode: "B-02", pName: "ERP-B02" },
    { id: 3, pName: "ERP-NO-CODE" }
  ];

  const rows = buildPartComparisonRows(contextParts, erpRows);

  assert.equal(rows.length, 5);

  const matchedRow = rows.find((item) => item.id === 1);
  assert.equal(matchedRow.__matchStatus, "已匹配");
  assert.equal(matchedRow.__ipcCodeNormalized, "A-01");
  assert.equal(matchedRow.__refreshCodeNormalized, "A-01");
  assert.equal(matchedRow.base64, "BASE64-A");

  const refreshOnlyRow = rows.find((item) => item.id === 2);
  assert.equal(refreshOnlyRow.__matchStatus, "仅刷新");
  assert.equal(refreshOnlyRow.__matchReason, "IPC 中未找到同编号");

  const refreshNoCodeRow = rows.find((item) => item.id === 3);
  assert.equal(refreshNoCodeRow.__matchStatus, "仅刷新");
  assert.equal(refreshNoCodeRow.__matchReason, "刷新结果缺少匹配编号(pCode/pcode)");

  const ipcOnlyRow = rows.find((item) => item.__matchStatus === "仅IPC" && item.__ipcCodeNormalized === "C-03");
  assert.equal(ipcOnlyRow.__matchReason, "刷新结果中未找到同编号");

  const ipcNoCodeRow = rows.find((item) => item.__matchStatus === "仅IPC" && item.__ipcCodeNormalized === "");
  assert.equal(ipcNoCodeRow.__matchReason, "IPC 缺少匹配编号(p_code)");
});

/**
 * 验证编号可视化：空白和隐藏字符被替换为显式占位符。
 */
test("toVisiblePartCode 将不可见字符转换为占位符", () => {
  assert.equal(toVisiblePartCode(" A\u200B\t\n"), "<SPACE>A<ZWSP><TAB><LF>");
  assert.equal(toVisiblePartCode(null), "-");
});

/**
 * 验证刷新结果为空时的提示文案，避免误判成“字段不一致”。
 */
test("buildPartComparisonRows 在刷新为空时标记刷新结果为空", () => {
  const rows = buildPartComparisonRows([{ p_code: "D102-003_101" }], []);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].__matchStatus, "仅IPC");
  assert.equal(rows[0].__matchReason, "刷新结果为空");
});
