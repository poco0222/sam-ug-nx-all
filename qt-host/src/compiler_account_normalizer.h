/**
 * @file compiler_account_normalizer.h
 * @description 编制人账号规范化工具声明，仅用于宿主环境变量兜底场景。
 * @author Codex
 * @date 2026-03-17
 */
#pragma once

#include <QString>

/**
 * @brief 规范化环境变量兜底得到的编制人账号。
 * @param userName 原始编制人账号。
 * @returns QString 规范化后的编制人账号。
 */
QString normalizeEnvironmentCompilerUserName(const QString& userName);
