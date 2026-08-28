<template>
  <div class="lookup-block">
    <input v-model="query" class="lookup-input" type="text" :placeholder="placeholder" />

    <div v-if="!query.trim()" class="lookup-empty">{{ t('customApps.lookup.prompt') }}</div>
    <div v-else-if="!visibleResults.length" class="lookup-empty">
      {{ t('customApps.lookup.noResults') }}
    </div>
    <div v-else class="lookup-results">
      <div v-for="(result, i) in visibleResults" :key="i" class="lookup-result">
        <div class="lookup-result-title">{{ resolveDynamicText(result.title, story) }}</div>
        <div class="lookup-result-excerpt">{{ resolveDynamicText(result.excerpt, story) }}</div>
        <div class="lookup-result-source">{{ resolveDynamicText(result.source, story) }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
// A fake search/browser (pilier 05) — `block.results[]` is entirely
// author-authored (title/excerpt/source), each individually gated by its
// own `requires` (RequiresBuilder.vue), matched against the player's typed
// query. `query` is local component state, not story state — a search box's
// current text isn't a game variable worth persisting or reading elsewhere,
// same "ephemeral UI, not a flag" precedent as e.g. ConversationsBlock's own
// list<->thread toggle.
//
// Filtering: every whitespace-separated word in the query must appear
// SOMEWHERE across title+excerpt+source (AND, not OR) — a plain substring
// match per word, not a real search index. Empty query shows nothing at
// all, not every unlocked result — "search", not "browse a list that
// happens to have a filter box", per the roadmap's own framing.
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useStoryStore } from '@/engine/stores/story'
import { resolveDynamicText } from '@/engine/customApps/resolveDynamicText'

const props = defineProps({ block: { type: Object, required: true } })
const story = useStoryStore()
const { t } = useI18n()

const query = ref('')

const placeholder = computed(
  () =>
    resolveDynamicText(props.block.placeholder, story) || t('customApps.lookup.placeholderDefault'),
)

// Only a result whose OWN condition currently passes is even a candidate —
// same "gate individual items, not the whole block" precedent as a `list`
// block's per-item template has no equivalent for (a list repeats a fixed
// template; a lookup's results are individually distinct content, so each
// needs its own gate).
const unlockedResults = computed(() =>
  (props.block.results || []).filter((r) => story.checkConditions(r.requires)),
)

function haystack(result) {
  return [result.title, result.excerpt, result.source]
    .map((field) => resolveDynamicText(field, story) || '')
    .join(' ')
    .toLowerCase()
}

const visibleResults = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return []
  const words = q.split(/\s+/).filter(Boolean)
  return unlockedResults.value.filter((r) => {
    const text = haystack(r)
    return words.every((w) => text.includes(w))
  })
})
</script>

<style scoped>
.lookup-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.lookup-input {
  width: 100%;
  background: var(--app-surface);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: var(--app-radius);
  padding: 11px 14px;
  color: var(--app-text);
  font-size: 15px;
  outline: none;
}

.lookup-input:focus {
  border-color: var(--app-accent);
}

.lookup-empty {
  font-size: 13px;
  opacity: 0.5;
  font-style: italic;
}

.lookup-results {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.lookup-result {
  padding: 10px 12px;
  border-radius: var(--app-radius);
  background: var(--app-surface);
}

.lookup-result-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--app-text);
}

.lookup-result-excerpt {
  margin-top: 2px;
  font-size: 13px;
  color: var(--app-text);
  opacity: 0.75;
}

.lookup-result-source {
  margin-top: 4px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--app-accent);
}
</style>
