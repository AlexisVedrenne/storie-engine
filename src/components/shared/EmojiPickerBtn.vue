<template>
  <q-btn dense flat round icon="mood" size="sm" @click.stop tabindex="-1">
    <q-tooltip>Insérer un emoji</q-tooltip>
    <q-menu ref="menuRef" anchor="bottom right" self="top right" @show="onShow" @hide="query = ''">
      <div class="emoji-picker">
        <q-input
          dense
          outlined
          clearable
          ref="searchInputRef"
          v-model="query"
          placeholder="Rechercher un emoji…"
          class="emoji-picker__search"
        >
          <template #prepend>
            <q-icon name="search" size="16px" />
          </template>
        </q-input>

        <template v-if="query.trim()">
          <div v-if="searchResults.length" class="emoji-picker__row emoji-picker__results">
            <button v-for="e in searchResults" :key="e.c" type="button" class="emoji-picker__cell" @click="pick(e.c)">{{ e.c }}</button>
          </div>
          <div v-else class="emoji-picker__empty">Aucun résultat.</div>
        </template>

        <template v-else>
          <div v-if="recent.length" class="emoji-picker__row">
            <button v-for="e in recent" :key="'recent-' + e" type="button" class="emoji-picker__cell" @click="pick(e)">{{ e }}</button>
          </div>
          <q-separator v-if="recent.length" />
          <q-tabs v-model="tab" dense no-caps align="justify" class="emoji-picker__tabs">
            <q-tab v-for="cat in EMOJI_CATEGORIES" :key="cat.name" :name="cat.name" :label="cat.icon">
              <q-tooltip>{{ cat.label }}</q-tooltip>
            </q-tab>
          </q-tabs>
          <q-separator />
          <q-tab-panels v-model="tab" class="emoji-picker__panels">
            <q-tab-panel v-for="cat in EMOJI_CATEGORIES" :key="cat.name" :name="cat.name" class="emoji-picker__panel">
              <div class="emoji-picker__row">
                <button v-for="e in cat.emoji" :key="e.c" type="button" class="emoji-picker__cell" @click="pick(e.c)">{{ e.c }}</button>
              </div>
            </q-tab-panel>
          </q-tab-panels>
        </template>
      </div>
    </q-menu>
  </q-btn>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { EMOJI_CATEGORIES, ALL_EMOJI } from '@/components/shared/emojiList'
import { loadRecentEmoji, pushRecentEmoji } from '@/components/shared/emojiInsert'

const emit = defineEmits(['pick'])

const tab = ref(EMOJI_CATEGORIES[0].name)
const menuRef = ref(null)
const searchInputRef = ref(null)
const recent = ref(loadRecentEmoji())
const query = ref('')

// Accent-insensitive on purpose — a user typing "coeur" should still find
// keywords written as "cœur"/"coeur" interchangeably without having to
// guess which spelling emojiList.js used.
function normalize(s) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

const searchResults = computed(() => {
  const q = normalize(query.value.trim())
  if (!q) return []
  return ALL_EMOJI.filter((e) => normalize(e.k).includes(q))
})

// Search box should be usable the instant the menu opens, same as any
// other search-first picker (I18nBucketEditor's own string search, etc.).
function onShow() {
  nextTick(() => searchInputRef.value?.focus())
}

function pick(emoji) {
  recent.value = pushRecentEmoji(emoji)
  emit('pick', emoji)
  menuRef.value?.hide()
}
</script>

<style scoped>
.emoji-picker {
  width: 280px;
  padding: var(--space-2);
}

.emoji-picker__search {
  margin-bottom: var(--space-2);
}

.emoji-picker__tabs {
  min-height: unset;
}

.emoji-picker__panels {
  background: transparent;
}

.emoji-picker__panel {
  padding: var(--space-2) 0 0;
}

.emoji-picker__row {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
}

.emoji-picker__results {
  max-height: 224px;
  overflow-y: auto;
}

.emoji-picker__empty {
  padding: var(--space-3) 0;
  text-align: center;
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.emoji-picker__cell {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  line-height: 1;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.emoji-picker__cell:hover {
  background: var(--color-surface-hover, rgba(255, 255, 255, 0.08));
}
</style>
