<!-- 布局容器 -->
<template>
  <div class="app-layout">
    <aside id="app-sidebar">
      <ArtSidebarMenu />
    </aside>

    <main id="app-main">
      <div id="app-header">
        <ArtHeaderBar />
      </div>
      <div id="app-content">
        <ArtPageContent />
      </div>
    </main>

    <div id="app-global">
      <ArtGlobalComponent />
    </div>
  </div>
</template>

<script setup lang="ts">
  import ArtGlobalComponent from '../art-global-component/index.vue'
  import ArtHeaderBar from '../art-header-bar/index.vue'
  import ArtSidebarMenu from '../art-menus/art-sidebar-menu/index.vue'
  import ArtPageContent from '../art-page-content/index.vue'
  defineOptions({ name: 'AppLayout' })
</script>

<style lang="scss" scoped>
  @use './style';
</style>
