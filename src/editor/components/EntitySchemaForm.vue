<template>
  <div class="entity-schema-form">
    <div class="panel">
      <div class="section-label">{{ t('entitySchemaForm.identityTitle') }}</div>
      <div class="row">
        <q-input dense outlined disabled label="Id" :model-value="def.id" class="id-input" />
        <q-input
          dense
          outlined
          :label="t('entitySchemaForm.labelLabel')"
          v-model="def.label"
          class="grow"
        />
      </div>
    </div>

    <div class="panel">
      <div class="section-label">
        {{ t('entitySchemaForm.fieldsTitle') }}
        <FieldHelp :text="t('entitySchemaForm.fieldsHelp')" />
      </div>

      <div v-if="!fields.length" class="empty-hint">{{ t('entitySchemaForm.fieldsEmpty') }}</div>

      <div v-for="(field, i) in fields" :key="i" class="field-row">
        <q-btn dense flat round icon="close" size="sm" class="field-remove" @click="removeField(i)">
          <q-tooltip>{{ t('common.delete') }}</q-tooltip>
        </q-btn>
        <q-input
          dense
          outlined
          :label="t('entitySchemaForm.fieldKeyLabel')"
          v-model="field.key"
          class="key-input"
        />
        <q-input
          dense
          outlined
          :label="t('entitySchemaForm.fieldLabelLabel')"
          v-model="field.label"
          class="grow"
        />
        <q-select
          dense
          outlined
          class="type-select"
          :label="t('entitySchemaForm.fieldTypeLabel')"
          v-model="field.type"
          :options="FIELD_TYPES"
          emit-value
          map-options
        />
        <q-select
          v-if="field.type === 'ref:entity'"
          dense
          outlined
          class="type-select"
          :label="t('entitySchemaForm.refSchemaLabel')"
          v-model="field.refSchema"
          :options="otherSchemaOptions"
          emit-value
          map-options
        />
      </div>

      <q-btn
        dense
        flat
        no-caps
        icon="add"
        :label="t('entitySchemaForm.addField')"
        class="btn-ghost"
        @click="addField"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useStoryStore } from '@/engine/stores/story'
import FieldHelp from '@/editor/components/FieldHelp.vue'
import { useEditorI18n } from '@/editor/i18n'

const { t } = useEditorI18n()
const story = useStoryStore()
const props = defineProps({ def: { type: Object, required: true } })

const FIELD_TYPES = computed(() => [
  { label: t('entitySchemaForm.typeText'), value: 'text' },
  { label: t('entitySchemaForm.typeNumber'), value: 'number' },
  { label: t('entitySchemaForm.typeBoolean'), value: 'boolean' },
  { label: t('entitySchemaForm.typeGeo'), value: 'geo' },
  { label: t('entitySchemaForm.typeSchedule'), value: 'schedule' },
  { label: t('entitySchemaForm.typeRefContact'), value: 'ref:contact' },
  { label: t('entitySchemaForm.typeRefEntity'), value: 'ref:entity' },
])

const otherSchemaOptions = computed(
  () =>
    story.project?.gameConfig?.entitySchemas
      ?.filter((s) => s.id !== props.def.id)
      .map((s) => ({ label: s.label || s.id, value: s.id })) || [],
)

function ensureFields() {
  if (!props.def.fields) props.def.fields = []
  return props.def.fields
}
const fields = computed(() => ensureFields())

function addField() {
  ensureFields().push({ key: '', label: '', type: 'text' })
}
function removeField(i) {
  ensureFields().splice(i, 1)
}
</script>

<style scoped>
.entity-schema-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.section-label {
  display: flex;
  align-items: center;
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
}

.row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.id-input {
  width: 160px;
  flex-shrink: 0;
}

.grow {
  flex: 1 1 160px;
}

.empty-hint {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  font-style: italic;
}

.field-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-2);
  padding: var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.key-input {
  width: 160px;
  flex-shrink: 0;
}

.type-select {
  width: 180px;
  flex-shrink: 0;
}

.field-remove {
  flex-shrink: 0;
}
</style>
