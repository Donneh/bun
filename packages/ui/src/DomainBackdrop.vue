<script setup lang="ts">
import { computed } from "vue";
import Dither from "./Dither.vue";
import { type Domain, domainScope } from "./domain.ts";

const props = withDefaults(defineProps<{ domains: readonly Domain[]; glow?: boolean }>(), { glow: true });

const scope = computed(() => domainScope(props.domains));
</script>

<template>
  <div class="backdrop" v-bind="scope" aria-hidden="true">
    <div v-if="glow" class="glow" />
    <div class="dither">
      <Dither :key="scope.style['--rk-color-domain']" pattern="corner" color="domain" :intensity="1.4" />
    </div>
  </div>
</template>

<style scoped>
.backdrop {
  position: absolute;
  inset: 0 0 auto;
  height: 40rem;
  overflow: clip;
  pointer-events: none;
}

.glow {
  position: absolute;
  inset: -5% 0 auto;
  height: 100%;
  background:
    radial-gradient(
      35% 45% at 35% 35%,
      color-mix(in srgb, var(--rk-color-domain) 40%, transparent),
      transparent 70%
    ),
    radial-gradient(
      30% 40% at 70% 25%,
      color-mix(in srgb, var(--rk-color-domain-second) 30%, transparent),
      transparent 70%
    );
  filter: blur(40px);
}

.dither {
  position: absolute;
  inset: 0 0 auto 25%;
  height: 34rem;
  mask-image: linear-gradient(to bottom, black 30%, transparent);
}
</style>
