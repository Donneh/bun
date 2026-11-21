<script setup lang="ts">
import { reactive, useId } from "vue";
import CardText from "./CardText.vue";
import type { RulesNote } from "./card-detail.ts";
import GlyphText from "./GlyphText.vue";
import type { GlyphTextPart } from "./glyph.ts";

defineProps<{ notes: readonly RulesNote[] }>();

const LONG_ANSWER = 400;
const headingId = useId();
const expanded = reactive(new Set<number>());

const textLength = (paragraphs: readonly (readonly GlyphTextPart[])[]) =>
  paragraphs.flat().reduce((length, part) => length + (part.kind === "text" ? part.text.length : 1), 0);

const isLong = (answer: readonly (readonly GlyphTextPart[])[]) => answer.length > 1 && textLength(answer) > LONG_ANSWER;

function toggle(index: number) {
  if (!expanded.delete(index)) expanded.add(index);
}
</script>

<template>
  <section class="rules-notes" :aria-labelledby="headingId">
    <h2 :id="headingId" class="heading">Rules notes</h2>
    <ol class="notes">
      <li v-for="(note, index) in notes" :key="index" class="note">
        <p class="meta">
          <span>{{ note.date }}</span>
          <a class="source" :href="note.source.href" rel="noopener">{{ note.source.label }}</a>
        </p>
        <p v-if="note.kind === 'ban'" class="body">{{ note.text }}</p>
        <template v-else-if="note.kind === 'errata'">
          <p class="label">Errata, new text</p>
          <CardText class="body" :text="note.current" />
          <p class="label">Previous text</p>
          <CardText class="body previous" :text="note.previous" />
        </template>
        <template v-else>
          <p class="question"><GlyphText :parts="note.question" /></p>
          <p class="body"><GlyphText :parts="note.answer[0] ?? []" /></p>
          <div v-show="!isLong(note.answer) || expanded.has(index)" :id="`${headingId}-${index}`" class="rest">
            <p v-for="(paragraph, line) in note.answer.slice(1)" :key="line" class="body">
              <GlyphText :parts="paragraph" />
            </p>
          </div>
          <button
            v-if="isLong(note.answer)"
            type="button"
            class="more"
            :aria-expanded="expanded.has(index)"
            :aria-controls="`${headingId}-${index}`"
            @click="toggle(index)"
          >
            {{ expanded.has(index) ? "Show less" : "Show full answer" }}
          </button>
        </template>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.rules-notes {
  display: grid;
  gap: var(--rk-space-3);
}

.heading,
.label {
  margin: 0;
  color: var(--rk-color-text-muted);
  font: var(--rk-font-weight-regular) var(--rk-font-size-xs) var(--rk-font-family-mono);
}

.notes {
  display: grid;
  gap: var(--rk-space-5);
  margin: 0;
  padding: 0;
  list-style: none;
}

.note {
  display: grid;
  gap: var(--rk-space-2);
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0 var(--rk-space-3);
  align-items: center;
  margin: 0;
  color: var(--rk-color-text-muted);
  font-size: var(--rk-font-size-sm);
  font-variant-numeric: tabular-nums;
}

.body,
.question {
  margin: 0;
  overflow-wrap: anywhere;
}

.question {
  font-weight: var(--rk-font-weight-bold);
}

.rest {
  display: grid;
  gap: var(--rk-space-2);
}

.more {
  justify-self: start;
  min-height: var(--rk-control-height-sm);
  padding: 0;
  border: 0;
  background: none;
  color: var(--rk-color-text);
  font: inherit;
  font-size: var(--rk-font-size-sm);
  text-decoration: underline;
  text-decoration-color: var(--rk-color-border);
  text-underline-offset: 0.25em;
  cursor: pointer;
  transition: text-decoration-color var(--rk-duration-fast) ease;
}

@media (hover: hover) {
  .more:hover {
    text-decoration-color: var(--rk-color-domain-strong);
  }
}

.more:focus-visible {
  outline: var(--rk-focus-width) solid var(--rk-color-accent);
  outline-offset: 2px;
  border-radius: var(--rk-radius-sm);
}

.previous {
  color: var(--rk-color-text-muted);
}

.source {
  display: inline-flex;
  align-items: center;
  min-height: var(--rk-control-height-sm);
  color: inherit;
  text-decoration: underline;
  text-decoration-color: var(--rk-color-border);
  text-underline-offset: 0.25em;
  transition: text-decoration-color var(--rk-duration-fast) ease;
}

@media (hover: hover) {
  .source:hover {
    color: var(--rk-color-text);
    text-decoration-color: var(--rk-color-domain-strong);
  }
}

.source:focus-visible {
  outline: var(--rk-focus-width) solid var(--rk-color-accent);
  outline-offset: 2px;
  border-radius: var(--rk-radius-sm);
}
</style>
