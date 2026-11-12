<script setup lang="ts">
import { computed, onBeforeUnmount } from "vue";
import CardImage from "./CardImage.vue";
import type { CardOrientation } from "./card-summary.ts";
import { copies } from "./collection.ts";
import { isPlainLeftClick } from "./link-click.ts";

const props = defineProps<{
  name: string;
  subtitle: string | null;
  imageUrl: string;
  orientation: CardOrientation;
  href: string;
  srcset?: string | undefined;
  sizes?: string | undefined;
  count?: number | undefined;
}>();

const emit = defineEmits<{ navigate: [href: string]; intent: [] }>();

const HOVER_INTENT_MS = 80;
let hoverTimer: ReturnType<typeof setTimeout> | undefined;

function startHoverIntent() {
  clearTimeout(hoverTimer);
  hoverTimer = setTimeout(() => emit("intent"), HOVER_INTENT_MS);
}

function cancelHoverIntent() {
  clearTimeout(hoverTimer);
}

onBeforeUnmount(cancelHoverIntent);

const linkName = computed(() =>
  [props.name, props.subtitle, props.count === undefined ? null : copies(props.count)]
    .filter((part): part is string => Boolean(part))
    .join(", "),
);

function followLink(event: MouseEvent) {
  if (!isPlainLeftClick(event)) return;
  event.preventDefault();
  emit("navigate", props.href);
}
</script>

<template>
  <a
    class="tile"
    :href="href"
    :aria-label="linkName"
    @click="followLink"
    @pointerenter="startHoverIntent"
    @pointerleave="cancelHoverIntent"
    @focus="emit('intent')"
    @touchstart.passive="emit('intent')"
  >
    <figure class="figure">
      <div class="art">
        <CardImage
          class="frame"
          :name="name"
          :image-url="imageUrl"
          :orientation="orientation"
          :srcset="srcset"
          :sizes="sizes"
        />
        <span v-if="count !== undefined" class="count" aria-hidden="true">×{{ count }}</span>
      </div>
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

.art {
  position: relative;
  transition: transform var(--rk-duration-fast) ease-out;
}

.count {
  position: absolute;
  right: var(--rk-space-2);
  bottom: var(--rk-space-2);
  min-width: 2rem;
  padding: var(--rk-space-1) var(--rk-space-2);
  border: var(--rk-border-width) solid var(--rk-glass-edge);
  border-radius: 999px;
  background: color-mix(in srgb, var(--rk-color-background) 85%, transparent);
  color: var(--rk-color-text);
  font: var(--rk-font-weight-bold) var(--rk-font-size-sm) / 1 var(--rk-font-family-mono);
  text-align: center;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

@media (hover: hover) {
  .tile:hover .art {
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
  .art {
    transition: none;
  }

  .tile:hover .art {
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
