/**
 * @file bridge.cpp
 * @description QWebChannel 桥接对象实现。
 * @author Codex
 * @date 2026-02-27
 */
#include "bridge.h"

#include <QDateTime>
#include <QDebug>
#include <QDir>
#include <QEventLoop>
#include <QFile>
#include <QFileInfo>
#include <QJsonArray>
#include <QJsonDocument>
#include <QJsonObject>
#include <QNetworkAccessManager>
#include <QNetworkReply>
#include <QNetworkRequest>
#include <QRegularExpression>
#include <QSet>
#include <QStandardPaths>
#include <QStringList>
#include <QTimer>
#include <QUrl>

namespace {
/**
 * @brief 对字符串做统一清洗，避免空白导致匹配失败。
 * @param value 原始字符串。
 * @returns QString 去首尾空白后的值。
 */
QString normalizeText(const QString& value) {
  return value.trimmed();
}

/**
 * @brief 返回宿主默认持久化目录。
 * @details Windows 维持参考项目目录；非 Windows 使用 Qt 官方推荐的 AppDataLocation。
 * @returns QString 默认持久化目录。
 */
QString defaultHostDataDirectoryPath() {
#ifdef Q_OS_WIN
  return QStringLiteral("D:/UGerkaiInfo/userInfo");
#else
  /** @brief Qt 标准应用数据目录，避免将 Windows 风格路径误写到当前工作区。 */
  const QString standardPath = QStandardPaths::writableLocation(QStandardPaths::AppDataLocation);
  if (!standardPath.isEmpty()) {
    return standardPath;
  }

  /** @brief 标准目录不可用时的兜底路径，保证宿主仍有可写位置。 */
  return QDir::homePath() + QStringLiteral("/.sam-ug-qt-host");
#endif
}

/**
 * @brief 判断编制人信息是否有效。
 * @param info 编制人信息。
 * @returns bool 是否至少包含 userName 或 nickName。
 */
bool hasCompilerInfo(const CompilerInfo& info) {
  return !normalizeText(info.userName).isEmpty() || !normalizeText(info.nickName).isEmpty();
}

/**
 * @brief 获取用于提交给后端的账号值（优先 userName）。
 * @param info 编制人信息。
 * @returns QString 账号值。
 */
QString compilerAccount(const CompilerInfo& info) {
  const QString userName = normalizeText(info.userName);
  if (!userName.isEmpty()) {
    return userName;
  }
  return normalizeText(info.nickName);
}

/**
 * @brief 获取用于页面展示的编制人名称（优先 nickName）。
 * @param info 编制人信息。
 * @returns QString 展示名称。
 */
QString compilerDisplayName(const CompilerInfo& info) {
  const QString nickName = normalizeText(info.nickName);
  if (!nickName.isEmpty()) {
    return nickName;
  }
  return normalizeText(info.userName);
}

/**
 * @brief 获取编制人本地持久化文件路径。
 * @details 支持通过 SAM_COMPILER_INFO_PATH 覆盖默认路径。
 * @returns QString 本地文件路径。
 */
QString compilerInfoFilePath() {
  /** @brief 支持通过环境变量覆盖默认 userName.txt 路径。 */
  const QString overridePath = normalizeText(qEnvironmentVariable("SAM_COMPILER_INFO_PATH"));
  if (!overridePath.isEmpty()) {
    return overridePath;
  }
  return defaultHostDataDirectoryPath() + QStringLiteral("/userName.txt");
}

/**
 * @brief 从 JSON 对象按别名读取字符串字段。
 * @param object JSON 对象。
 * @param keys 字段别名列表。
 * @returns QString 命中的首个非空字符串。
 */
QString stringFromAliases(const QJsonObject& object, const QStringList& keys) {
  for (const QString& key : keys) {
    const QJsonValue value = object.value(key);
    if (!value.isString()) {
      continue;
    }
    const QString text = normalizeText(value.toString());
    if (!text.isEmpty()) {
      return text;
    }
  }
  return QString();
}

/**
 * @brief 从 JSON 对象按别名读取标量字段，并统一转为字符串。
 * @param object JSON 对象。
 * @param keys 字段别名列表。
 * @returns QString 命中的首个非空字符串。
 */
QString scalarTextFromAliases(const QJsonObject& object, const QStringList& keys) {
  for (const QString& key : keys) {
    const QJsonValue value = object.value(key);
    if (value.isUndefined() || value.isNull()) {
      continue;
    }

    QString text;
    if (value.isString()) {
      text = value.toString();
    } else if (value.isDouble()) {
      text = QString::number(value.toDouble(), 'g', 15);
    } else if (value.isBool()) {
      text = value.toBool() ? QStringLiteral("true") : QStringLiteral("false");
    } else {
      continue;
    }

    const QString normalized = normalizeText(text);
    if (!normalized.isEmpty()) {
      return normalized;
    }
  }
  return QString();
}

/**
 * @brief 从对象中提取编制人信息，兼容多个字段命名。
 * @param object JSON 对象。
 * @returns CompilerInfo 编制人信息。
 */
CompilerInfo compilerFromObject(const QJsonObject& object) {
  CompilerInfo info;
  info.userName = stringFromAliases(
      object, {QStringLiteral("userName"), QStringLiteral("username"), QStringLiteral("userCode"), QStringLiteral("account"),
               QStringLiteral("createBy"), QStringLiteral("operator"), QStringLiteral("value"), QStringLiteral("id")});
  info.nickName = stringFromAliases(
      object, {QStringLiteral("nickName"), QStringLiteral("name"), QStringLiteral("label"), QStringLiteral("displayName"),
               QStringLiteral("operator"), QStringLiteral("userName"), QStringLiteral("username")});
  return info;
}

/**
 * @brief 将编制人信息转换为标准下拉选项对象。
 * @param info 编制人信息。
 * @returns QJsonObject 标准选项对象。
 */
QJsonObject compilerToOptionObject(const CompilerInfo& info) {
  const QString account = compilerAccount(info);
  const QString displayName = compilerDisplayName(info);
  QJsonObject option;
  option.insert(QStringLiteral("value"), account);
  option.insert(QStringLiteral("label"), displayName);
  option.insert(QStringLiteral("userName"), account);
  option.insert(QStringLiteral("nickName"), displayName);
  option.insert(QStringLiteral("name"), displayName);
  return option;
}

/**
 * @brief 将任意数组格式标准化为编制人选项数组，并按账号去重。
 * @param source 原始数组。
 * @returns QJsonArray 标准化后的选项数组。
 */
QJsonArray normalizeCompilerOptionsArray(const QJsonArray& source) {
  QJsonArray options;
  QSet<QString> seenAccounts;
  for (const QJsonValue& value : source) {
    CompilerInfo info;
    if (value.isString() || value.isDouble()) {
      const QString text = normalizeText(value.toVariant().toString());
      info.userName = text;
      info.nickName = text;
    } else if (value.isObject()) {
      info = compilerFromObject(value.toObject());
    }

    const QString account = compilerAccount(info);
    if (account.isEmpty() || seenAccounts.contains(account)) {
      continue;
    }
    seenAccounts.insert(account);
    options.append(compilerToOptionObject(info));
  }
  return options;
}

/**
 * @brief 确保当前编制人存在于下拉选项中，避免“当前值不在选项里”导致回退。
 * @param options 原始下拉选项数组。
 * @param currentCompiler 当前编制人。
 * @returns QJsonArray 合并后的下拉选项数组。
 */
QJsonArray ensureCurrentCompilerInOptions(const QJsonArray& options, const CompilerInfo& currentCompiler) {
  QJsonArray normalized = normalizeCompilerOptionsArray(options);
  const QString currentAccount = compilerAccount(currentCompiler);
  if (currentAccount.isEmpty()) {
    return normalized;
  }

  for (const QJsonValue& value : normalized) {
    if (!value.isObject()) {
      continue;
    }
    const QString optionAccount = normalizeText(value.toObject().value(QStringLiteral("value")).toString());
    if (optionAccount == currentAccount) {
      return normalized;
    }
  }

  // 当前编制人不在列表时补一条，确保前端可回显。
  normalized.append(compilerToOptionObject(currentCompiler));
  return normalized;
}

/**
 * @brief 获取 API 日志的默认文件路径。
 * @returns QString 日志文件路径。
 */
QString apiLogFilePath() {
  /** @brief 支持通过环境变量覆盖默认 API 日志路径。 */
  const QString envPath = normalizeText(qEnvironmentVariable("SAM_API_LOG_PATH"));
  if (!envPath.isEmpty()) {
    return envPath;
  }
  return defaultHostDataDirectoryPath() + QStringLiteral("/APIlog.log");
}

/**
 * @brief 确保 API 日志目录存在。
 * @param path 日志文件路径。
 * @returns bool 目录存在或创建成功时为 true。
 */
bool ensureApiLogDirectory(const QString& path) {
  const QFileInfo fileInfo(path);
  QDir dir = fileInfo.dir();
  if (dir.exists()) {
    return true;
  }
  return dir.mkpath(QStringLiteral("."));
}

/**
 * @brief 将编制人写入本地 userName.txt，格式与参考项目保持一致。
 * @param info 编制人信息。
 * @param errorMessage 错误信息输出参数。
 * @returns bool 写入成功返回 true。
 */
bool saveCompilerInfoToFile(const CompilerInfo& info, QString* errorMessage) {
  const QString account = compilerAccount(info);
  const QString displayName = compilerDisplayName(info);
  if (account.isEmpty()) {
    if (errorMessage) {
      *errorMessage = QStringLiteral("编制人账号为空，无法保存");
    }
    return false;
  }

  const QString filePath = compilerInfoFilePath();
  const QFileInfo fileInfo(filePath);
  QDir parentDir = fileInfo.dir();
  if (!parentDir.exists() && !parentDir.mkpath(QStringLiteral("."))) {
    if (errorMessage) {
      *errorMessage = QStringLiteral("创建目录失败: %1").arg(parentDir.absolutePath());
    }
    return false;
  }

  QJsonObject payload;
  payload.insert(QStringLiteral("userName"), account);
  payload.insert(QStringLiteral("nickName"), displayName.isEmpty() ? account : displayName);
  const QByteArray content = QJsonDocument(payload).toJson(QJsonDocument::Indented);

  QFile file(filePath);
  if (!file.open(QIODevice::WriteOnly | QIODevice::Truncate)) {
    if (errorMessage) {
      *errorMessage = QStringLiteral("写入文件失败: %1").arg(file.errorString());
    }
    return false;
  }

  const qint64 writtenSize = file.write(content);
  file.close();
  if (writtenSize <= 0) {
    if (errorMessage) {
      *errorMessage = QStringLiteral("写入文件内容为空: %1").arg(filePath);
    }
    return false;
  }
  return true;
}

/**
 * @brief 从宿主 upload-data 根对象中提取编制人信息。
 * @param uploadRoot upload-data 根对象。
 * @returns CompilerInfo 编制人信息。
 */
CompilerInfo compilerFromUploadRoot(const QJsonObject& uploadRoot) {
  // 先尝试根对象字段。
  CompilerInfo info = compilerFromObject(uploadRoot);
  if (hasCompilerInfo(info)) {
    return info;
  }

  // 再尝试常见的嵌套对象字段。
  for (const QString& nestedKey :
       {QStringLiteral("currentUser"), QStringLiteral("userInfo"), QStringLiteral("compiler"), QStringLiteral("operatorInfo")}) {
    const QJsonValue nestedValue = uploadRoot.value(nestedKey);
    if (!nestedValue.isObject()) {
      continue;
    }
    info = compilerFromObject(nestedValue.toObject());
    if (hasCompilerInfo(info)) {
      return info;
    }
  }

  return CompilerInfo{};
}

/**
 * @brief 从参考工程保存的本地文件读取当前编制人信息。
 * @details 优先读取当前平台默认路径；Windows 额外兼容历史反斜杠路径。
 * @returns CompilerInfo 编制人信息，读取失败返回空结构。
 */
CompilerInfo compilerFromLocalUserFile() {
  QStringList candidatePaths;
  // 优先读取可配置路径。
  candidatePaths.append(compilerInfoFilePath());
#ifdef Q_OS_WIN
  // 兼容 Windows 风格反斜杠路径。
  candidatePaths.append(QStringLiteral("D:\\UGerkaiInfo\\userInfo\\userName.txt"));
#endif

  for (const QString& filePath : candidatePaths) {
    QFile file(filePath);
    if (!file.exists() || !file.open(QIODevice::ReadOnly)) {
      continue;
    }

    const QByteArray fileBytes = file.readAll();
    file.close();
    if (fileBytes.trimmed().isEmpty()) {
      continue;
    }

    // 优先按标准 JSON 读取。
    QJsonParseError parseError{};
    const QJsonDocument doc = QJsonDocument::fromJson(fileBytes, &parseError);
    if (parseError.error == QJsonParseError::NoError && doc.isObject()) {
      CompilerInfo info = compilerFromObject(doc.object());
      if (hasCompilerInfo(info)) {
        return info;
      }
    }

    // 兼容非严格 JSON 场景：按正则提取 userName / nickName。
    const QString text = QString::fromUtf8(fileBytes);
    CompilerInfo regexInfo;
    const QRegularExpression userRegex(QStringLiteral("\"userName\"\\s*:\\s*\"([^\"]+)\""));
    const QRegularExpression nickRegex(QStringLiteral("\"nickName\"\\s*:\\s*\"([^\"]+)\""));
    const QRegularExpressionMatch userMatch = userRegex.match(text);
    const QRegularExpressionMatch nickMatch = nickRegex.match(text);
    if (userMatch.hasMatch()) {
      regexInfo.userName = normalizeText(userMatch.captured(1));
    }
    if (nickMatch.hasMatch()) {
      regexInfo.nickName = normalizeText(nickMatch.captured(1));
    }
    if (hasCompilerInfo(regexInfo)) {
      return regexInfo;
    }
  }

  return CompilerInfo{};
}

/**
 * @brief 从 uploadRoot 中读取编制人候选列表（如已存在则透传）。
 * @param uploadRoot upload-data 根对象。
 * @returns QJsonArray 编制人候选列表。
 */
QJsonArray compilerOptionsFromUploadRoot(const QJsonObject& uploadRoot) {
  for (const QString& key : {QStringLiteral("compilerOptions"), QStringLiteral("compilerList"), QStringLiteral("compilers"),
                             QStringLiteral("operators"), QStringLiteral("users"), QStringLiteral("preparerList"),
                             QStringLiteral("prepareByList")}) {
    const QJsonValue value = uploadRoot.value(key);
    if (value.isArray() && !value.toArray().isEmpty()) {
      return normalizeCompilerOptionsArray(value.toArray());
    }
  }
  return QJsonArray();
}

/**
 * @brief 用单个编制人信息构造前端下拉选项。
 * @param info 编制人信息。
 * @returns QJsonArray 仅含一个选项的数组。
 */
QJsonArray buildSingleCompilerOption(const CompilerInfo& info) {
  QJsonArray options;
  options.append(compilerToOptionObject(info));
  return options;
}

/**
 * @brief 解析最终编制人下拉选项：宿主下发 > 当前编制人单项兜底。
 * @param uploadRoot upload-data 根对象。
 * @param currentCompiler 当前编制人。
 * @returns QJsonArray 最终可用选项列表。
 */
QJsonArray resolveCompilerOptions(const QJsonObject& uploadRoot, const CompilerInfo& currentCompiler) {
  QJsonArray options = compilerOptionsFromUploadRoot(uploadRoot);
  if (options.isEmpty()) {
    options = buildSingleCompilerOption(currentCompiler);
  }
  return ensureCurrentCompilerInOptions(options, currentCompiler);
}
}  // namespace

