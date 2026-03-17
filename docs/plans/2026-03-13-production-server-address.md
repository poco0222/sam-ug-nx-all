# Production Server Address Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将仓库内默认接口地址从测试服务器切换为正式服务器 `192.168.19.100`，并同步更新文档说明。

**Architecture:** 本次改动只调整集中配置入口，不修改业务逻辑。前端通过 `.env` 统一设置 API 基地址，Qt 宿主通过 `bridge.cpp` 中的默认接口地址兜底，README 负责同步记录当前默认值。

**Tech Stack:** Vue 3、Vite、Qt/C++、Markdown

---

### Task 1: 切换前端默认接口地址

**Files:**
- Modify: `web-app/.env.development`
- Modify: `web-app/.env.production`

**Step 1: 更新开发环境地址**

将 `VITE_API_BASE_URL` 改为 `http://192.168.19.100:8080`，并保留中文注释说明用途。

**Step 2: 更新生产环境地址**

将 `VITE_API_BASE_URL` 改为 `http://192.168.19.100:8080`，并补充中文注释说明该地址为正式服务器默认值。

### Task 2: 切换 Qt 宿主默认编制人接口地址

**Files:**
- Modify: `qt-host/src/bridge.cpp`

**Step 1: 更新默认接口地址**

将 `compilerOptionsFromApi` 中的 `defaultUrl` 改为 `http://192.168.19.100:8080/UGApi/UGApiController/getBianChengUserInfo`。

### Task 3: 更新仓库文档

**Files:**
- Modify: `README.md`

**Step 1: 同步默认地址说明**

在环境变量与集成建议部分补充当前仓库默认指向的正式服务器地址，避免文档与代码配置不一致。

### Task 4: 验证切换结果

**Files:**
- Verify: `web-app/.env.development`
- Verify: `web-app/.env.production`
- Verify: `qt-host/src/bridge.cpp`
- Verify: `README.md`

**Step 1: 全文搜索历史测试地址**

运行 `rg -n "192\\.168\\.19\\.110|192\\.168\\.19\\.100" README.md web-app/.env.development web-app/.env.production qt-host/src/bridge.cpp`

**Expected:** 目标文件中默认地址全部为 `192.168.19.100`，不再残留 `192.168.19.110`。
