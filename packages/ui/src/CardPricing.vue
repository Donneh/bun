<script setup lang="ts">
import { useId } from "vue";
import type { PricingContent } from "./card-detail.ts";
import PriceSparkline from "./PriceSparkline.vue";

defineProps<{ pricing: PricingContent }>();

const headingId = useId();
</script>

<template>
  <section class="pricing" :aria-labelledby="headingId">
    <h2 :id="headingId" class="heading">Market price</h2>
    <ul class="finishes">
      <li v-for="finish in pricing.finishes" :key="finish.finish" class="finish">
        <span class="finish-name">{{ finish.finish }}</span>
        <strong v-if="finish.market" class="market">{{ finish.market }}</strong>
        <div v-if="finish.trend" class="trend">
          <span class="change" aria-hidden="true">{{ finish.trend.change }}</span>
          <span class="period" aria-hidden="true">{{ finish.trend.period }}</span>
          <PriceSparkline :values="finish.trend.values" :label="finish.trend.description" />
        </div>
        <dl v-if="finish.range.length > 0" class="range">
          <div v-for="figure in finish.range" :key="figure.label" class="figure">
            <dt class="figure-label">{{ figure.label }}</dt>
            <dd class="figure-amount">{{ figure.amount }}</dd>
          </div>
        </dl>
      </li>
    </ul>
    <p class="attribution">{{ pricing.attribution }}</p>
  </section>
</template>

<style scoped>
.pricing {
  display: grid;
  gap: var(--rk-space-3);
}

.heading {
  margin: 0;
  color: var(--rk-color-text-muted);
  font: var(--rk-font-weight-regular) var(--rk-font-size-xs) var(--rk-font-family-mono);
}

.finishes {
  display: flex;
  flex-wrap: wrap;
  gap: var(--rk-space-4) var(--rk-space-8);
  margin: 0;
  padding: 0;
  list-style: none;
}

.finish {
  display: grid;
  gap: var(--rk-space-1);
  align-content: start;
}

.finish-name {
  color: var(--rk-color-text-muted);
  font-size: var(--rk-font-size-sm);
}

.market {
  font: var(--rk-font-weight-bold) 1.75rem / 1 var(--rk-font-family);
  font-variant-numeric: tabular-nums;
}

.trend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--rk-space-1) var(--rk-space-2);
  align-items: center;
}

.change {
  font-size: var(--rk-font-size-sm);
  font-weight: var(--rk-font-weight-bold);
  font-variant-numeric: tabular-nums;
}

.period {
  color: var(--rk-color-text-muted);
  font: var(--rk-font-size-xs) var(--rk-font-family-mono);
}

.range {
  display: flex;
  gap: var(--rk-space-4);
  margin: 0;
}

.figure {
  display: flex;
  gap: var(--rk-space-1);
  align-items: baseline;
}

.figure-label {
  color: var(--rk-color-text-muted);
  font: var(--rk-font-size-xs) var(--rk-font-family-mono);
}

.figure-amount {
  margin: 0;
  font-size: var(--rk-font-size-sm);
  font-variant-numeric: tabular-nums;
}

.attribution {
  margin: 0;
  color: var(--rk-color-text-muted);
  font-size: var(--rk-font-size-xs);
}
</style>
