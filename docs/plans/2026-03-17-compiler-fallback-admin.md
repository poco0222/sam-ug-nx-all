# Compiler Fallback Admin Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 Qt 宿主环境变量兜底得到的默认编制人 `Administrator` 规范化为 `admin`，同时补充最小回归测试。

**Architecture:** 本次改动不调整编制人来源优先级，只在 Qt 宿主环境变量兜底分支增加一个小型账号规范化函数。测试通过独立可执行文件验证规范化结果，再由 `bridge.cpp` 复用该函数完成真实逻辑接入。

**Tech Stack:** Qt/C++、CMake、Markdown

---

### Task 1: 补充账号规范化测试入口

**Files:**
- Create: `qt-host/src/compiler_account_normalizer.h`
- Create: `qt-host/src/compiler_account_normalizer.cpp`
- Create: `qt-host/tests/compiler_account_normalizer_test.cpp`
- Modify: `qt-host/CMakeLists.txt`

**Step 1: 写最小失败用例**

在 `qt-host/tests/compiler_account_normalizer_test.cpp` 中增加一个定向检查，要求 `normalizeEnvironmentCompilerUserName("Administrator")` 返回 `admin`。

**Step 2: 运行测试确认失败**

Run: `cmake -S qt-host -B qt-host/build && cmake --build qt-host/build --target compiler_account_normalizer_test && ctest --test-dir qt-host/build -R compiler_account_normalizer_test --output-on-failure`

Expected: `compiler_account_normalizer_test` 失败，并提示 `Administrator` 尚未被规范化为 `admin`。

### Task 2: 接入最小实现

**Files:**
- Modify: `qt-host/src/compiler_account_normalizer.cpp`
- Modify: `qt-host/src/bridge.cpp`

**Step 1: 实现规范化函数**

在 `normalizeEnvironmentCompilerUserName` 中仅对 `Administrator` 做大小写不敏感映射，返回 `admin`；其他值保持原样。

**Step 2: 接入环境变量兜底分支**

在 `compilerFromEnvironment` 中调用该帮助函数，对最终 `userName` 做规范化后再同步给 `nickName`。

### Task 3: 运行验证

**Files:**
- Verify: `qt-host/src/compiler_account_normalizer.cpp`
- Verify: `qt-host/src/bridge.cpp`
- Verify: `qt-host/tests/compiler_account_normalizer_test.cpp`

**Step 1: 重新构建测试目标并执行测试**

Run: `cmake -S qt-host -B qt-host/build && cmake --build qt-host/build --target compiler_account_normalizer_test && ctest --test-dir qt-host/build -R compiler_account_normalizer_test --output-on-failure`

Expected: `compiler_account_normalizer_test` 通过。

**Step 2: 构建 Qt 宿主主程序**

Run: `cmake --build qt-host/build --target sam_ug_qt_host`

Expected: `sam_ug_qt_host` 构建成功，说明 `bridge.cpp` 接入新帮助函数后未破坏现有编译。
