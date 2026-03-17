<!--
  @file App.vue
  @description 应用根组件，仅负责承载路由出口。
  @author Codex
  @date 2026-02-27
-->
<template>
  <main class="app-shell app-shell-no-sidebar bg-aurora">
    <section class="app-content app-content-full">
      <div class="app-content-inner app-content-inner-full">
        <router-view />
      </div>
    </section>
  </main>
</template>

<script setup>
/**
 * 根组件无业务逻辑，仅做布局容器。
 */
</script>
