/**
 * @file bridge.h
 * @description Qt 与前端页面之间的 QWebChannel 桥接对象定义。
 * @author Codex
 * @date 2026-02-27
 */
#pragma once

#include <QJsonObject>
#include <QObject>
#include <QString>

/**
 * @struct CompilerInfo
 * @brief 编制人基本信息记录。
 */
struct CompilerInfo {
  QString userName;
  QString nickName;
};

/**
 * @brief 供测试与前端桥接使用的编制人解析接口。
 * @param uploadRoot upload-data 根对象。
 * @returns CompilerInfo 汇总后的编制人信息。
 */
CompilerInfo resolveCompilerInfo(const QJsonObject& uploadRoot);

/**
 * @class Bridge
 * @brief 桥接对象，负责向前端分发上下文与错误消息。
 */
class Bridge final : public QObject {
  Q_OBJECT

 public:
  /**
   * @brief 构造函数。
   * @param parent 父对象。
   */
  explicit Bridge(QObject* parent = nullptr);

  /**
   * @brief 从宿主传入的 upload-data-file 中加载启动上下文。
   * @param uploadDataFilePath 命令行参数指定的 JSON 文件路径。
   * @return true 解析并转换成功。
   * @return false 文件读取或 JSON 解析失败。
   */
  bool loadInitialContextFromUploadFile(const QString& uploadDataFilePath);

 public slots:
  /**
   * @brief 前端请求首包上下文。
   */
  void requestInitialContext();

  /**
   * @brief 前端回执确认。
   * @param messageId 消息编号。
   */
  void ack(const QString& messageId);

  /**
   * @brief 供宿主或调试注入上下文。
   * @param contextJson JSON 字符串。
   */
  void pushContext(const QString& contextJson);

  /**
   * @brief 保存当前编制人到本地用户信息文件，行为与参考项目一致。
   * @param userName 编制人账号（userName）。
   * @param nickName 编制人显示名（nickName）。
   * @return bool 保存成功返回 true，失败返回 false。
   */
  bool saveCompilerUser(const QString& userName, const QString& nickName);

  /**
   * @brief 清空本次运行的 API 日志。
   */
  void clearApiLog();

  /**
   * @brief 追加一条 API 日志。
   * @param message 日志文本。
   * @return bool 追加成功返回 true。
   */
  bool appendApiLog(const QString& message);

 signals:
  /**
   * @brief 推送上下文消息给前端。
   * @param json 上下文 JSON 字符串。
   */
  void contextUpdated(const QString& json);

  /**
   * @brief 推送桥接错误给前端。
   * @param code 错误码。
   * @param message 错误信息。
   */
  void bridgeError(const QString& code, const QString& message);

 private:
  /**
   * @brief 本地调试用默认上下文。
   */
  QString buildDefaultContext() const;

  /**
   * @brief 将宿主 upload-data JSON 转换成前端需要的 context 消息。
   * @param uploadRoot upload-data-file 解析后的 JSON 根对象。
   * @return QString 可直接通过 contextUpdated 下发的 JSON 字符串。
   */
  QString buildContextFromUploadRoot(const QJsonObject& uploadRoot) const;

  /**
   * @brief 启动阶段待发送的上下文 JSON。
   */
  QString initialContextJson_;

  /**
   * @brief 启动阶段 upload-data-file 的原始根对象。
   * @details 用于 requestInitialContext 时按最新本地编制人重建上下文，避免刷新后回退。
   */
  QJsonObject initialUploadRoot_;

  /**
   * @brief 是否已缓存 upload-data-file 根对象。
   */
  bool hasInitialUploadRoot_ = false;

  /**
   * @brief 启动阶段待发送的错误码。
   */
  QString startupErrorCode_;

  /**
   * @brief 启动阶段待发送的错误信息。
   */
  QString startupErrorMessage_;
};
