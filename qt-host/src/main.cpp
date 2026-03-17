/**
 * @file main.cpp
 * @description QtWebEngine 宿主入口，负责初始化页面加载与 QWebChannel 桥接。
 * @author Codex
 * @date 2026-02-27
 */
#include <QApplication>
#include <QColor>
#include <QCoreApplication>
#include <QDebug>
#include <QFileInfo>
#include <QPalette>
#include <QStringList>
#include <QUrl>
#include <QWebChannel>
#include <QWebEnginePage>
#include <QWebEngineSettings>
#include <QWebEngineView>

#include "bridge.h"

int main(int argc, char* argv[]) {
  // 共享 OpenGL 上下文，降低 QtWebEngine 在部分 Windows 驱动上的纹理切换抖动。
  QCoreApplication::setAttribute(Qt::AA_ShareOpenGLContexts);

  QApplication app(argc, argv);
  app.setApplicationName(QStringLiteral("SAM UG Qt Host"));
  app.setOrganizationName(QStringLiteral("SAM"));

  QWebEngineView view;
  view.resize(1440, 900);
  view.setMinimumSize(1200, 760);
  view.setWindowTitle("SAM UG Qt Host");
  // 宿主首屏底色与 Tahoe 26 浅色基底对齐，降低页面加载期间闪烁。
  const QColor hostBaseColor(QStringLiteral("#f7f9fc"));
  view.setAutoFillBackground(true);
  view.setAttribute(Qt::WA_OpaquePaintEvent, true);
  QPalette viewPalette = view.palette();
  viewPalette.setColor(QPalette::Window, hostBaseColor);
  view.setPalette(viewPalette);
  view.setStyleSheet(QStringLiteral("background: #f7f9fc;"));
  view.page()->setBackgroundColor(hostBaseColor);
  // 允许 file:// 页面访问远程 HTTP(S) 接口，避免前端 Axios 在 Qt 内报 Network Error。
  view.settings()->setAttribute(QWebEngineSettings::LocalContentCanAccessRemoteUrls, true);
  // 关闭滚动动画器，减少低性能 Windows 设备上的滚动卡顿与闪烁概率。
  view.settings()->setAttribute(QWebEngineSettings::ScrollAnimatorEnabled, false);

  auto* bridge = new Bridge(&view);
  bridge->clearApiLog();
  auto* channel = new QWebChannel(&view);

  // 读取宿主启动参数：
  // 1. --upload-data-file：初始化前端上下文；
  // 2. --web-manual-mode：运行时覆盖前端“手输模式”（仅调试建议使用）。
  const QStringList args = QCoreApplication::arguments();
  QString uploadDataFilePath;
  QString webManualModeQueryValue;

  // 统一规范化 web-manual-mode 参数值，返回 "true"/"false"；非法值返回空字符串。
  const auto normalizeWebManualModeValue = [](const QString& rawValue) -> QString {
    const QString normalized = rawValue.trimmed().toLower();
    if (normalized == QStringLiteral("true") || normalized == QStringLiteral("1") || normalized == QStringLiteral("yes") ||
        normalized == QStringLiteral("on")) {
      return QStringLiteral("true");
    }
    if (normalized == QStringLiteral("false") || normalized == QStringLiteral("0") || normalized == QStringLiteral("no") ||
        normalized == QStringLiteral("off")) {
      return QStringLiteral("false");
    }
    return QString();
  };

  for (int i = 1; i < args.size(); ++i) {
    const QString argument = args[i];
    if (argument == QStringLiteral("--upload-data-file")) {
      if (i + 1 < args.size()) {
        uploadDataFilePath = args[i + 1];
        ++i;
      } else {
        qWarning() << "[main] Missing value for --upload-data-file";
      }
      continue;
    }

    // 支持两种格式：
    // 1) --web-manual-mode=true
    // 2) --web-manual-mode true
    if (argument.startsWith(QStringLiteral("--web-manual-mode="))) {
      const QString rawValue = argument.section('=', 1);
      const QString normalized = normalizeWebManualModeValue(rawValue);
      if (normalized.isEmpty()) {
        qWarning() << "[main] Invalid value for --web-manual-mode:" << rawValue
                   << ", expect true/false (or 1/0/yes/no/on/off)";
      } else {
        webManualModeQueryValue = normalized;
      }
      continue;
    }
    if (argument == QStringLiteral("--web-manual-mode")) {
      if (i + 1 < args.size() && !args[i + 1].startsWith(QStringLiteral("--"))) {
        const QString rawValue = args[i + 1];
        const QString normalized = normalizeWebManualModeValue(rawValue);
        if (normalized.isEmpty()) {
          qWarning() << "[main] Invalid value for --web-manual-mode:" << rawValue
                     << ", expect true/false (or 1/0/yes/no/on/off)";
        } else {
          webManualModeQueryValue = normalized;
        }
        ++i;
      } else {
        // 未显式传值时默认为 true，方便 F5 快速进入可手输调试。
        webManualModeQueryValue = QStringLiteral("true");
      }
    }
  }
  if (!uploadDataFilePath.isEmpty()) {
    const bool loadOk = bridge->loadInitialContextFromUploadFile(uploadDataFilePath);
    if (!loadOk) {
      qWarning() << "[main] Failed to load initial context from upload-data-file:" << uploadDataFilePath;
    }
  }

  // 将桥接对象注册为 front-end 可访问的 bridge。
  channel->registerObject(QStringLiteral("bridge"), bridge);
  view.page()->setWebChannel(channel);

  // 优先加载构建后的前端产物；若不存在则回退到 qrc 调试页。
  const QString webDistIndexPath = QCoreApplication::applicationDirPath() + QStringLiteral("/web-dist/index.html");
  QUrl pageUrl;
  if (QFileInfo::exists(webDistIndexPath)) {
    pageUrl = QUrl::fromLocalFile(webDistIndexPath);
  } else {
    pageUrl = QUrl(QStringLiteral("qrc:/web/index.html"));
  }
  if (!webManualModeQueryValue.isEmpty()) {
    pageUrl.setQuery(QStringLiteral("webManualMode=%1").arg(webManualModeQueryValue));
  }
  view.load(pageUrl);
  view.show();

  return app.exec();
}
