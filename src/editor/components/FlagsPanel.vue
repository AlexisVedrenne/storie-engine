<template>
  <div class="flags-panel">
    <p class="intro">{{ t('flagsPanel.intro') }}</p>

    <div v-if="!flags.length" class="empty-state">{{ t('flagsPanel.empty') }}</div>

    <q-btn
      v-if="unusedCount"
      dense
      flat
      no-caps
      icon="delete_sweep"
      color="negative"
      :label="
        unusedCount === 1
          ? t('flagsPanel.deleteUnusedOne')
          : t('flagsPanel.deleteUnusedMany', { n: unusedCount })
      "
      class="cleanup-btn"
      @click="confirmRemoveAllUnused"
    />

    <div v-for="flag in flags" :key="flag.key" class="flag-row" :class="{ unused: !flag.isUsed }">
      <div class="flag-row-top">
        <span class="flag-key">{{ flag.key }}</span>
        <span v-if="flag.isBoolean" class="badge">{{ t('flagsPanel.boolean') }}</span>
        <span v-if="flag.isNumeric" class="badge badge-numeric">{{
          t('flagsPanel.reachable', { min: flag.min, max: flag.max })
        }}</span>
        <span v-if="flag.isCollection" class="badge badge-numeric">{{
          t('flagsPanel.collection')
        }}</span>
        <span v-if="flag.neverModified" class="badge badge-warning">
          <q-icon name="warning" size="11px" /> {{ t('flagsPanel.neverModified') }}
          <q-tooltip>{{ t('flagsPanel.neverModifiedTooltip') }}</q-tooltip>
        </span>
        <span v-if="!flag.isUsed" class="badge badge-unused">
          <q-icon name="link_off" size="11px" /> {{ t('flagsPanel.unused') }}
        </span>
        <div class="spacer" />
        <q-btn
          v-if="flag.isUsed"
          dense
          flat
          no-caps
          size="sm"
          class="where-btn"
          :icon="expanded.has(flag.key) ? 'expand_less' : 'expand_more'"
          :label="
            flag.count === 1
              ? t('flagsPanel.usageOne')
              : t('flagsPanel.usageMany', { n: flag.count })
          "
          @click="toggleExpanded(flag.key)"
        />
        <q-btn
          v-if="!flag.isUsed"
          dense
          flat
          round
          icon="delete"
          size="sm"
          color="negative"
          @click="removeFlag(flag.key)"
        >
          <q-tooltip>{{ t('flagsPanel.deleteLabelTooltip') }}</q-tooltip>
        </q-btn>
      </div>
      <q-input
        dense
        outlined
        :placeholder="t('flagsPanel.labelPlaceholder')"
        :model-value="flag.label"
        @update:model-value="(v) => setLabel(flag.key, v)"
      />
      <!-- Hidden by default — "where is this called from" is useful but
           noisy if shown for every flag at once, especially on a project
           with many chapters. -->
      <div v-if="expanded.has(flag.key)" class="locations">
        <div v-for="loc in flag.locations" :key="loc.type + loc.label" class="location-row">
          <q-icon :name="loc.type === 'event' ? 'sensors' : 'auto_stories'" size="14px" />
          <span>{{ loc.label }}</span>
          <span v-if="loc.count > 1" class="location-count">×{{ loc.count }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'
import { Dialog } from 'quasar'
import { useStoryStore } from '@/engine/stores/story'
import { collectFlags } from '@/project/collectFlags'
import { useEditorI18n } from '@/editor/i18n'

const { t } = useEditorI18n()

// `game` — same prop signature as GameForm.vue (story.project.gameConfig),
// mutated directly for the write side (flag labels). The read side (which
// flags exist, their observed type/range) is collectFlags(story.project)
// computed locally, NOT a story.js getter — story.js ships wholesale into
// every built game (see build.js), but collectFlags.js lives under
// src/project/, editor-only tooling never copied into a shipped game's
// shell. A store getter importing it would silently break every future
// build (unresolved module) even though nothing at runtime calls it.
const props = defineProps({ game: { type: Object, required: true } })
const story = useStoryStore()

if (!props.game.flags) props.game.flags = {}

const flags = computed(() => collectFlags(story.project))
const unusedCount = computed(() => flags.value.filter((f) => !f.isUsed).length)

// Keeps game.flags[key].boolean in sync with collectFlags' own isBoolean
// classification, computed fresh here on every project edit — this is the
// ONLY place that classification is available (collectFlags.js is
// editor-only, never shipped, see the story import comment above), so the
// journal app (src/components/apps/journal/App.vue) needs it persisted
// into game.flags itself to tell "an unset boolean flag" from "a numeric
// stat currently at 0" at runtime without importing this file. Runs on
// every collectFlags recompute (not just when a label is typed), so a
// project saved before this field existed self-heals the moment it's
// reopened in the editor — no migration step needed.
watch(
  flags,
  (list) => {
    for (const flag of list) {
      const entry = props.game.flags[flag.key]
      if (entry && entry.boolean !== flag.isBoolean) entry.boolean = flag.isBoolean
    }
  },
  { immediate: true },
)

// Which flags' "where is this called" list is open — collapsed by default
// for every flag (see template), keyed by flag key so it survives the
// catalog's own re-derivation on every project edit.
const expanded = reactive(new Set())
function toggleExpanded(key) {
  if (expanded.has(key)) expanded.delete(key)
  else expanded.add(key)
}

function setLabel(key, label) {
  const trimmed = (label || '').trim()
  if (trimmed) {
    const flag = flags.value.find((f) => f.key === key)
    props.game.flags[key] = { label: trimmed, boolean: flag?.isBoolean ?? false }
  } else {
    delete props.game.flags[key]
  }
}

// Only ever reachable for `isUsed: false` rows (see template) — the flag
// itself was never "created" as a first-class thing, this just clears the
// leftover game.flags[key] label entry, so there's nothing else in the
// project to touch.
function removeFlag(key) {
  delete props.game.flags[key]
}

function confirmRemoveAllUnused() {
  Dialog.create({
    title: t('flagsPanel.confirmDeleteUnusedTitle'),
    message:
      unusedCount.value === 1
        ? t('flagsPanel.confirmDeleteUnusedOne')
        : t('flagsPanel.confirmDeleteUnusedMany', { n: unusedCount.value }),
    cancel: true,
    persistent: true,
    color: 'negative',
  }).onOk(() => {
    for (const flag of flags.value) {
      if (!flag.isUsed) delete props.game.flags[flag.key]
    }
  })
}
</script>

<style scoped>
.flags-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.intro {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  line-height: 1.5;
}

.flag-row {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.flag-row-top {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.flag-key {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text);
}

.badge {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  background: var(--color-surface-hover);
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.badge-numeric {
  background: var(--color-accent-tint, var(--color-surface-hover));
  color: var(--color-accent);
  text-transform: none;
  letter-spacing: normal;
  font-weight: 600;
}

.badge-unused,
.badge-warning {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  background: var(--color-warning-tint);
  color: var(--color-warning);
  text-transform: none;
  letter-spacing: normal;
}

.flag-row.unused {
  border-style: dashed;
  opacity: 0.85;
}

.spacer {
  flex: 1;
}

.where-btn {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.cleanup-btn {
  align-self: flex-start;
}

.locations {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: var(--space-2);
  border-top: 1px solid var(--color-border);
}

.location-row {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.location-count {
  color: var(--color-text-muted);
  opacity: 0.7;
}
</style>
