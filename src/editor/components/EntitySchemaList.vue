<template>
  <div class="schema-list">
    <div class="pane-label">{{ t('editorPage.tabSchemas') }}</div>

    <div v-if="!schemas.length" class="empty-hint">{{ t('entitySchemaList.empty') }}</div>

    <div
      v-for="(def, i) in schemas"
      :key="def.id"
      class="schema-row"
      :class="{ active: i === modelValue }"
      @click="emit('update:modelValue', i)"
    >
      <div class="active-bar" />
      <q-icon name="dataset" size="16px" class="row-icon" />
      <div class="schema-info">
        <div class="schema-name" :title="def.label || def.id">{{ def.label || def.id }}</div>
        <div class="schema-id">
          {{ def.id }} · {{ t('entitySchemaList.fieldsCount', { n: (def.fields || []).length }) }}
        </div>
      </div>
      <q-btn
        dense
        flat
        round
        icon="delete"
        size="sm"
        color="negative"
        class="row-actions"
        @click.stop="remove(i)"
      >
        <q-tooltip>{{ t('common.delete') }}</q-tooltip>
      </q-btn>
    </div>

    <q-btn
      class="new-btn"
      dense
      flat
      no-caps
      icon="add"
      :label="t('entitySchemaList.newSchema')"
      color="primary"
      @click="newDialog = true"
    />

    <q-dialog v-model="newDialog">
      <q-card class="new-card">
        <q-card-section>
          <div class="text-subtitle1">{{ t('entitySchemaList.newSchema') }}</div>
          <q-input
            dense
            outlined
            :label="t('entitySchemaList.idLabel')"
            v-model="newId"
            class="q-mt-sm"
          />
          <q-input
            dense
            outlined
            :label="t('entitySchemaList.labelLabel')"
            v-model="newLabel"
            class="q-mt-sm"
          />
          <div v-if="idTaken" class="id-warning">{{ t('entitySchemaList.idTaken') }}</div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="t('common.cancel')" v-close-popup />
          <q-btn
            flat
            :label="t('common.create')"
            color="primary"
            :disable="!newId || !newLabel || idTaken"
            @click="create"
            v-close-popup
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Dialog } from 'quasar'
import { useStoryStore } from '@/engine/stores/story'
import { useEditorI18n } from '@/editor/i18n'

const { t } = useEditorI18n()
defineProps({ modelValue: { type: Number, default: 0 } })
const emit = defineEmits(['update:modelValue'])
const story = useStoryStore()

// game.entitySchemas is optional/absent on any project created before this
// feature existed — same lazy-init pattern as game.events/game.interactions
// (EventList.vue/InteractionDefList.vue).
if (!story.project.gameConfig.entitySchemas) story.project.gameConfig.entitySchemas = []
const schemas = computed(() => story.project.gameConfig.entitySchemas)

const newDialog = ref(false)
const newId = ref('')
const newLabel = ref('')
const idTaken = computed(() => schemas.value.some((d) => d.id === newId.value))

function create() {
  schemas.value.push({ id: newId.value, label: newLabel.value, fields: [] })
  emit('update:modelValue', schemas.value.length - 1)
  newId.value = ''
  newLabel.value = ''
}

// Same confirm-before-delete protection as Contact/Thread/CustomApp/Locale
// rows already have — this list previously deleted on a single stray click.
// Worth being extra deliberate here specifically: a schema id can be
// referenced from RequiresBuilder's entity-condition rows, EffectsBuilder,
// and BlockPropertiesForm's entity-bound blocks project-wide, and deleting
// it leaves those references silently dangling until the next
// "Valider le projet" run — the message below says so explicitly (a full
// "referenced in N places" pre-scan, findReferences.js-style, is a
// follow-up: that scanner only walks contact/thread references today, not
// the block/condition system entity fields are used from).
function remove(i) {
  const def = schemas.value[i]
  Dialog.create({
    title: t('entitySchemaList.confirmDeleteTitle'),
    message: t('entitySchemaList.confirmDeleteMessage', { name: def.label || def.id }),
    cancel: true,
    persistent: true,
    color: 'negative',
  }).onOk(() => {
    const idx = schemas.value.indexOf(def)
    if (idx === -1) return
    schemas.value.splice(idx, 1)
    if (idx === schemas.value.length) emit('update:modelValue', Math.max(0, idx - 1))
  })
}
</script>

<style scoped>
.schema-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.pane-label {
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
  padding: var(--space-2) var(--space-3) var(--space-1);
}

.empty-hint {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  font-style: italic;
  padding: 0 var(--space-3);
}

.schema-row {
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

.schema-row:hover {
  background: var(--color-surface-hover);
}

.schema-row.active {
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

.schema-row.active .active-bar {
  background: var(--color-accent);
}

.row-icon {
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.schema-info {
  flex: 1;
  min-width: 0;
}

.schema-name {
  font-size: var(--text-sm);
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.schema-id {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.row-actions {
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.schema-row:hover .row-actions {
  opacity: 1;
}

.new-btn {
  margin-top: var(--space-2);
}

.id-warning {
  color: var(--color-negative, #e05252);
  font-size: var(--text-xs);
  margin-top: var(--space-1);
}
</style>
