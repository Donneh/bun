<script setup lang="ts">
import { useId } from "vue";

defineProps<{ title: string; detail?: string | undefined }>();

const headingId = useId();
</script>

<template>
  <section class="section" :aria-labelledby="headingId">
    <div class="head">
      <h2 :id="headingId" class="title">{{ title }}</h2>
      <p v-if="detail" class="detail">{{ detail }}</p>
    </div>
    <slot />
  </section>
</template>

<style scoped>
.section {
  display: grid;
  gap: var(--rk-space-4);
}

.head {
  display: flex;
  flex-wrap: wrap;
  gap: var(--rk-space-1) var(--rk-space-3);
  align-items: baseline;
}

.title {
  margin: 0;
  font: var(--rk-font-weight-bold) var(--rk-font-size-lg) var(--rk-font-family);
}

.detail {
  margin: 0;
  color: var(--rk-color-text-muted);
  font: var(--rk-font-size-xs) var(--rk-font-family-detail);
}
</style>
