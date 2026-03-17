/**
 * @file bridge.js
 * @description 前端桥接接入层，封装 QWebChannel 初始化与上下文分发。
 * @author Codex
 * @date 2026-02-27
 */
import { compilerCandidatesApiUrl, getCompilerCandidatesWithMeta } from "@/services/api/compiler";
import { loginByFreeApiUrl, loginByFreeWithMeta } from "@/services/api/auth";
import { formatApiLogBlock, resolveStartupCompilerUserName, runCompilerStartupSequence } from "@/services/compiler-startup";
import { usePartsOrderStore } from "@/stores/partsOrderStore";

/** @type {boolean} 防止重复初始化桥接。 */
let initialized = false;
/** @type {any|null} Qt bridge 实例引用，用于后续主动调用宿主能力。 */
let qtBridge = null;

/**
 * @returns {void}
 */
export function initBridge() {
  if (initialized) {
    return;
  }
  initialized = true;

  // Qt 环境检测：存在 webChannelTransport 即认为运行在 QtWebEngine。
  const isQtRuntime = Boolean(window.qt?.webChannelTransport);

  if (isQtRuntime) {
    // Qt 环境优先接入真实桥接，若 QWebChannel 脚本未注入则动态加载。
    ensureQWebChannelScript(() => {
      window.QWebChannel(window.qt.webChannelTransport, (channel) => {
        const store = usePartsOrderStore();
        const bridge = channel.objects.bridge;
        qtBridge = bridge;

        bridge.contextUpdated.connect((json) => {
          handleContextJson(store, json, bridge);
        });

        bridge.bridgeError.connect((code, message) => {
          store.setError(`[桥接错误] ${code}: ${message}`);
        });

        bridge.requestInitialContext();
      });
    });
    return;
  }

  // 非 Qt 环境下使用 mock 数据，保证本地开发可运行。
  const store = usePartsOrderStore();
  applyMockContext(store);
}

/**
 * 持久化当前编制人到宿主本地文件。
 * @param {{userName:string,nickName:string}} payload 编制人信息。
 * @returns {Promise<boolean>} 保存成功返回 true。
 */
export function saveCompilerSelection(payload) {
  const userName = payload?.userName ? String(payload.userName) : "";
  const nickName = payload?.nickName ? String(payload.nickName) : "";
  if (!userName) {
    return Promise.resolve(false);
  }

  // 非 Qt 调试环境下直接返回成功，避免影响本地联调流程。
  if (!qtBridge || typeof qtBridge.saveCompilerUser !== "function") {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    try {
      qtBridge.saveCompilerUser(userName, nickName, (result) => {
        resolve(Boolean(result));
      });
    } catch (_) {
      resolve(false);
    }
  });
}

/**
 * @param {import('@/stores/partsOrderStore').usePartsOrderStore} store 状态仓库。
 * @param {string} json Qt 下发的 JSON 字符串。
 * @param {any} bridge Qt bridge 对象。
 */
async function handleContextJson(store, json, bridge) {
  try {
    const message = JSON.parse(json);
    const currentUserName = resolveStartupCompilerUserName({
      payload: message?.payload
    });

    // 启动阶段先放入当前用户名单项，避免候选用户接口返回前下拉为空。
    store.setCompilerCandidates([{ label: currentUserName, value: currentUserName }]);

    const loginResult = await runCompilerStartupSequence({
      message,
      requestLogin: requestFreeLoginAndPersist,
      requestCompilerCandidates: getCompilerCandidatesWithMeta,
      applyContextMessage: (contextMessage) => {
        store.applyContextMessage(contextMessage);
      },
      updateCompilerCandidates: (options) => {
        store.setCompilerCandidates(options);
      },
      writeApiLog: appendApiLog,
      loginApiUrl: loginByFreeApiUrl,
      candidateApiUrl: compilerCandidatesApiUrl
    });

    if (loginResult?.ok) {
      store.clearError();
    } else {
      store.setError(loginResult?.errorMessage || "免登录失败，请检查网络或账号配置");
    }

    // 成功处理后回执，便于宿主做消息确认。
    if (message.messageId && bridge?.ack) {
      bridge.ack(message.messageId);
    }
  } catch (error) {
    store.setError(`上下文 JSON 解析失败: ${error}`);
  }
}