CompilerInfo resolveCompilerInfo(const QJsonObject& uploadRoot) {
  CompilerInfo info = compilerFromLocalUserFile();
  if (hasCompilerInfo(info)) {
    return info;
  }

  info = compilerFromUploadRoot(uploadRoot);
  if (hasCompilerInfo(info)) {
    return info;
  }

  info.userName = QStringLiteral("PopoY");
  info.nickName = QStringLiteral("PopoY");
  return info;
}

QString resolveCompilerInfoFilePath() {
  return compilerInfoFilePath();
}

QString resolveApiLogFilePath() {
  return apiLogFilePath();
}

Bridge::Bridge(QObject* parent) : QObject(parent) {}

void Bridge::clearApiLog() {
  const QString path = apiLogFilePath();
  if (!ensureApiLogDirectory(path)) {
    qWarning() << "[Bridge] 无法创建 API log 目录:" << path;
    return;
  }

  QFile file(path);
  if (!file.open(QIODevice::WriteOnly | QIODevice::Truncate)) {
    qWarning() << "[Bridge] 清空 API log 失败:" << file.errorString();
    return;
  }
  file.close();
}

bool Bridge::appendApiLog(const QString& message) {
  const QString path = apiLogFilePath();
  if (!ensureApiLogDirectory(path)) {
    qWarning() << "[Bridge] 无法创建 API log 目录:" << path;
    return false;
  }

  QFile file(path);
  if (!file.open(QIODevice::WriteOnly | QIODevice::Append | QIODevice::Text)) {
    qWarning() << "[Bridge] 写入 API log 失败:" << file.errorString();
    return false;
  }

  const QByteArray payload = (message + QChar('\n')).toUtf8();
  const qint64 written = file.write(payload);
  file.close();
  return written == payload.size();
}

