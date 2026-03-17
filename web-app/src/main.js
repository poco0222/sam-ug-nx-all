/**
 * @file main.js
 * @description Vue3 前端启动入口，注册路由、状态与桥接初始化。
 * @author Codex
 * @date 2026-02-27
 */
import { createApp } from "vue";
import { createPinia } from "pinia";

import App from "@/App.vue";
import router from "@/router";
import { initBridge } from "@/services/bridge";

import "@/styles/dishvision.css";

/**
 * 同步运行时环境标记，供样式层做平台差异化降级。
 * 说明：
 * 1. index.html 已在首帧做一次初始化，这里再次兜底，避免调试场景漏标记。
 * 2. Qt / Windows 统一进入轻量性能模式，降低动画与重绘成本。
 */
function applyRuntimeClassFlags() {
  const root = document.documentElement;
  const userAgent = window.navigator.userAgent || "";
  const isWindowsRuntime = /Windows/i.test(userAgent);
  const isQtRuntime = Boolean(window.qt?.webChannelTransport);

  root.setAttribute("data-theme", "light");
  root.style.colorScheme = "light";
  root.classList.toggle("runtime-qt", isQtRuntime);
  root.classList.toggle("runtime-windows", isWindowsRuntime);
  root.classList.toggle("runtime-perf-lite", isQtRuntime || isWindowsRuntime);
}

applyRuntimeClassFlags();

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

// 应用挂载前初始化桥接，确保页面可尽早接收上下文。
initBridge();

app.mount("#app");
