# Compiler Startup Login And Candidate Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将当前编制人的默认用户名固定为 `PopoY`，把候选用户接口收归前端启动链路，并为免登录与候选用户接口增加落盘到 `D:/UGerkaiInfo/userInfo/APIlog` 的详细日志。

**Architecture:** Qt 宿主仅负责解析当前用户名、初始化/清空日志文件、提供日志追加桥接能力，不再主动拉取候选用户。前端在收到 context 并解析出用户名后，并行发起免登录和候选用户接口请求；免登录先完成并写 token，再应用 context，候选用户列表异步更新到 store。

**Tech Stack:** Qt/C++、Vue 3、Pinia、Axios、CMake、Node Test、Markdown

---

### Task 1: 固定默认用户名并移除宿主候选用户接口

**Files:**
- Modify: `qt-host/src/bridge.cpp`
- Modify: `qt-host/src/compiler_account_normalizer.cpp`
- Test: `qt-host/tests/compiler_account_normalizer_test.cpp`

**Step 1: 写失败测试，覆盖默认用户名改为 PopoY**

在 `qt-host/tests/compiler_account_normalizer_test.cpp` 或新的宿主测试文件中增加检查：

- 没有环境变量可用时，默认用户名不再依赖 `Administrator`/环境变量
- 兜底用户名应为 `PopoY`

**Step 2: 运行测试确认失败**

Run: `cmake -S qt-host -B qt-host/build && cmake --build qt-host/build --target compiler_account_normalizer_test && ctest --test-dir qt-host/build -R compiler_account_normalizer_test --output-on-failure`

Expected: 失败，并指出默认用户名仍不是 `PopoY` 或仍走环境变量分支。

**Step 3: 写最小实现**

- 删除 `resolveCompilerInfo` 中对环境变量默认兜底的依赖
- 保留本地 `userName.txt` 和宿主上下文优先级
- 最终兜底改为 `PopoY`
- 从 `resolveCompilerOptions` 中去掉 `compilerOptionsFromApi()` 调用链

**Step 4: 运行测试确认通过**

Run: `cmake --build qt-host/build --target compiler_account_normalizer_test && ctest --test-dir qt-host/build -R compiler_account_normalizer_test --output-on-failure`

Expected: 测试通过。

### Task 2: 给宿主增加 APIlog 初始化与追加写入桥接

**Files:**
- Modify: `qt-host/src/bridge.h`
- Modify: `qt-host/src/bridge.cpp`
- Modify: `qt-host/src/main.cpp`
- Test: `qt-host/tests/api_log_bridge_test.cpp`
- Modify: `qt-host/CMakeLists.txt`

**Step 1: 写失败测试，覆盖日志文件初始化与追加**

新增 `qt-host/tests/api_log_bridge_test.cpp`，覆盖：

- `APIlog` 路径可被创建
- 清空后文件内容为空
- 追加写入一条日志后内容存在

**Step 2: 运行测试确认失败**

Run: `cmake -S qt-host -B qt-host/build && cmake --build qt-host/build --target api_log_bridge_test && ctest --test-dir qt-host/build -R api_log_bridge_test --output-on-failure`

Expected: 失败，并提示桥接日志能力尚未实现。

**Step 3: 写最小实现**

- 在 `Bridge` 中新增日志路径帮助函数
- 新增 `clearApiLog()`、`appendApiLog(const QString& message)` 桥接方法
- `main.cpp` 启动时调用清空逻辑
- 日志文件固定为 `D:/UGerkaiInfo/userInfo/APIlog`

**Step 4: 运行测试确认通过**

Run: `cmake --build qt-host/build --target api_log_bridge_test && ctest --test-dir qt-host/build -R api_log_bridge_test --output-on-failure`

Expected: 测试通过。

### Task 3: 前端新增候选用户接口与启动并行链路

**Files:**
- Create: `web-app/src/services/api/compiler.js`
- Modify: `web-app/src/services/bridge.js`
- Modify: `web-app/src/services/api/auth.js`
- Test: `web-app/tests/bridge-startup-flow.test.mjs`

**Step 1: 写失败测试，覆盖启动时序**

在 `web-app/tests/bridge-startup-flow.test.mjs` 中覆盖：

- 解析出已有用户名后，会并行触发免登录与候选用户接口
- 免登录成功写 token 后才应用 context
- 候选用户接口失败时仍保留当前用户名兜底