bool Bridge::loadInitialContextFromUploadFile(const QString& uploadDataFilePath) {
  startupErrorCode_.clear();
  startupErrorMessage_.clear();
  initialContextJson_.clear();
  initialUploadRoot_ = QJsonObject{};
  hasInitialUploadRoot_ = false;

  QFile uploadFile(uploadDataFilePath);
  if (!uploadFile.exists()) {
    startupErrorCode_ = QStringLiteral("UPLOAD_FILE_NOT_FOUND");
    startupErrorMessage_ = QStringLiteral("upload-data-file 不存在: %1").arg(uploadDataFilePath);
    return false;
  }

  if (!uploadFile.open(QIODevice::ReadOnly)) {
    startupErrorCode_ = QStringLiteral("UPLOAD_FILE_OPEN_FAILED");
    startupErrorMessage_ = QStringLiteral("upload-data-file 打开失败: %1").arg(uploadDataFilePath);
    return false;
  }

  const QByteArray rawBytes = uploadFile.readAll();
  uploadFile.close();
  if (rawBytes.isEmpty()) {
    startupErrorCode_ = QStringLiteral("UPLOAD_FILE_EMPTY");
    startupErrorMessage_ = QStringLiteral("upload-data-file 内容为空: %1").arg(uploadDataFilePath);
    return false;
  }

  QJsonParseError parseError{};
  QJsonDocument uploadDoc = QJsonDocument::fromJson(rawBytes, &parseError);

  // 兼容宿主可能按本地编码写出的 JSON。
  if (parseError.error != QJsonParseError::NoError) {
    const QByteArray localUtf8Bytes = QString::fromLocal8Bit(rawBytes).toUtf8();
    uploadDoc = QJsonDocument::fromJson(localUtf8Bytes, &parseError);
  }

  if (parseError.error != QJsonParseError::NoError || !uploadDoc.isObject()) {
    startupErrorCode_ = QStringLiteral("UPLOAD_JSON_INVALID");
    startupErrorMessage_ = QStringLiteral("upload-data-file JSON 解析失败: %1").arg(parseError.errorString());
    return false;
  }

  const QJsonObject uploadRoot = uploadDoc.object();
  initialUploadRoot_ = uploadRoot;
  hasInitialUploadRoot_ = true;
  initialContextJson_ = buildContextFromUploadRoot(uploadRoot);
  if (initialContextJson_.trimmed().isEmpty()) {
    startupErrorCode_ = QStringLiteral("UPLOAD_CONTEXT_BUILD_FAILED");
    startupErrorMessage_ = QStringLiteral("upload-data-file 转换上下文失败");
    return false;
  }

  return true;
}

