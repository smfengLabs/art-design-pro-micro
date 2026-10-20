<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { withBase } from 'vitepress'
import { siteConfig } from '../site'
import BrandMark from './BrandMark.vue'

const scrolled = ref(false)
const menuOpen = ref(false)
const isDark = ref(false)

let observer: MutationObserver | undefined

function syncTheme() {
  isDark.value = document.documentElement.classList.contains('dark')
}

function toggleTheme() {
  const root = document.documentElement
  const next = !root.classList.contains('dark')
  root.classList.toggle('dark', next)
  localStorage.setItem('vitepress-theme-appearance', next ? 'dark' : 'light')
  isDark.value = next
}

function handleScroll() {
  scrolled.value = window.scrollY > 18
}

function closeMenu() {
  menuOpen.value = false
}

onMounted(() => {
  handleScroll()
  syncTheme()
  window.addEventListener('scroll', handleScroll, { passive: true })
  observer = new MutationObserver(syncTheme)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  })
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  observer?.disconnect()
})
</script>

<template>
  <header class="ap-header" :class="{ 'is-scrolled': scrolled || menuOpen }">
    <div class="ap-shell ap-header__inner">
      <a class="ap-brand" :href="withBase('/')" aria-label="Art Design Pro Micro">
        <span class="ap-brand__mark">
          <BrandMark />
        </span>
        <span class="ap-brand__text">Art Design <span>Pro Micro</span></span>
      </a>

      <nav class="ap-nav" :class="{ 'is-open': menuOpen }" aria-label="主导航">
        <a href="#features" @click="closeMenu">核心特性</a>
        <a href="#architecture" @click="closeMenu">架构设计</a>
        <a :href="withBase(siteConfig.docs)" @click="closeMenu">文档</a>
        <a :href="withBase('/docs/faq')" @click="closeMenu">FAQ</a>
      </nav>

      <div class="ap-header__actions">
        <a
          class="ap-icon-link"
          :href="siteConfig.github"
          target="_blank"
          rel="noreferrer"
          aria-label="GitHub"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path
              d="M12 .5A11.5 11.5 0 0 0 .5 12.2c0 5.2 3.3 9.6 7.9 11.2.6.1.8-.3.8-.6v-2.1c-3.2.7-3.9-1.4-3.9-1.4-.5-1.4-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.8-1.6-2.6-.3-5.3-1.3-5.3-5.8 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.4 11.4 0 0 1 6 0C17.7 4.1 18.7 4.4 18.7 4.4c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.9 1.2 3.2 0 4.5-2.7 5.5-5.3 5.8.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6a11.7 11.7 0 0 0 7.9-11.2A11.5 11.5 0 0 0 12 .5Z"
            />
          </svg>
        </a>
        <a
          class="ap-icon-link ap-icon-link--gitee"
          :href="siteConfig.gitee"
          target="_blank"
          rel="noreferrer"
          aria-label="Gitee"
        >
          Gitee
        </a>
        <button
          class="ap-theme-toggle"
          type="button"
          :aria-label="isDark ? '切换到浅色模式' : '切换到深色模式'"
          @click="toggleTheme"
        >
          <svg v-if="isDark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
            <circle cx="12" cy="12" r="4.2" />
            <path d="M12 2.5v2M12 19.5v2M4.4 4.4l1.4 1.4M18.2 18.2l1.4 1.4M2.5 12h2M19.5 12h2M4.4 19.6l1.4-1.4M18.2 5.8l1.4-1.4" stroke-linecap="round" />
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
            <path d="M20.2 15.3A8.4 8.4 0 0 1 8.7 3.8 8.5 8.5 0 1 0 20.2 15.3Z" stroke-linejoin="round" />
          </svg>
        </button>
        <a
          class="ap-btn ap-btn--primary ap-btn--small ap-btn--header"
          :href="withBase(siteConfig.docs)"
        >
          快速开始
        </a>
        <button
          class="ap-menu-toggle"
          type="button"
          :aria-expanded="menuOpen"
          aria-label="打开导航"
          @click="menuOpen = !menuOpen"
        >
          <svg v-if="menuOpen" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <path d="m6 6 12 12M18 6 6 18" stroke-linecap="round" />
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" stroke-linecap="round" />
          </svg>
        </button>
      </div>
    </div>
  </header>
</template>
