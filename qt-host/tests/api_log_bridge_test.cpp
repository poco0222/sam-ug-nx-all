/**
 * @file api_log_bridge_test.cpp
 * @description API 日志桥接测试，覆盖清空与追加写入行为。
 * @author Codex
 * @date 2026-03-17
 */
#include <iostream>

#include <QFile>
#include <QTextStream>

#include "bridge.h"

/**
 * @brief 主测试入口。
 * @returns int 测试通过返回 0，失败返回 1。
 */
int main() {
  const QByteArray mockApiLogPath = QByteArray("/tmp/sam-qt-host-APIlog.txt");
  qputenv("SAM_API_LOG_PATH", mockApiLogPath);

  Bridge bridge;
  bridge.clearApiLog();

  QFile logFile(QString::fromUtf8(mockApiLogPath));
  if (!logFile.exists()) {
    std::cerr << "期望 APIlog 文件被创建，但文件不存在" << std::endl;
    return 1;
  }

  if (!bridge.appendApiLog(QStringLiteral("START /loginByFree"))) {
    std::cerr << "期望追加 API 日志成功，但 appendApiLog 返回 false" << std::endl;
    return 1;
  }

  if (!logFile.open(QIODevice::ReadOnly | QIODevice::Text)) {
    std::cerr << "期望能读取 APIlog，但打开失败" << std::endl;
    return 1;
  }

  const QString content = QTextStream(&logFile).readAll();
  logFile.close();
  if (!content.contains(QStringLiteral("START /loginByFree"))) {
    std::cerr << "期望 APIlog 包含写入内容，实际内容为: " << content.toStdString() << std::endl;
    return 1;
  }

  return 0;
}
