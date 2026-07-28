<template>
  <div class="locale-list">
    <div class="pane-label">Langues</div>

    <div
      v-for="locale in locales"
      :key="locale"
      class="locale-row"
      :class="{ active: locale === modelValue }"
      @click="emit('update:modelValue', locale)"
    >
      <div class="active-bar" />
      <q-icon name="translate" size="16px" class="locale-icon" />
      <div class="locale-info">
        <div class="locale-name">{{ locale }}</div>
        <div class="locale-progress">{{ translatedCount(locale) }}/{{ totalStrings }} traduits</div>
      </div>
    </div>

    <q-btn
      class="new-locale-btn"
      dense
      flat
      no-caps
      icon="add"
      label="Nouvelle langue"
      color="primary"
      @click="newDialog = true"
    />

    <q-dialog v-model="newDialog">
      <q-card class="new-card">
        <q-card-section>
          <div class="text-subtitle1">Nouvelle langue</div>
          <div class="dialog-hint">Code de langue (ex: es-ES, de-DE)</div>
          <q-input dense outlined autofocus label="Code" v-model="newCode" class="q-mt-sm" @keyup.enter="createLocale" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Annuler" v-close-popup />
          <q-btn flat label="Créer" color="primary" :disable="!newCode.trim()" @click="createLocale" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Notify } from 'quasar'
import { useStoryStore } from '@/engine/stores/story'
import { extractTranslatableStrings } from '@/project/extractTranslatableStrings'

defineProps({ modelValue: { type: String, default: '' } })
const emit = defineEmits(['update:modelValue'])
const story = useStoryStore()

const locales = computed(() => Object.keys(story.project.i18n || {}).sort())

// Computed once, shared across every locale row's progress badge — pure and
// cheap enough for a project this size (same extractor used by the bucket
// editor pane).
const extracted = computed(() => extractTranslatableStrings(story.project))
const totalStrings = computed(() => Object.values(extracted.value).reduce((n, arr) => n + arr.length, 0))
function translatedCount(locale) {
  const dict = story.project.i18n[locale] || {}
  let n = 0
  for (const [bucket, strings] of Object.entries(extracted.value)) {
    const bucketDict = dict[bucket] || {}
    for (const s of strings) if (bucketDict[s]) n += 1
  }
  return n
}

const newDialog = ref(false)
const newCode = ref('')

async function createLocale() {
  const code = newCode.value.trim()
  if (!code) return
  try {
    const created = await window.storieAPI.createLocale({ rootPath: story.project.rootPath, locale: code })
    if (!story.project.i18n[created]) story.project.i18n[created] = { common: {} }
    emit('update:modelValue', created)
    newCode.value = ''
    Notify.create({ type: 'positive', message: 'Langue créée.' })
  } catch (err) {
    Notify.create({ type: 'negative', message: err.message || String(err) })
  }
}
</script>

<style scoped>
.locale-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-2);
}

.pane-label {
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
  padding: var(--space-2) var(--space-2) var(--space-1);
}

.locale-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: var(--row-height);
  padding: var(--space-2) var(--space-2) var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.locale-row:hover {
  background: var(--color-surface-hover);
}

.locale-row.active {
  background: var(--color-accent-tint);
}

.active-bar {
  position: absolute;
  left: 0;
  top: 4px;
  bottom: 4px;
  width: 3px;
  border-radius: 2px;
  background: transparent;
}

.locale-row.active .active-bar {
  background: var(--color-accent);
}

.locale-icon {
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.locale-info {
  flex: 1;
  min-width: 0;
}

.locale-name {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text);
  font-family: var(--font-mono);
}

.locale-progress {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.new-locale-btn {
  margin-top: var(--space-2);
  justify-content: flex-start;
}

.new-card {
  min-width: 320px;
  background: var(--color-surface);
  color: var(--color-text);
}

.dialog-hint {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  margin-top: var(--space-1);
}
</style>
