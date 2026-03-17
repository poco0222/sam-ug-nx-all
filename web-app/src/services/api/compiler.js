/**
 * @file compiler.js
 * @description 编制人候选用户接口封装。
 * @author Codex
 * @date 2026-03-17
 */
import axios from "axios";

import { buildApiUrl } from "@/services/http";
import { extractServerMessage, isBusinessSuccessCode, resolveHttpErrorMessage } from "@/services/http-error";

/** 候选用户接口路径。 */
export const compilerCandidatesApiPath = "/UGApi/UGApiController/getBianChengUserInfo";

/** 候选用户接口完整地址。 */
export const compilerCandidatesApiUrl = buildApiUrl(compilerCandidatesApiPath);

/**
 * 标准化单个候选用户条目。
 * @param {unknown} item 原始条目。
 * @returns {{label:string,value:string}|null} 标准化结果。
 */
function normalizeCompilerCandidateItem(item) {
  if (item === null || item === undefined) {
    return null;
  }

  if (typeof item === "string" || typeof item === "number") {
    const text = String(item).trim();
    if (!text) {
      return null;
    }
    return { label: text, value: text };
  }

  if (typeof item !== "object") {
    return null;
  }

  const value = String(
    item.value ??
      item.id ??
      item.userId ??
      item.userCode ??
      item.username ??
      item.userName ??
      item.account ??
      item.createBy ??
      item.name ??
      item.operator ??
      ""
  ).trim();
  if (!value) {
    return null;
  }

  const label = String(
    item.label ??
      item.nickName ??
      item.displayName ??
      item.name ??
      item.userName ??
      item.username ??
      item.operator ??
      item.userCode ??
      value
  ).trim();

  return { label: label || value, value };
}

/**
 * 从任意返回体中提取候选用户数组。
 * @param {any} payload 接口返回体。
 * @returns {unknown[]} 原始候选数组。
 */
function extractCompilerCandidateArray(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (!payload || typeof payload !== "object") {
    return [];
  }

  for (const key of ["data", "rows", "result", "list", "payload"]) {
    const value = payload[key];
    if (Array.isArray(value)) {
      return value;
    }
    if (value && typeof value === "object") {
      const nestedArray = extractCompilerCandidateArray(value);
      if (nestedArray.length > 0) {
        return nestedArray;
      }
    }
  }

  return [];
}

/**
 * 将候选用户数组去重并标准化。
 * @param {unknown[]} source 原始候选数组。
 * @returns {{label:string,value:string}[]} 标准化候选项。
 */
function normalizeCompilerCandidates(source = []) {
  const options = [];
  const seenValues = new Set();

  source.forEach((item) => {
    const normalized = normalizeCompilerCandidateItem(item);
    if (!normalized || seenValues.has(normalized.value)) {
      return;
    }
    seenValues.add(normalized.value);
    options.push(normalized);
  });

  return options;
}

/**
 * 获取编制人候选用户，并返回便于日志记录的响应明细。
 * @returns {Promise<{ok:boolean,options:{label:string,value:string}[],status:number|string,data:any,url:string,method:string,requestBody:object,errorMessage:string}>}
 */
export async function getCompilerCandidatesWithMeta() {
  const requestBody = {};

  try {
    const response = await axios.post(compilerCandidatesApiUrl, requestBody, {
      timeout: 15000
    });
    const responseData = response?.data;
    const hasBusinessCode =
      responseData && typeof responseData === "object" && Object.prototype.hasOwnProperty.call(responseData, "code");
    const businessSuccess = !hasBusinessCode || isBusinessSuccessCode(responseData.code);
    const options = businessSuccess ? normalizeCompilerCandidates(extractCompilerCandidateArray(responseData)) : [];
    const errorMessage = businessSuccess
      ? ""
      : extractServerMessage(responseData) || `请求失败（业务码：${responseData?.code ?? "unknown"}）`;

    return {
      ok: businessSuccess,
      options,
      status: response?.status ?? "",
      data: responseData,
      url: compilerCandidatesApiUrl,
      method: "POST",
      requestBody,
      errorMessage
    };
  } catch (error) {
    return {
      ok: false,
      options: [],
      status: error?.response?.status ?? "",
      data: error?.response?.data ?? null,
      url: compilerCandidatesApiUrl,
      method: "POST",
      requestBody,
      errorMessage: resolveHttpErrorMessage(error)
    };
  }
}
