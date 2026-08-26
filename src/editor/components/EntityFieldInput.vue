<template>
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
    class="entity-field-input"
    :label="field.label || field.key"
    :model-value="modelValue"
    :options="contactOptions"
    emit-value
    map-options
    @update:model-value="(v) => emit('update:modelValue', v)"
  />
  <q-input
    v-else
    dense
    outlined
    :type="field.type === 'number' ? 'number' : 'text'"
    class="entity-field-input"
    :label="field.label || field.key"
    :model-value="modelValue"
    @update:model-value="
      (v) => emit('update:modelValue', field.type === 'number' ? Number(v) || 0 : v)
    "
  />
</template>

<script setup>
// One input per schema field TYPE — shared between EffectsBuilder.vue
// (writing a field as part of an `effects.entities` op) and
// EntitySchemaForm.vue (authoring a seed instance's starting fields), so the
// "which widget for which type" mapping exists in exactly one place. Plain
// `:model-value`/`@update:model-value` (not `v-model`) so a caller can chain
// its own side effect (EffectsBuilder's `sync()`) after the value changes.
import { useContactOptions } from '@/components/shared/useContactOptions'

defineProps({
  field: { type: Object, required: true },
  modelValue: { default: '' },
})
const emit = defineEmits(['update:modelValue'])

const { contactOptions } = useContactOptions()
</script>

<style scoped>
.entity-field-input {
  width: 100%;
}
</style>
