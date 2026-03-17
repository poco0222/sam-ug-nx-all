# SAM UG Qt + Vue3（零件工单）

> 一个 Qt WebEngine 宿主 + Vue3 前端的混合工程，用于承载 `samMesPartsOrder` 页面（当前为无树版迁移）。

## 1. 项目概览

本仓库由两部分组成：

- `qt-host/`：Qt 6 + QWebEngine + QWebChannel 宿主（C++20）
- `web-app/`：Vue3 + Vite + Pinia 前端页面

核心运行链路：

1. Qt 启动后创建 `QWebEngineView` 与 `Bridge`。
2. `Bridge` 通过 `QWebChannel` 向前端下发 `parts_context`。
3. 前端接收上下文后自动免登录（`/loginByFree`），并进入零件工单页面。
4. Qt 优先加载 `qt-host/build/web-dist/index.html`；不存在则回退 `qrc:/web/index.html` 调试页。

## 2. 目录结构

```text
sam-ug-qt-all/
├── qt-host/                # Qt 宿主工程
│   ├── src/main.cpp        # 启动参数、页面加载、QWebChannel 初始化
│   ├── src/bridge.*        # 上下文构造、错误下发、编制人落盘
│   └── CMakeLists.txt      # Qt 构建 + 自动触发 web-app 构建/同步
├── web-app/                # Vue3 前端工程
│   ├── src/pages/parts-order/
│   ├── src/components/base/
│   ├── src/services/
│   └── tests/              # node:test 单测
└── README.md
```

## 3. 环境要求

- Node.js 18+（建议 LTS）
- npm 9+
- CMake 3.21+
- Qt 6（至少包含 `Widgets`、`WebEngineWidgets`、`WebChannel`、`Network` 组件）

## 4. 快速开始

### 4.1 前端本地开发

```bash
cd web-app
npm install
npm run dev
```

### 4.2 前端构建

```bash
cd web-app
npm run build
```

### 4.3 前端单测

```bash
cd web-app
node --test tests/*.test.mjs
```

### 4.4 Qt 构建与运行

```bash
cmake -S qt-host -B qt-host/build
cmake --build qt-host/build
./qt-host/build/sam_ug_qt_host
```

## 5. 构建联动机制（已接入）

`qt-host/CMakeLists.txt` 已内置前端联动构建：

1. 构建 Qt 目标前自动执行 `web-app/npm run build`；
2. 自动将 `web-app/dist` 同步到 `qt-host/build/web-dist`；
3. Qt 启动时优先加载同步后的 `web-dist` 页面。

因此常规联调只需执行 Qt 构建命令，无需手动拷贝前端产物。

## 6. 运行模式与配置

### 6.1 前端环境变量

- `VITE_API_BASE_URL`：后端 API 基地址（默认空字符串）
- `VITE_PARTS_ORDER_DEV_MANUAL_MODE`：开发态是否允许手输查询（`true/false`，默认 `true`）

当前仓库默认配置：

- 前端开发/生产环境默认指向 `http://192.168.19.100:8080`
- 如需切换其他环境，可通过覆盖 `VITE_API_BASE_URL` 调整

运行策略：

- 开发态 + `VITE_PARTS_ORDER_DEV_MANUAL_MODE=true`：
  - 可手动输入制造令号/零件名称；
  - 关闭 IPC 与 ERP 的零件匹配。
- 开发态 + `VITE_PARTS_ORDER_DEV_MANUAL_MODE=false`：
  - 输入由宿主上下文主导；
  - 恢复 IPC 与 ERP 匹配。
- 生产构建态：
  - 忽略 `VITE_PARTS_ORDER_DEV_MANUAL_MODE`；
  - 强制宿主模式（输入受上下文约束）。

### 6.2 Qt 启动参数

- `--upload-data-file <path>`：加载宿主侧 JSON 上下文文件
- `--web-manual-mode[=true|false]`：运行时覆盖前端手输模式（调试用）

`--web-manual-mode` 支持值：`true/false`、`1/0`、`yes/no`、`on/off`。  
如果仅写 `--web-manual-mode` 不带值，默认按 `true` 处理。

示例：

