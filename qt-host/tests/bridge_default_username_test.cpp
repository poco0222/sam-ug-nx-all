/**
 * @file bridge_default_username_test.cpp
 * @description 验证默认编制人优先级，确保在无本地与上下文信息时兜底为 PopoY。
 * @author Codex
 * @date 2026-03-17
 */
#include <iostream>

#include <QFile>
#include <QJsonObject>

#include "bridge.h"

/**
 * @brief 主测试入口。
 * @returns int 通过返回 0，失败返回 1。
 */
int main() {
  // 强制使用不存在的本地用户文件，避免开发机现场环境影响测试结果。
  const QByteArray mockUserFilePath = QByteArray("/tmp/sam-qt-host-missing-userName.txt");
  QFile::remove(QString::fromUtf8(mockUserFilePath));
  qputenv("SAM_COMPILER_INFO_PATH", mockUserFilePath);

  // 模拟没有 upload-data 也没有 userName.txt 的情形。
  const CompilerInfo info = resolveCompilerInfo(QJsonObject{});

  const QString expected = QStringLiteral("PopoY");
  if (info.userName != expected) {
    std::cerr << "期望默认用户名为 PopoY，实际得到: " << info.userName.toStdString() << std::endl;
    return 1;
  }
  return 0;
}