void Bridge::requestInitialContext() {
  // 优先基于 upload-data-file 重新构建上下文，确保刷新页面后编制人仍与本地文件一致。
  if (hasInitialUploadRoot_) {
    emit contextUpdated(buildContextFromUploadRoot(initialUploadRoot_));
  } else if (!initialContextJson_.trimmed().isEmpty()) {
    emit contextUpdated(initialContextJson_);
  } else {
    emit contextUpdated(buildDefaultContext());
  }

  // 启动阶段若存在输入文件相关错误，统一在首包后告知前端。
  if (!startupErrorCode_.isEmpty()) {
    emit bridgeError(startupErrorCode_, startupErrorMessage_);
  }
}

void Bridge::ack(const QString& messageId) {
  // 仅用于调试确认前端已收到消息。
  qDebug() << "[Bridge] front-end ack:" << messageId;
}

void Bridge::pushContext(const QString& contextJson) {
  if (contextJson.trimmed().isEmpty()) {
    emit bridgeError("EMPTY_CONTEXT", "收到空上下文，无法下发到前端");
    return;
  }

  emit contextUpdated(contextJson);
}

bool Bridge::saveCompilerUser(const QString& userName, const QString& nickName) {
  CompilerInfo info;
  info.userName = normalizeText(userName);
  info.nickName = normalizeText(nickName);
  if (!hasCompilerInfo(info)) {
    emit bridgeError(QStringLiteral("SAVE_COMPILER_INVALID"), QStringLiteral("编制人信息为空，无法保存"));
    return false;
  }

  QString errorMessage;
  const bool saved = saveCompilerInfoToFile(info, &errorMessage);
  if (!saved) {
    emit bridgeError(QStringLiteral("SAVE_COMPILER_FAILED"), errorMessage);
    return false;
  }
  return true;
}