```bash
./qt-host/build/sam_ug_qt_host --web-manual-mode=true
./qt-host/build/sam_ug_qt_host --upload-data-file /absolute/path/upload-data.json
```

### 6.3 Qt 环境变量

- `SAM_COMPILER_INFO_PATH`：编制人信息本地文件路径
  - Windows 默认：`D:/UGerkaiInfo/userInfo/userName.txt`
  - 非 Windows 默认：Qt `AppDataLocation` 下的 `userName.txt`
- `SAM_COMPILER_API_URL`：编制人下拉接口地址（未配置时使用内置默认地址）

启动阶段 API 日志默认写入位置：

- Windows 默认：`D:/UGerkaiInfo/userInfo/APIlog.log`
- 非 Windows 默认：Qt `AppDataLocation` 下的 `APIlog.log`

当前内置默认编制人接口地址为：

- `http://192.168.19.100:8080/UGApi/UGApiController/getBianChengUserInfo`

## 7. upload-data-file 格式示例

`Bridge` 会优先读取以下字段并转换为前端 `parts_context`：

```json
{
  "mouldOrderNum": "MO-001",
  "bomName": "示例零件集",
  "data": [
    {
      "id": "1001",
      "p_code": "P-001",
      "import_part_code": "P-001",
      "paramList": [
        {
          "paramCode": "U.LK1-S",
          "paramCountValue": "98",
          "paramDeliverValue": "100",
          "paramName": "LK1-S（可选）"
        }
      ],
      "base64": ""
    }
  ],
  "compilerOptions": [
    {
      "userName": "zhangsan",
      "nickName": "张三"
    }
  ]
}
```

### 7.1 `paramList` 字段约定（已对照宿主工程）

根据宿主工程 `working_hour_setting`（`/Volumes/working_hour_setting2/working_hour_setting`）当前实现，`paramList` 结构如下：

- 核心字段（稳定存在）：
  - `paramCode`：参数编号
  - `paramCountValue`：计算值
  - `paramDeliverValue`：交付值
- 可选字段（部分链路会携带）：
  - `paramName`：参数名称
  - `paramId`：参数主键
  - `paramRemark`：参数备注

说明：

- 宿主上传链路（如 `webRTS.cpp`、`MESAPI.cpp`）默认只拼接核心 3 字段。
- 宿主构造零件参数详情链路（如 `UG_Mould_Order_Num_Info.cpp`）在有值时会附带 `paramName` 等扩展字段。

## 8. 当前迁移范围

已覆盖：

- 零件工单主页面（无树方案）
- 工艺模板匹配、历史模板匹配
- 工艺新增/删除、工序新增/删除（含批量分支）
- 特殊性要求编辑与保存
- 上传图片、发布工艺

未纳入本轮：

- 左侧树模式
- 跨模块跳转（如零件异常单、工艺作业指导）
- `look-process` / `getProcessByOrderId` 全量迁移

## 9. 已验证状态（2026-03-03）

在本仓库当前版本已执行并通过：

- `web-app`：`node --test tests/*.test.mjs`（81/81 通过）
- `web-app`：`npm run build`
- `qt-host`：`cmake -S qt-host -B qt-host/build && cmake --build qt-host/build`

## 10. 与宿主集成建议

1. 在宿主中消费真实 IPC 后，将上下文 JSON 传入 `Bridge::pushContext`。
2. 前端通过 `store.applyContextMessage` 驱动页面状态。
3. 为前端设置 `VITE_API_BASE_URL`，并确保 `/loginByFree` 与工艺接口可达。
4. 若未额外配置环境变量，仓库默认会访问正式服务器 `192.168.19.100:8080`。

## 11. 原项目在本地的路径
1. 前端位置: /Users/PopoY/workingFile/AllProjects/sam/sam-erp-fe/src/views/sam-engineering/samMesPartsOrder/samMesPartsOrder.vue
2. 后端位置: /Users/PopoY/workingFile/AllProjects/sam/sam-erp-be
3. 宿主项目（网络盘）: smb://192.168.10.36/E/GCSD-ver2/working_hour_setting2/working_hour_setting2/working_hour_setting
4. 宿主项目（当前机器挂载路径）: /Volumes/working_hour_setting2/working_hour_setting
