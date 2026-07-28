<template>
  <div class="i18n-editor">
    <div class="panel toolbar">
      <q-btn-toggle
        dense
        no-caps
        unelevated
        :model-value="bucket"
        :options="bucketOptions"
        @update:model-value="(v) => emit('update:bucket', v)"
      />
      <div class="spacer" />
      <span class="count">{{ translatedCount }}/{{ strings.length }} traduits dans ce dossier</span>
    </div>

    <div v-if="!strings.length" class="empty-state">
      Aucune chaîne traduisible trouvée dans ce dossier pour l'instant.
    </div>

    <div v-else class="rows">
      <div v-for="frText in strings" :key="frText" class="row">
        <div class="source" :title="frText">{{ frText }}</div>
        <q-input
          dense
          outlined
          class="translation-input"
          :model-value="getValue(frText)"
          @update:model-value="(v) => setValue(frText, v)"
        />
        <span class="badge" :class="getValue(frText) ? 'badge-translated' : 'badge-missing'">
          {{ getValue(frText) ? 'Traduit' : 'Manquant' }}
        </span>
      </div>
    </div>

    <template v-if="orphanKeys.length">
      <div class="section-label orphan-label">
        Traductions inutilisées ({{ orphanKeys.length }})
        <FieldHelp text="Ces clés existent dans le dictionnaire mais ne correspondent plus à aucune phrase du contenu actuel — probablement du texte modifié ou supprimé depuis." />
      </div>
      <div class="rows">
        <div v-for="frText in orphanKeys" :key="frText" class="row orphan-row">
          <div class="source" :title="frText">{{ frText }}</div>
          <div class="translation-readonly" :title="getValue(frText)">{{ getValue(frText) }}</div>
          <q-btn dense flat round icon="delete" size="sm" color="negative" @click="deleteKey(frText)">
            <q-tooltip>Supprimer cette entrée inutilisée</q-tooltip>
          </q-btn>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, watch } from 'vue'
import { useStoryStore } from '@/engine/stores/story'
import { extractTranslatableStrings } from '@/project/extractTranslatableStrings'
import FieldHelp from '@/editor/components/FieldHelp.vue'

const props = defineProps({
  locale: { type: String, required: true },
  bucket: { type: String, required: true },
})
const emit = defineEmits(['update:bucket'])
const story = useStoryStore()

const bucketOptions = computed(() => [
  { label: 'Commun', value: 'common' },
  ...(story.project?.chapters || []).map((c) => ({ label: c.title || c.id, value: c.id })),
])

// The dict object at story.project.i18n[locale][bucket] must exist (even
// empty) before any row can bind to it — a freshly created locale only
// seeds common.js on disk (see project:createLocale), and a chapter bucket
// may never have been translated at all yet.
function ensureBucket() {
  if (!story.project.i18n[props.locale]) story.project.i18n[props.locale] = {}
  if (!story.project.i18n[props.locale][props.bucket]) story.project.i18n[props.locale][props.bucket] = {}
}
watch(() => [props.locale, props.bucket], ensureBucket, { immediate: true })

const extracted = computed(() => extractTranslatableStrings(story.project))
const strings = computed(() => extracted.value[props.bucket] || [])

const dict = computed(() => story.project.i18n?.[props.locale]?.[props.bucket] || {})

function getValue(frText) {
  return dict.value[frText] || ''
}
function setValue(frText, val) {
  ensureBucket()
  story.project.i18n[props.locale][props.bucket][frText] = val || undefined
}
function deleteKey(frText) {
  ensureBucket()
  delete story.project.i18n[props.locale][props.bucket][frText]
}

const translatedCount = computed(() => strings.value.filter((s) => getValue(s)).length)

const orphanKeys = computed(() => Object.keys(dict.value).filter((k) => !strings.value.includes(k)).sort())
</script>

<style scoped>
.i18n-editor {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.spacer {
  flex: 1;
}

.count {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.empty-state {
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  padding: var(--space-6);
  text-align: center;
}

.rows {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.source {
  flex: 1;
  min-width: 0;
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.translation-input {
  flex: 1;
  min-width: 0;
}

.translation-readonly {
  flex: 1;
  min-width: 0;
  font-size: var(--text-sm);
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  flex-shrink: 0;
}

.badge-translated {
  background: var(--color-surface-hover);
  color: var(--color-text-muted);
}

.badge-missing {
  background: var(--color-warning-tint);
  color: var(--color-warning);
}

.section-label {
  display: flex;
  align-items: center;
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
}

.orphan-label {
  margin-top: var(--space-2);
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
}

.orphan-row {
  opacity: 0.75;
}
</style>
