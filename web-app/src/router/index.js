/**
 * @file index.js
 * @description 路由配置，定义零件工单页入口。
 * @author Codex
 * @date 2026-02-27
 */
import { createRouter, createWebHashHistory } from "vue-router";
import PartsOrderPage from "@/pages/parts-order/index.vue";

const routes = [
  {
    path: "/",
    name: "PartsOrder",
    // 首页改为静态导入，避免 Qt file:// 场景下懒加载 chunk 偶发失败导致页面局部空白。
    component: PartsOrderPage
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

export default router;
