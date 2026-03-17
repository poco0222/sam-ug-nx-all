/**
 * @file bridge_default_username_test.cpp
 * @description 验证默认编制人优先级，确保在无本地与上下文信息时兜底为 PopoY。
 * @author Codex
 * @date 2026-03-17
 */
#include <iostream>

#include <QCoreApplication>
#include <QFile>
#include <QJsonObject>

#include "bridge.h"

/**
 * @brief 主测试入口。
 * @returns int 通过返回 0，失败返回 1。
 */
int main(int argc, char* argv[]) {
  QCoreApplication app(argc, argv);
  app.setApplicationName(QStringLiteral("SAM UG Qt Host"));
  app.setOrganizationName(QStringLiteral("SAM"));

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

  qunsetenv("SAM_COMPILER_INFO_PATH");
  /** @type {QString} 当前平台解析出的默认 userName.txt 路径。 */
  const QString defaultUserFilePath = resolveCompilerInfoFilePath();
  if (!defaultUserFilePath.endsWith(QStringLiteral("/userName.txt"))) {
    std::cerr << "期望默认编制人文件名为 userName.txt，实际为: "
              << defaultUserFilePath.toStdString() << std::endl;
    return 1;
  }

#ifdef Q_OS_WIN
  if (!defaultUserFilePath.startsWith(QStringLiteral("D:/UGerkaiInfo/userInfo/"))) {
    std::cerr << "期望 Windows 默认编制人文件路径保持参考工程目录，实际为: "
              << defaultUserFilePath.toStdString() << std::endl;
    return 1;
  }
#else
  if (defaultUserFilePath.startsWith(QStringLiteral("D:/UGerkaiInfo/userInfo/"))) {
    std::cerr << "期望非 Windows 默认编制人文件路径不再使用 D:/...，实际为: "
              << defaultUserFilePath.toStdString() << std::endl;
    return 1;
  }
#endif

  return 0;
}
