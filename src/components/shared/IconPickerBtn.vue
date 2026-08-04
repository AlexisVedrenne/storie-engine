<template>
  <q-btn dense flat round icon="grid_view" size="sm" @click.stop tabindex="-1">
    <q-tooltip>Choisir une icône</q-tooltip>
    <q-menu ref="menuRef" anchor="bottom right" self="top right" @show="onShow" @hide="query = ''">
      <div class="icon-picker">
        <q-input
          dense
          outlined
          clearable
          ref="searchInputRef"
          v-model="query"
          placeholder="Rechercher une icône…"
          class="icon-picker__search"
        >
          <template #prepend>
            <q-icon name="search" size="16px" />
          </template>
        </q-input>

        <template v-if="query.trim()">
          <div v-if="searchResults.length" class="icon-picker__row icon-picker__results">
            <button
              v-for="ic in searchResults"
              :key="ic.n"
              type="button"
              class="icon-picker__cell"
              @click="pick(ic.n)"
            >
              <q-icon :name="ic.n" size="22px" />
              <q-tooltip>{{ ic.n }}</q-tooltip>
            </button>
          </div>
          <div v-else class="icon-picker__empty">Aucun résultat.</div>
        </template>

        <template v-else>
          <q-tabs v-model="tab" dense no-caps align="justify" class="icon-picker__tabs">
            <q-tab v-for="cat in ICON_CATEGORIES" :key="cat.name" :name="cat.name" :icon="cat.icon">
              <q-tooltip>{{ cat.label }}</q-tooltip>
            </q-tab>
          </q-tabs>
          <q-separator />
          <q-tab-panels v-model="tab" class="icon-picker__panels">
            <q-tab-panel
              v-for="cat in ICON_CATEGORIES"
              :key="cat.name"
              :name="cat.name"
              class="icon-picker__panel"
            >
              <div class="icon-picker__row">
                <button
                  v-for="ic in cat.items"
                  :key="ic.n"
                  type="button"
                  class="icon-picker__cell"
                  @click="pick(ic.n)"
                >
                  <q-icon :name="ic.n" size="22px" />
                  <q-tooltip>{{ ic.n }}</q-tooltip>
                </button>
              </div>
            </q-tab-panel>
          </q-tab-panels>
        </template>
      </div>
    </q-menu>
  </q-btn>
</template>

<script setup>
// Same picker shape as EmojiPickerBtn.vue (search + categorized grid), but
// emits the raw Material Icons ligature name instead of an emoji glyph, and
// the caller assigns it directly to a single field (block.icon etc) rather
// than splicing it into free text — an icon field always holds exactly one
// name, there's no caret/composition concept here.
import { ref, computed, nextTick } from 'vue'
import { ICON_CATEGORIES, ALL_ICONS } from '@/components/shared/iconList'

const emit = defineEmits(['pick'])

const tab = ref(ICON_CATEGORIES[0].name)
const menuRef = ref(null)
const searchInputRef = ref(null)
const query = ref('')

function normalize(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

const searchResults = computed(() => {
  const q = normalize(query.value.trim())
  if (!q) return []
  return ALL_ICONS.filter((ic) => normalize(ic.k).includes(q) || normalize(ic.n).includes(q))
})

function onShow() {
  nextTick(() => searchInputRef.value?.focus())
}

function pick(iconName) {
  emit('pick', iconName)
  menuRef.value?.hide()
}
</script>

<style scoped>
.icon-picker {
  width: 280px;
  padding: var(--space-2);
}

.icon-picker__search {
  margin-bottom: var(--space-2);
}

.icon-picker__tabs {
  min-height: unset;
}

.icon-picker__panels {
  background: transparent;
}

.icon-picker__panel {
  padding: var(--space-2) 0 0;
}

.icon-picker__row {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
}

.icon-picker__results {
  max-height: 224px;
  overflow-y: auto;
}

.icon-picker__empty {
  padding: var(--space-3) 0;
  text-align: center;
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.icon-picker__cell {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: inherit;
}

.icon-picker__cell:hover {
  background: var(--color-surface-hover, rgba(255, 255, 255, 0.08));
}
</style>
