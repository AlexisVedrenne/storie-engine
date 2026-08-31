<template>
  <q-btn-toggle
    dense
    no-caps
    v-model="target.target"
    :options="[
      { label: t('blockProps.formTargetFlag'), value: 'flag' },
      { label: t('blockProps.formTargetEntity'), value: 'entity' },
    ]"
  />
  <template v-if="target.target === 'entity'">
    <q-select
      dense
      outlined
      :label="t('blockProps.listSchemaLabel')"
      v-model="target.schemaId"
      :options="schemaOptions"
      emit-value
      map-options
    />
    <q-select
      dense
      outlined
      :label="t('blockProps.formFieldLabel')"
      :hint="t('blockProps.formFieldHint')"
      v-model="target.fieldKey"
      :options="formFieldOptions(target.schemaId)"
      emit-value
      map-options
    />
    <q-input
      dense
      outlined
      :label="t('blockProps.scheduleEntityIdLabel')"
      :hint="t('blockProps.scheduleEntityIdHint')"
      v-model="target.entityId"
    />
  </template>
  <template v-else>
    <FlagNameField v-model="target.flagKey" />
    <q-btn-toggle
      dense
      no-caps
      v-model="target.inputType"
      :options="[
        { label: t('entitySchemaForm.typeText'), value: 'text' },
        { label: t('entitySchemaForm.typeNumber'), value: 'number' },
        { label: t('entitySchemaForm.typeBoolean'), value: 'boolean' },
      ]"
    />
  </template>
</template>

<script setup>
// Extracted from `form` block's own properties form (the original, only
// consumer) so the `requestInput` action (pilier 04) — the same "write a
// value into a flag or entity field" concept, just prompted from an action
// instead of always-visible on screen — doesn't duplicate this. `target` is
// mutated directly, same "props edited in place" convention every editor
// form here already uses; it needs `target`/`flagKey`/`inputType` or
// `schemaId`/`fieldKey`/`entityId`, exactly the fields `form`'s own
// defaultBlock() and a `requestInput` action both carry.
import { computed } from 'vue'
import { useStoryStore } from '@/engine/stores/story'
import FlagNameField from '@/editor/components/FlagNameField.vue'
import { useEditorI18n } from '@/editor/i18n'

const { t } = useEditorI18n()
const story = useStoryStore()
defineProps({ target: { type: Object, required: true } })

const schemaOptions = computed(
  () =>
    story.project?.gameConfig?.entitySchemas?.map((s) => ({
      label: s.label || s.id,
      value: s.id,
    })) || [],
)

// Only the 4 "simple" types are offered here — schedule/ref:entity fields
// are structured data, not a fit for a single input widget (see
// FormBlock.vue).
function formFieldOptions(schemaId) {
  const schema = story.project?.gameConfig?.entitySchemas?.find((s) => s.id === schemaId)
  return (schema?.fields || [])
    .filter((f) => ['text', 'number', 'boolean', 'ref:contact'].includes(f.type))
    .map((f) => ({ label: f.label || f.key, value: f.key }))
}
</script>
