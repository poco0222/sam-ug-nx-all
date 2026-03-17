/**
 * @file http.js
 * @description Axios 实例配置，统一管理后端访问基地址、业务码判错与异常文案透传。
 * @author Codex
 * @date 2026-02-27
 */
import axios from "axios";
import {
  extractServerMessage,
  isBusinessSuccessCode,
  resolveHttpErrorMessage
} from "@/services/http-error";

// 生产部署时通过环境变量覆盖。
export const httpBaseURL = import.meta.env.VITE_API_BASE_URL || "";

/**
 * 统一拼接接口完整地址，便于日志记录与非拦截请求复用。
 * @param {string} path 接口路径。
 * @returns {string} 完整 URL 或原始路径。
 */
export function buildApiUrl(path = "") {
  const normalizedPath = String(path ?? "").trim();
  if (!normalizedPath) {
    return httpBaseURL;
  }
  if (/^https?:\/\//i.test(normalizedPath)) {
    return normalizedPath;
  }
  if (!httpBaseURL) {
    return normalizedPath;
  }
  return `${httpBaseURL.replace(/\/$/, "")}/${normalizedPath.replace(/^\//, "")}`;
}

const http = axios.create({
  baseURL: httpBaseURL,
  timeout: 15000
});

http.interceptors.request.use((config) => {
  // isToken: false 的请求（如免登录）跳过 token 注入。
  const skipToken = config.headers?.isToken === false;
  if (skipToken) {
    delete config.headers.isToken;
  }
  const token = window.localStorage.getItem("sam_token");
  if (token && !skipToken) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => {
    const payload = response?.data;
    const hasBusinessCode = payload && typeof payload === "object" && Object.prototype.hasOwnProperty.call(payload, "code");
    if (hasBusinessCode && !isBusinessSuccessCode(payload.code)) {
      const message = extractServerMessage(payload) || `请求失败（业务码：${payload.code}）`;
      return Promise.reject(message);
    }
    return response;
  },
  async (error) => {
    const responseData = error?.response?.data;

    // 导出等二进制接口异常时，后端可能以 Blob(JSON) 回包，这里优先解包提取 msg。
    if (typeof Blob !== "undefined" && responseData instanceof Blob && typeof responseData.text === "function") {
      try {
        const responseText = await responseData.text();
        const blobMessage = extractServerMessage(responseText);
        if (blobMessage) {
          return Promise.reject(blobMessage);
        }
      } catch (_) {
        // Blob 解析失败时，回退走通用错误解析。
      }
    }

    const message = resolveHttpErrorMessage(error);
    return Promise.reject(message);
  }
);

export default http;
