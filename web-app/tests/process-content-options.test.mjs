/**
 * @file process-content-options.test.mjs
 * @description 工序下拉选项映射单测，覆盖接口返回空项时的容错行为。
 * @author Codex
 * @date 2026-03-03
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mapProcessContentOptions } from "../src/pages/parts-order/utils/process-content-options.js";

/**
 * 接口返回包含 null/undefined 时，应跳过异常项且不抛出运行时错误。
 */
test("mapProcessContentOptions 应忽略空项并稳定生成下拉选项", () => {
  const options = mapProcessContentOptions([
    null,
    undefined,
    { processId: 10, jobContent: "铣削" },
    { processId: 11, jobContent: "" }
  ]);

  assert.deepEqual(options, [
    { label: "铣削", value: 10 },
    { label: "-", value: 11 }
  ]);
});

/**
 * 当输入不是数组时应回退为空数组，避免页面计算属性异常。
 */
test("mapProcessContentOptions 对非数组输入返回空数组", () => {
  assert.deepEqual(mapProcessContentOptions(null), []);
  assert.deepEqual(mapProcessContentOptions({}), []);
});

/**
 * 接口字段存在别名时应兼容映射，避免工序下拉误判为空。
 */
test("mapProcessContentOptions 支持 id/processContent 别名字段", () => {
  const options = mapProcessContentOptions([
    { id: 21, processContent: "精加工" },
    { jobId: 22, content: "抛光" }
  ]);

  assert.deepEqual(options, [
    { label: "精加工", value: 21 },
    { label: "抛光", value: 22 }
  ]);
});

/**
 * 后端返回 snake_case 字段时应保持可映射，避免弹窗下拉显示为空。
 */
test("mapProcessContentOptions 支持 process_id/job_content 字段", () => {
  const options = mapProcessContentOptions([{ process_id: 31, job_content: "钻孔" }]);

  assert.deepEqual(options, [{ label: "钻孔", value: 31 }]);
});

/**
 * 字段名大小写不一致时也应兼容，避免不同网关/驱动返回格式导致映射失败。
 */
test("mapProcessContentOptions 支持 PROCESS_ID/JOB_CONTENT 大写字段", () => {
  const options = mapProcessContentOptions([{ PROCESS_ID: 41, JOB_CONTENT: "攻牙" }]);

  assert.deepEqual(options, [{ label: "攻牙", value: 41 }]);
});

/**
 * 返回对象存在一层嵌套时也应可读取，兼容接口套壳结构。
 */
test("mapProcessContentOptions 支持一层嵌套对象字段", () => {
  const options = mapProcessContentOptions([{ detail: { process_id: 51, job_content: "线切割" } }]);

  assert.deepEqual(options, [{ label: "线切割", value: 51 }]);
});