**Step 2: 运行测试确认失败**

Run: `node --test web-app/tests/bridge-startup-flow.test.mjs`

Expected: 失败，并指出当前 bridge 仍是“先 apply context，再触发免登录”。

**Step 3: 写最小实现**

- 新增 `getCompilerCandidates()` 接口封装
- 在 `bridge.js` 中抽出“解析当前用户名”“并行启动接口”“日志写桥接”的函数
- 把 `handleContextJson()` 调整为：
  - 解析用户名
  - 并行请求免登录与候选用户
  - 免登录成功后应用 context
  - 候选用户成功后更新 store

**Step 4: 运行测试确认通过**

Run: `node --test web-app/tests/bridge-startup-flow.test.mjs`

Expected: 测试通过。

### Task 4: 将候选用户主数据源切到前端 store

**Files:**
- Modify: `web-app/src/stores/partsOrderStore.js`
- Modify: `web-app/src/pages/parts-order/index.vue`
- Test: `web-app/tests/compiler-options-source.test.mjs`

**Step 1: 写失败测试，覆盖候选项来源变更**

在 `web-app/tests/compiler-options-source.test.mjs` 中覆盖：

- `compilerCandidates` 有值时，优先使用前端接口结果
- `compilerCandidates` 为空时，退化为当前用户名单项
- 不再依赖宿主 payload 中的候选用户数组

**Step 2: 运行测试确认失败**

Run: `node --test web-app/tests/compiler-options-source.test.mjs`

Expected: 失败，并指出 `compilerOptions` 仍以宿主 payload 为主。

**Step 3: 写最小实现**

- 在 store 中新增 `compilerCandidates`
- 新增 `setCompilerCandidates()` 方法
- 更新 `index.vue` 中的 `compilerOptions` 计算逻辑
- 保留“切换编制人后写 `userName.txt` + 重新免登录”的现有行为

**Step 4: 运行测试确认通过**

Run: `node --test web-app/tests/compiler-options-source.test.mjs`

Expected: 测试通过。

### Task 5: 给两个接口补详细日志

**Files:**
- Modify: `web-app/src/services/bridge.js`
- Modify: `web-app/src/services/api/auth.js`
- Modify: `web-app/src/services/api/compiler.js`
- Test: `web-app/tests/api-log-format.test.mjs`

**Step 1: 写失败测试，覆盖日志内容**

在 `web-app/tests/api-log-format.test.mjs` 中覆盖：

- `START` 日志包含接口名、URL、方法、用户名、请求参数
- `SUCCESS` 日志包含耗时、状态码、响应体摘要
- `FAIL` 日志包含耗时、错误信息、状态码/异常体

**Step 2: 运行测试确认失败**

Run: `node --test web-app/tests/api-log-format.test.mjs`

Expected: 失败，并指出当前不存在日志格式化与桥接落盘能力。

**Step 3: 写最小实现**

- 在 `bridge.js` 中新增日志格式化函数
- 在 `/loginByFree` 和 `getBianChengUserInfo` 调用前后记录详细日志
- 通过 Qt bridge 的 `appendApiLog` 追加到宿主文件
- 写日志失败只打印控制台告警，不中断业务

**Step 4: 运行测试确认通过**

Run: `node --test web-app/tests/api-log-format.test.mjs`

Expected: 测试通过。

### Task 6: 运行集成验证

**Files:**
- Verify: `qt-host/src/bridge.cpp`
- Verify: `qt-host/src/main.cpp`
- Verify: `web-app/src/services/bridge.js`
- Verify: `web-app/src/pages/parts-order/index.vue`
- Verify: `D:/UGerkaiInfo/userInfo/APIlog`

**Step 1: 跑全部新增定向测试**

Run: `node --test web-app/tests/bridge-startup-flow.test.mjs web-app/tests/compiler-options-source.test.mjs web-app/tests/api-log-format.test.mjs`

Expected: 全部通过。

**Step 2: 构建 Qt 宿主主程序**

Run: `cmake --build qt-host/build --target sam_ug_qt_host`

Expected: 构建成功。

**Step 3: 手动验证启动日志**

Run: 启动宿主并检查 `D:/UGerkaiInfo/userInfo/APIlog`

Expected:

- 文件已被本次启动清空重建
- 能看到 `/loginByFree` 与 `getBianChengUserInfo` 的完整日志
- 启动时默认用户名符合“本地文件 > 宿主上下文 > PopoY”
