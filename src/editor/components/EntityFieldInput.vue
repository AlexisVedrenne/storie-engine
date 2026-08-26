<template>
  <div class="entity-field" :class="{ 'entity-field--wide': field.type === 'text' }">
    <q-toggle
      v-if="field.type === 'boolean'"
      dense
      :label="field.label || field.key"
      :model-value="Boolean(modelValue)"
      @update:model-value="(v) => emit('update:modelValue', v)"
    />
    <q-select
      v-else-if="field.type === 'ref:contact'"
      dense
      outlined
      :label="field.label || field.key"
      :model-value="modelValue"
      :options="contactOptions"
      emit-value
      map-options
      @update:model-value="(v) => emit('update:modelValue', v)"
    />
    <q-input
      v-else-if="field.type === 'number'"
      dense
      outlined
      type="number"
      :label="field.label || field.key"
      :model-value="modelValue"
      @update:model-value="(v) => emit('update:modelValue', Number(v) || 0)"
    />
    <!-- Plain `text` is the catch-all (also `ref:entity`, free-typed for now)
         — a schema field is as likely to be a one-word name as a long
         description, and there's no separate "long text" type to tell them
         apart ahead of time. `autogrow` handles both: one line until there's
         more to show, never a cramped single-line box for a paragraph. -->
    <q-input
      v-else
      dense
      outlined
      type="textarea"
      autogrow
      :label="field.label || field.key"
      :model-value="modelValue"
      @update:model-value="(v) => emit('update:modelValue', v)"
    />
  </div>
</template>

<script setup>
// One input per schema field TYPE — shared between EffectsBuilder.vue
// (writing a field as part of an `effects.entities` op) and
// EntitySchemaForm.vue (authoring a seed instance's starting fields), so the
// "which widget for which type" mapping exists in exactly one place. Plain
// `:model-value`/`@update:model-value` (not `v-model`) so a caller can chain
// its own side effect (EffectsBuilder's `sync()`) after the value changes.
//
// Single root, not a bare v-if/v-else-if chain — `entity-field--wide` has to
// land on a real grid ITEM so the parent's `grid-template-columns` respects
// it (see .seed-fields/.entity-fields in the callers); a fragment of
// sibling root nodes has nothing to hang that class on.
import { useContactOptions } from '@/components/shared/useContactOptions'

defineProps({
  field: { type: Object, required: true },
  modelValue: { default: '' },
})
const emit = defineEmits(['update:modelValue'])

const { contactOptions } = useContactOptions()
</script>

<style scoped>
.entity-field {
  min-width: 0;
}

.entity-field :deep(.q-field) {
  width: 100%;
}

.entity-field--wide {
  grid-column: 1 / -1;
}
</style>
