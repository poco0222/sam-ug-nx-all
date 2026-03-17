/**
 * @file vite.config.js
 * @description Vue3 前端构建配置，定义别名与开发服务行为。
 * @author Codex
 * @date 2026-02-27
 */
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  // 在 Qt file:// 场景中必须使用相对路径，否则静态资源会加载失败导致白屏。
  base: "./",
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    }
  },
  server: {
    port: 5173,
    host: "0.0.0.0"
  }
});
