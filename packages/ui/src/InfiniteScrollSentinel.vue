<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef } from "vue";

const props = withDefaults(defineProps<{ margin?: string }>(), { margin: "0px 0px 800px 0px" });
const emit = defineEmits<{ change: [visible: boolean] }>();

const sentinel = useTemplateRef<HTMLDivElement>("sentinel");
let observer: IntersectionObserver | undefined;

onMounted(() => {
  if (!sentinel.value) return;
  observer = new IntersectionObserver(
    (entries) => {
      const latest = entries.at(-1);
      if (latest) emit("change", latest.isIntersecting);
    },
    { rootMargin: props.margin },
  );
  observer.observe(sentinel.value);
});

onBeforeUnmount(() => {
  observer?.disconnect();
  emit("change", false);
});
</script>

<template>
  <div ref="sentinel" class="sentinel" aria-hidden="true" />
</template>

<style scoped>
.sentinel {
  height: 1px;
}
</style>