/**
 * 通过桥接将 API 日志写入宿主文件；宿主不存在时退化到控制台。
 * @param {string} message 日志文本。
 * @returns {Promise<boolean>} 写入成功返回 true。
 */
function appendApiLog(message) {
  const normalizedMessage = typeof message === "string" ? message.trim() : "";
  if (!normalizedMessage) {
    return Promise.resolve(false);
  }

  if (!qtBridge || typeof qtBridge.appendApiLog !== "function") {
    console.info("[bridge-api-log]\n" + normalizedMessage);
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    try {
      qtBridge.appendApiLog(normalizedMessage, (result) => {
        resolve(Boolean(result));
      });
    } catch (error) {
      console.warn("[bridge] APIlog 写入失败:", error);
      resolve(false);
    }
  });
}

/**
 * 调用免登录接口并在成功后写入本地 token。
 * @param {string} userName 编制人用户名。
 * @returns {Promise<{ok:boolean,token:string,status:number|string,data:any,url:string,method:string,requestBody:object,errorMessage:string}>}
 */
async function requestFreeLoginAndPersist(userName) {
  const result = await loginByFreeWithMeta(userName);
  if (result?.ok && result?.token) {
    window.localStorage.setItem("sam_token", result.token);
  }
  return result;
}

/**
 * 触发一次免登录并写入本地 token。
 * @param {string} userName 编制人用户名。
 * @returns {Promise<boolean>} 免登录成功返回 true。
 */
export async function triggerFreeLogin(userName) {
  const normalizedUserName = userName ? String(userName).trim() : "";
  if (!normalizedUserName) {
    return false;
  }

  await appendApiLog(
    formatApiLogBlock({
      phase: "START",
      apiName: "loginByFree",
      url: loginByFreeApiUrl,
      method: "POST",
      userName: normalizedUserName,
      requestBody: {
        username: normalizedUserName,
        userName: normalizedUserName
      }
    })
  );

  const result = await requestFreeLoginAndPersist(normalizedUserName);
  if (result?.ok) {
    await appendApiLog(
      formatApiLogBlock({
        phase: "SUCCESS",
        apiName: "loginByFree",
        url: loginByFreeApiUrl,
        method: "POST",
        userName: normalizedUserName,
        status: result?.status ?? "",
        requestBody: result?.requestBody ?? {},
        responseBody: result?.data ?? {}
      })
    );
    return true;
  }

  await appendApiLog(
    formatApiLogBlock({
      phase: "FAIL",
      apiName: "loginByFree",
      url: loginByFreeApiUrl,
      method: "POST",
      userName: normalizedUserName,
      status: result?.status ?? "",
      requestBody: result?.requestBody ?? {},
      responseBody: result?.data ?? {},
      errorMessage: result?.errorMessage ?? "免登录失败"
    })
  );
  console.error("[bridge] 免登录失败:", result?.errorMessage ?? "未知错误");
  return false;
}

/**
 * @param {Function} onReady 脚本加载完成回调。
 */
function ensureQWebChannelScript(onReady) {
  if (window.QWebChannel) {
    onReady();
    return;
  }

  const script = document.createElement("script");
  script.src = "qrc:///qtwebchannel/qwebchannel.js";
  script.onload = onReady;
  script.onerror = () => {
    const store = usePartsOrderStore();
    store.setError("Qt 桥接脚本加载失败，已切换为本地 mock 模式");
    applyMockContext(store);
  };
  document.head.appendChild(script);
}

/**
 * @param {import('@/stores/partsOrderStore').usePartsOrderStore} store 状态仓库。
 */
function applyMockContext(store) {
  const mockMessage = {
    messageId: `mock-${Date.now()}`,
    timestamp: Date.now(),
    eventType: "parts_context",
    payload: {
      projectCode: "P001",
      moldOrderNum: "MO-001",
      parts: [
        { partId: 1, pcode: "P-001", pname: "示例零件A", qty: 2 },
        { partId: 2, pcode: "P-002", pname: "示例零件B", qty: 1 }
      ],
      operator: "web-mock"
    }
  };
  store.applyContextMessage(mockMessage);
}
