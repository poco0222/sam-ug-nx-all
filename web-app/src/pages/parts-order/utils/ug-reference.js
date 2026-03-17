/**
 * @file ug-reference.js
 * @description UG 引用图片处理工具，负责把 IPC base64 转换为可上传 File。
 * @author Codex
 * @date 2026-03-03
 */

/** data URL 解析正则：支持 `data:image/png;base64,` 结构。 */
const DATA_URL_BASE64_REGEXP = /^data:([^;,]+)(?:;[^;,=]+=[^;,]+)*;base64,(.+)$/i;
/** base64 合法字符正则。 */
const BASE64_PAYLOAD_REGEXP = /^[A-Za-z0-9+/]*={0,2}$/;
/** 支持的图片 MIME 与扩展名映射。 */
const IMAGE_MIME_EXTENSION_MAP = Object.freeze({
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg"
});
/** base64 每 4 位一组，不足时需要补齐。 */
const BASE64_GROUP_SIZE = 4;

/**
 * 归一化图片 MIME，统一大小写与常见别名。
 * @param {string} rawMimeType 原始 MIME。
 * @returns {string} 归一化后的 MIME，未知类型返回空字符串。
 */
function normalizeImageMimeType(rawMimeType) {
  const normalized = String(rawMimeType ?? "").trim().toLowerCase();
  if (!normalized) {
    return "";
  }
  if (normalized === "image/jpg") {
    return "image/jpeg";
  }
  return normalized;
}

/**
 * 解析原始 base64 输入，兼容 data URL 与纯 base64。
 * @param {string} rawBase64 原始 base64 文本。
 * @returns {{mimeType:string, payload:string}}
 */
function parseRawBase64Input(rawBase64) {
  const normalizedInput = String(rawBase64 ?? "").trim();
  if (!normalizedInput) {
    throw new Error("UG引用失败：base64 为空");
  }

  const matchedDataUrl = normalizedInput.match(DATA_URL_BASE64_REGEXP);
  if (matchedDataUrl) {
    return {
      mimeType: normalizeImageMimeType(matchedDataUrl[1]),
      payload: matchedDataUrl[2]
    };
  }

  return {
    mimeType: "",
    payload: normalizedInput
  };
}

/**
 * 归一化并校验 base64 载荷。
 * @param {string} payload base64 载荷文本。
 * @returns {string} 可直接解码的 base64 文本（已补齐 padding）。
 */
function normalizeBase64Payload(payload) {
  const compactPayload = String(payload ?? "").replace(/\s+/g, "");
  if (!compactPayload) {
    throw new Error("UG引用失败：base64 为空");
  }

  const paddingSize = (BASE64_GROUP_SIZE - (compactPayload.length % BASE64_GROUP_SIZE)) % BASE64_GROUP_SIZE;
  const normalizedPayload = compactPayload + "=".repeat(paddingSize);
  if (!BASE64_PAYLOAD_REGEXP.test(normalizedPayload)) {
    throw new Error("UG引用失败：base64 格式非法");
  }
  return normalizedPayload;
}

/**
 * 将 base64 文本解码为字节数组。
 * @param {string} normalizedPayload 已归一化 base64 载荷。
 * @returns {Uint8Array}
 */
function decodeBase64ToBytes(normalizedPayload) {
  try {
    if (typeof atob === "function") {
      const binaryText = atob(normalizedPayload);
      const bytes = new Uint8Array(binaryText.length);
      for (let index = 0; index < binaryText.length; index += 1) {
        bytes[index] = binaryText.charCodeAt(index);
      }
      return bytes;
    }

    // Node 测试环境兼容分支：浏览器运行时不会进入该路径。
    const buffer = Buffer.from(normalizedPayload, "base64");
    return new Uint8Array(buffer);
  } catch (_) {
    throw new Error("UG引用失败：base64 解码失败");
  }
}

/**
 * 基于图片文件头推断 MIME（用于纯 base64 且无 data URL 头场景）。
 * @param {Uint8Array} bytes 图片字节数组。
 * @returns {string}
 */
function inferImageMimeTypeFromBytes(bytes) {
  if (bytes.length >= 8) {
    const isPng =
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a;
    if (isPng) {
      return "image/png";
    }
  }
  if (bytes.length >= 3) {
    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    if (isJpeg) {
      return "image/jpeg";
    }
  }
  return "";
}

/**
 * 生成 UG 引用文件名，按后端匹配约束使用：`<importPartCode>.<ext>`。
 * @param {string|number|null|undefined} importPartCode 零件件号（后端匹配键）。
 * @param {string} mimeType 图片 MIME。
 * @returns {string}
 */
function buildUgFileName(importPartCode, mimeType) {
  const normalizedImportPartCode = String(importPartCode ?? "").trim();
  if (!normalizedImportPartCode) {
    throw new Error("UG引用失败：importPartCode 为空");
  }
  const extension = IMAGE_MIME_EXTENSION_MAP[mimeType] ?? "png";
  return `${normalizedImportPartCode}.${extension}`;
}

/**
 * 将 IPC base64 图片转换为浏览器可上传 File。
 * @param {{
 *   rawBase64:string,
 *   importPartCode:string|number|null|undefined,
 *   partCode?:string|number|null|undefined,
 *   timestamp?:number
 * }} options 转换参数。
 * @returns {{file:File,mimeType:string,previewUrl:string}}
 */
export function decodeBase64ImageToFile(options) {
  const rawBase64 = options?.rawBase64 ?? "";
  const importPartCode = options?.importPartCode ?? options?.partCode ?? "";

  const parsedSource = parseRawBase64Input(rawBase64);
  const normalizedPayload = normalizeBase64Payload(parsedSource.payload);
  const bytes = decodeBase64ToBytes(normalizedPayload);
  const inferredMimeType = inferImageMimeTypeFromBytes(bytes);
  const resolvedMimeType = normalizeImageMimeType(parsedSource.mimeType) || inferredMimeType || "image/png";
  const fileName = buildUgFileName(importPartCode, resolvedMimeType);
  const file = new File([bytes], fileName, { type: resolvedMimeType });
  const previewUrl = `data:${resolvedMimeType};base64,${normalizedPayload}`;

  return {
    file,
    mimeType: resolvedMimeType,
    previewUrl
  };
}
