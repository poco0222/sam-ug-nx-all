/**
 * @file compiler_account_normalizer.cpp
 * @description 编制人账号规范化工具实现，仅处理宿主环境变量兜底场景。
 * @author Codex
 * @date 2026-03-17
 */
#include "compiler_account_normalizer.h"

/**
 * @brief 规范化环境变量兜底得到的编制人账号。
 * @param userName 原始编制人账号。
 * @returns QString 规范化后的编制人账号。
 */
QString normalizeEnvironmentCompilerUserName(const QString& userName) {
  // Windows 管理员账户常见为 Administrator，界面默认值统一规范为业务侧使用的 admin。
  if (userName.compare(QStringLiteral("Administrator"), Qt::CaseInsensitive) == 0) {
    return QStringLiteral("admin");
  }
  return userName;
}
