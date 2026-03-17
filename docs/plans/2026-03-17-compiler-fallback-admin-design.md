# 默认编制人 Administrator 规范化为 admin 设计

## 背景

当前 Qt 宿主在无法从本地 `userName.txt` 或宿主上下文中解析编制人时，会回退读取系统环境变量 `USERNAME`、`USER`、`LOGNAME`。在 Windows 管理员账户下，这个兜底值通常为 `Administrator`，导致页面中的“当前编制人”默认展示为 `Administrator`。

本次目标是仅调整“环境变量末级兜底”分支：当兜底值为 Windows 默认管理员账号时，统一规范化为 `admin`。

## 设计决策

### 改动范围

- `qt-host/src/bridge.cpp`
- `qt-host/src/compiler_account_normalizer.h`
- `qt-host/src/compiler_account_normalizer.cpp`
- `qt-host/tests/compiler_account_normalizer_test.cpp`
- `qt-host/CMakeLists.txt`

### 方案选择

采用“新增小型账号规范化帮助函数，并只在环境变量兜底分支使用”的方案：

- 保持现有编制人优先级不变：本地文件 > 宿主上下文 > 环境变量 > `nx-host`
- 仅在环境变量解析出的账号为 `Administrator` 时，将其规范化为 `admin`
- 其他账号保持原样，避免影响真实业务账号或已保存的编制人值

## 验证策略

- 为账号规范化函数增加一个最小宿主侧回归测试
- 构建 Qt 宿主测试目标并运行定向测试，确认 `Administrator` 被规范化为 `admin`
- 重新构建 Qt 宿主主程序，确认桥接代码改动未破坏现有编译
