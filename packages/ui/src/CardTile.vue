<script setup lang="ts">
import { computed } from "vue";
import CardImage from "./CardImage.vue";
import type { CardOrientation } from "./card-summary.ts";
import { isPlainLeftClick } from "./link-click.ts";

const props = defineProps<{
  name: string;
  subtitle: string | null;
  imageUrl: string;
  orientation: CardOrientation;
  href: string;
  srcset?: string | undefined;
  sizes?: string | undefined;
}>();

const emit = defineEmits<{ navigate: [href: string] }>();

const linkName = computed(() => (props.subtitle ? `${props.name}, ${props.subtitle}` : props.name));

function followLink(event: MouseEvent) {
  if (!isPlainLeftClick(event)) return;
  event.preventDefault();
  emit("navigate", props.href);
}
</script>

<template>
  <a class="tile" :href="href" :aria-label="linkName" @click="followLink">
    <figure class="figure">
      <CardImage
        class="frame"
        :name="name"
        :image-url="imageUrl"
        :orientation="orientation"
        :srcset="srcset"
        :sizes="sizes"
      />
      <figcaption class="caption">
        <span class="name">{{ name }}</span>
        <span v-if="subtitle" class="subtitle">{{ subtitle }}</span>
      </figcaption>
    </figure>
  </a>
</template>

<style scoped>
.tile {
  display: block;
  height: 100%;
  border-radius: var(--rk-radius-lg);
  color: inherit;
  text-decoration: none;
}

.figure {
  display: flex;
  flex-direction: column;
  gap: var(--rk-space-2);
  height: 100%;
  margin: 0;
}

.frame {
  transition: transform var(--rk-duration-fast) ease-out;
}

@media (hover: hover) {
  .tile:hover .frame {
    transform: translateY(calc(-1 * var(--rk-space-1)));
  }

  .tile:hover .name {
    color: var(--rk-color-accent-text);
  }
}

.tile:focus-visible {
  outline: none;
}

.tile:focus-visible .frame {
  outline: var(--rk-focus-width) solid var(--rk-color-accent);
  outline-offset: var(--rk-focus-width);
}

@media (prefers-reduced-motion: reduce) {
  .frame {
    transition: none;
  }

  .tile:hover .frame {
    transform: none;
  }
}

.caption {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.name {
  overflow-wrap: anywhere;
  transition: color var(--rk-duration-fast) ease;
  font-size: var(--rk-font-size-md);
  font-weight: var(--rk-font-weight-bold);
}

.subtitle {
  color: var(--rk-color-text-muted);
  font-size: var(--rk-font-size-sm);
}

.tile:focus-visible .name {
  color: var(--rk-color-accent-text);
}
</style>
