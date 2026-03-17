/**
 * @file auth.js
 * @description 免登录认证接口。
 */
import axios from "axios";
import http from "@/services/http";
import { buildApiUrl } from "@/services/http";
import { extractServerMessage, isBusinessSuccessCode, resolveHttpErrorMessage } from "@/services/http-error";

/** 免登录接口路径。 */
export const loginByFreeApiPath = "/loginByFree";

/** 免登录接口完整地址。 */
export const loginByFreeApiUrl = buildApiUrl(loginByFreeApiPath);

/**
 * 通过编制人用户名免登录，获取访问令牌。
 * @param {string} userName 编制人用户名。
 * @returns {Promise} 后端返回的登录结果（含 token）。
 */
export function loginByFree(userName) {
  // 后端 LoginBody 字段为 username；同时保留 userName 兼容历史实现。
  return http.post(loginByFreeApiPath, { username: userName, userName }, {
    headers: { isToken: false }
  });
}

/**
 * 通过原始请求获取免登录响应明细，便于记录详细日志。
 * @param {string} userName 编制人用户名。
 * @returns {Promise<{ok:boolean,token:string,status:number|string,data:any,url:string,method:string,requestBody:object,errorMessage:string}>}
 */
export async function loginByFreeWithMeta(userName) {
  const requestBody = { username: userName, userName };

  try {
    const response = await axios.post(loginByFreeApiUrl, requestBody, {
      timeout: 15000
    });
    const responseData = response?.data;
    const hasBusinessCode =
      responseData && typeof responseData === "object" && Object.prototype.hasOwnProperty.call(responseData, "code");
    const businessSuccess = !hasBusinessCode || isBusinessSuccessCode(responseData.code);
    const token = responseData?.token ?? responseData?.data?.token ?? "";
    const errorMessage = businessSuccess
      ? ""
      : extractServerMessage(responseData) || `请求失败（业务码：${responseData?.code ?? "unknown"}）`;

    return {
      ok: businessSuccess && Boolean(token),
      token: token ? String(token) : "",
      status: response?.status ?? "",
      data: responseData,
      url: loginByFreeApiUrl,
      method: "POST",
      requestBody,
      errorMessage: businessSuccess && !token ? "免登录未返回 token" : errorMessage
    };
  } catch (error) {
    return {
      ok: false,
      token: "",
      status: error?.response?.status ?? "",
      data: error?.response?.data ?? null,
      url: loginByFreeApiUrl,
      method: "POST",
      requestBody,
      errorMessage: resolveHttpErrorMessage(error)
    };
  }
}