QString Bridge::buildDefaultContext() const {
  // 生成本地可运行的最小上下文，避免前端启动阶段无数据。
  const qint64 ts = QDateTime::currentMSecsSinceEpoch();
  const CompilerInfo compilerInfo = resolveCompilerInfo(QJsonObject{});

  QJsonObject part;
  part.insert(QStringLiteral("partId"), QStringLiteral("1"));
  part.insert(QStringLiteral("id"), QStringLiteral("1"));
  part.insert(QStringLiteral("pcode"), QStringLiteral("P-001"));
  part.insert(QStringLiteral("partCode"), QStringLiteral("P-001"));
  part.insert(QStringLiteral("importPartCode"), QStringLiteral("P-001"));
  part.insert(QStringLiteral("pname"), QStringLiteral("示例零件"));
  part.insert(QStringLiteral("qty"), QStringLiteral("2"));

  QJsonArray parts;
  parts.append(part);

  QJsonObject payload;
  payload.insert(QStringLiteral("projectCode"), QStringLiteral("P001"));
  payload.insert(QStringLiteral("moldOrderNum"), QStringLiteral("MO-001"));
  payload.insert(QStringLiteral("parts"), parts);
  payload.insert(QStringLiteral("operator"), compilerDisplayName(compilerInfo));
  payload.insert(QStringLiteral("createBy"), compilerAccount(compilerInfo));
  payload.insert(QStringLiteral("compilerOptions"), resolveCompilerOptions(QJsonObject{}, compilerInfo));

  QJsonObject contextMessage;
  contextMessage.insert(QStringLiteral("messageId"), QStringLiteral("bootstrap-%1").arg(ts));
  contextMessage.insert(QStringLiteral("timestamp"), ts);
  contextMessage.insert(QStringLiteral("eventType"), QStringLiteral("parts_context"));
  contextMessage.insert(QStringLiteral("payload"), payload);
  return QString::fromUtf8(QJsonDocument(contextMessage).toJson(QJsonDocument::Compact));
}

