<!-- 节日文本滚动 -->
<template>
  <div
    class="overflow-hidden transition-[height] duration-600 ease-in-out"
    :style="{
      height: showFestivalText ? '48px' : '0'
    }"
  >
    <ArtTextScroll
      v-if="showFestivalText && currentFestivalData?.scrollText !== ''"
      :text="currentFestivalData?.scrollText || ''"
      style="margin-bottom: 12px"
      showClose
      @close="handleClose"
    />
  </div>
</template>

<script setup lang="ts">
  import { storeToRefs } from 'pinia'
  import ArtTextScroll from '../art-text-scroll/index.vue'
  import { useSettingStore } from '@art/app-core'
  import { useCeremony } from '@art/app-core'

  defineOptions({ name: 'ArtFestivalTextScroll' })

  const settingStore = useSettingStore()
  const { showFestivalText } = storeToRefs(settingStore)
  const { currentFestivalData } = useCeremony()

  const handleClose = () => {
    settingStore.setShowFestivalText(false)
  }
</script>
