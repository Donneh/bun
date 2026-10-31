<script setup lang="ts">
import CardText from "./CardText.vue";
import type { CardInfoContent, PrintingSummary } from "./card-detail.ts";
import GlassPanel from "./GlassPanel.vue";
import GlyphText from "./GlyphText.vue";
import { isPlainLeftClick } from "./link-click.ts";
import PrintingList from "./PrintingList.vue";
import RiftboundGlyph from "./RiftboundGlyph.vue";

defineProps<{ card: CardInfoContent; printings: readonly PrintingSummary[]; selected: string }>();

const emit = defineEmits<{ select: [id: string]; navigate: [href: string] }>();

function follow(event: MouseEvent, href: string) {
  if (!isPlainLeftClick(event)) return;
  event.preventDefault();
  emit("navigate", href);
}
</script>

<template>
  <GlassPanel class="info">
    <hgroup class="section head">
      <p class="kicker">
        <GlyphText v-for="(item, index) in card.kicker" :key="index" class="kicker-item" :parts="item" />
      </p>
      <h1 class="name">{{ card.name }}</h1>
      <p v-if="card.subtitle" class="subtitle">{{ card.subtitle }}</p>
    </hgroup>

    <dl v-if="card.stats.length > 0" class="section stats">
      <div v-for="stat in card.stats" :key="stat.label" class="stat">
        <dt class="stat-label">{{ stat.label }}</dt>
        <dd class="stat-value">
          <RiftboundGlyph v-if="stat.glyph" class="stat-glyph" :name="stat.glyph" decorative />
          <span :class="{ 'visually-hidden': !stat.valueShown }">{{ stat.value }}</span>
        </dd>
      </div>
    </dl>

    <div v-if="card.rules.length > 0" class="section rules">
      <CardText v-for="(text, index) in card.rules" :key="index" :text="text" />
    </div>

    <PrintingList
      class="section"
      :printings="printings"
      :selected="selected"
      @select="(id: string) => emit('select', id)"
    />

    <footer v-if="card.tags.length > 0 || card.artist" class="section foot">
      <ul v-if="card.tags.length > 0" class="tags" aria-label="Tags">
        <li v-for="tag in card.tags" :key="tag.href">
          <a class="tag" :href="tag.href" @click="follow($event, tag.href)">{{ tag.label }}</a>
        </li>
      </ul>
      <p v-if="card.artist" class="credit">Illustrated by {{ card.artist }}</p>
    </footer>
  </GlassPanel>
</template>

<style scoped>
.info {
  display: grid;
}

.section {
  display: grid;
  gap: var(--rk-space-3);
  padding: var(--rk-space-5) var(--rk-space-6);
}

.section + .section {
  border-top: var(--rk-border-width) solid var(--rk-glass-edge);
}

.head {
  gap: var(--rk-space-2);
  margin: 0;
  padding-top: var(--rk-space-6);
}

.kicker {
  display: flex;
  flex-wrap: wrap;
  gap: var(--rk-space-1) var(--rk-space-3);
  margin: 0;
  color: var(--rk-color-text-muted);
  font: var(--rk-font-size-xs) var(--rk-font-family-mono);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.kicker-item :deep(.glyph) {
  font-size: 1.3em;
}

.name {
  margin: 0;
  font: var(--rk-font-weight-bold) clamp(1.5rem, 3.5vw, 2rem) / 1 var(--rk-font-family);
  letter-spacing: var(--rk-letter-spacing-display);
  overflow-wrap: anywhere;
  text-wrap: balance;
}

.subtitle {
  margin: 0;
  color: var(--rk-color-text-muted);
  font-size: var(--rk-font-size-lg);
}

.stats {
  grid-template-columns: repeat(auto-fit, minmax(5rem, 1fr));
  gap: 0;
  margin: 0;
  padding-block: var(--rk-space-4);
}

.stat {
  display: grid;
  justify-items: center;
  gap: var(--rk-space-1);
}

.stat + .stat {
  border-left: var(--rk-border-width) solid var(--rk-glass-edge);
}

.stat-label {
  order: 1;
  color: var(--rk-color-text-muted);
  font: var(--rk-font-size-xs) var(--rk-font-family-mono);
}

.stat-value {
  display: flex;
  gap: var(--rk-space-2);
  align-items: center;
  margin: 0;
  font: var(--rk-font-weight-bold) 1.75rem / 1 var(--rk-font-family);
}

.stat-glyph {
  margin: 0;
}

.rules {
  background: color-mix(in srgb, var(--rk-color-domain) 8%, transparent);
  font-size: var(--rk-font-size-body);
}

.foot {
  display: flex;
  flex-wrap: wrap;
  gap: var(--rk-space-3);
  align-items: center;
  justify-content: space-between;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--rk-space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.tag {
  display: inline-flex;
  align-items: center;
  min-height: var(--rk-control-height-sm);
  padding: var(--rk-space-1) var(--rk-space-3);
  border: var(--rk-border-width) solid var(--rk-glass-edge);
  border-radius: 999px;
  color: var(--rk-color-text);
  font-size: var(--rk-font-size-sm);
  text-decoration: none;
  transition: border-color var(--rk-duration-fast) ease;
}

@media (hover: hover) {
  .tag:hover {
    border-color: var(--rk-color-domain-strong);
  }
}

.tag:focus-visible {
  outline: var(--rk-focus-width) solid var(--rk-color-accent);
  outline-offset: 2px;
}

.credit {
  margin: 0;
  color: var(--rk-color-text-muted);
  font-size: var(--rk-font-size-sm);
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

@media (max-width: 47.99rem) {
  .section {
    padding-inline: var(--rk-space-4);
  }
}
</style>