QString Bridge::buildContextFromUploadRoot(const QJsonObject& uploadRoot) const {
  const qint64 ts = QDateTime::currentMSecsSinceEpoch();
  const CompilerInfo compilerInfo = resolveCompilerInfo(uploadRoot);

  // 宿主侧字段当前为 mouldOrderNum；兼容可能的 moldOrderNum。
  QString moldOrderNum = uploadRoot.value(QStringLiteral("mouldOrderNum")).toString();
  if (moldOrderNum.isEmpty()) {
    moldOrderNum = uploadRoot.value(QStringLiteral("moldOrderNum")).toString();
  }
  const QString bomName = uploadRoot.value(QStringLiteral("bomName")).toString();

  QJsonArray contextParts;
  const QJsonArray rawParts = uploadRoot.value(QStringLiteral("data")).toArray();
  for (const QJsonValue& rawPartValue : rawParts) {
    if (!rawPartValue.isObject()) {
      continue;
    }

    const QJsonObject rawPart = rawPartValue.toObject();
    const QString partIdText = scalarTextFromAliases(
        rawPart, {QStringLiteral("id"), QStringLiteral("partId"), QStringLiteral("partID"), QStringLiteral("part_id")});
    const QString pCode = scalarTextFromAliases(rawPart, {QStringLiteral("p_code"), QStringLiteral("pCode"),
                                                          QStringLiteral("pcode"), QStringLiteral("partCode"),
                                                          QStringLiteral("part_code"), QStringLiteral("importPartCode"),
                                                          QStringLiteral("import_part_code"), QStringLiteral("partNumber")});
    const QString importPartCode = scalarTextFromAliases(
        rawPart, {QStringLiteral("import_part_code"), QStringLiteral("importPartCode"), QStringLiteral("partNumber"),
                  QStringLiteral("p_code"), QStringLiteral("pCode"), QStringLiteral("pcode"), QStringLiteral("partCode"),
                  QStringLiteral("part_code")});
    const QString resolvedImportPartCode = importPartCode.isEmpty() ? pCode : importPartCode;
    const QString resolvedPartName = pCode.isEmpty() ? resolvedImportPartCode : pCode;

    QJsonObject contextPart;
    // 同时保留 partId/id，兼容前端不同取值分支。
    contextPart.insert(QStringLiteral("partId"), partIdText);
    contextPart.insert(QStringLiteral("id"), partIdText);
    contextPart.insert(QStringLiteral("pcode"), pCode);
    contextPart.insert(QStringLiteral("pCode"), pCode);
    contextPart.insert(QStringLiteral("p_code"), pCode);
    contextPart.insert(QStringLiteral("partCode"), pCode);
    contextPart.insert(QStringLiteral("importPartCode"), resolvedImportPartCode);
    contextPart.insert(QStringLiteral("import_part_code"), resolvedImportPartCode);
    contextPart.insert(QStringLiteral("pname"), bomName.isEmpty() ? resolvedPartName : bomName);
    contextPart.insert(QStringLiteral("partCategory"), QStringLiteral(""));
    contextPart.insert(QStringLiteral("qty"), QStringLiteral("1"));
    contextPart.insert(QStringLiteral("paramList"), rawPart.value(QStringLiteral("paramList")).toArray());
    contextPart.insert(QStringLiteral("base64"), rawPart.value(QStringLiteral("base64")).toString());
    contextParts.append(contextPart);
  }

  QJsonObject payload;
  payload.insert(QStringLiteral("projectCode"), QStringLiteral("NX"));
  payload.insert(QStringLiteral("moldOrderNum"), moldOrderNum);
  payload.insert(QStringLiteral("bomName"), bomName);
  payload.insert(QStringLiteral("parts"), contextParts);
  payload.insert(QStringLiteral("operator"), compilerDisplayName(compilerInfo));
  payload.insert(QStringLiteral("createBy"), compilerAccount(compilerInfo));
  payload.insert(QStringLiteral("compilerOptions"), resolveCompilerOptions(uploadRoot, compilerInfo));
  payload.insert(QStringLiteral("source"), QStringLiteral("upload-data-file"));

  QJsonObject contextMessage;
  contextMessage.insert(QStringLiteral("messageId"), QStringLiteral("startup-%1").arg(ts));
  contextMessage.insert(QStringLiteral("timestamp"), ts);
  contextMessage.insert(QStringLiteral("eventType"), QStringLiteral("parts_context"));
  contextMessage.insert(QStringLiteral("payload"), payload);

  return QString::fromUtf8(QJsonDocument(contextMessage).toJson(QJsonDocument::Compact));
}
