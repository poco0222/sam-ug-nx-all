/**
 * @file compiler_account_normalizer_test.cpp
 * @description 编制人账号规范化测试，覆盖环境变量兜底场景。
 * @author Codex
 * @date 2026-03-17
 */
#include <iostream>

#include <QString>

#include "compiler_account_normalizer.h"

/**
 * @brief 执行最小回归测试。
 * @returns int 成功返回 0，失败返回非 0。
 */
int main() {
  // Windows 默认管理员账号应被规范化为小写 admin，避免页面默认展示 Administrator。
  const QString administratorUser = QStringLiteral("Administrator");
  const QString normalizedAdministrator = normalizeEnvironmentCompilerUserName(administratorUser);
  if (normalizedAdministrator != QStringLiteral("admin")) {
    std::cerr << "期望 Administrator 被规范化为 admin，实际得到: "
              << normalizedAdministrator.toStdString() << std::endl;
    return 1;
  }

  // 非管理员账号应保持原样，避免影响真实业务账号。
  const QString normalUser = QStringLiteral("sam-user");
  const QString normalizedUser = normalizeEnvironmentCompilerUserName(normalUser);
  if (normalizedUser != normalUser) {
    std::cerr << "期望普通账号保持原样，实际得到: " << normalizedUser.toStdString() << std::endl;
    return 1;
  }

  return 0;
}
