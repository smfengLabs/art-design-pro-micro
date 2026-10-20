<script setup lang="ts">
interface Feature {
  index: string
  title: string
  description: string
  tag: string
  icon: string[]
}

defineProps<{
  feature: Feature
}>()
</script>

<template>
  <article class="ap-feature-card">
    <div class="ap-feature-card__top">
      <span class="ap-feature-icon">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path v-for="path in feature.icon" :key="path" :d="path" />
        </svg>
      </span>
      <span class="ap-feature-index">{{ feature.index }}</span>
    </div>
    <h3>{{ feature.title }}</h3>
    <p>{{ feature.description }}</p>
    <span class="ap-feature-tag">{{ feature.tag }}</span>
  </article>
</template>
