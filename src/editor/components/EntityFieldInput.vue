<template>
  <div
    class="entity-field"
    :class="{ 'entity-field--wide': field.type === 'text' || field.type === 'schedule' }"
  >
    <div v-if="field.type === 'schedule'" class="schedule-field">
      <div class="schedule-field-label">{{ field.label || field.key }}</div>
      <div v-if="!slots.length" class="schedule-empty">
        {{ t('entityFieldInput.scheduleEmpty') }}
      </div>
      <div v-for="(slot, i) in slots" :key="i" class="schedule-slot">
        <q-input
          dense
          outlined
          :placeholder="t('entityFieldInput.scheduleFromPlaceholder')"
          :model-value="slot.from"
          class="schedule-time"
          @update:model-value="(v) => updateSlot(i, { from: v })"
        />
        <q-input
          dense
          outlined
          :placeholder="t('entityFieldInput.scheduleToPlaceholder')"
          :model-value="slot.to"
          class="schedule-time"
          @update:model-value="(v) => updateSlot(i, { to: v })"
        />
        <q-input
          dense
          outlined
          :placeholder="t('entityFieldInput.schedulePlacePlaceholder')"
          :model-value="slot.place"
          class="schedule-place"
          @update:model-value="(v) => updateSlot(i, { place: v })"
        />
        <q-btn dense flat round icon="close" size="sm" @click="removeSlot(i)">
          <q-tooltip>{{ t('common.delete') }}</q-tooltip>
        </q-btn>
      </div>
      <q-btn
        dense
        flat
        no-caps
        icon="add"
        :label="t('entityFieldInput.addScheduleSlot')"
        class="btn-ghost"
        @click="addSlot"
      />
    </div>
    <q-toggle
      v-else-if="field.type === 'boolean'"
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
import { computed } from 'vue'
import { useContactOptions } from '@/components/shared/useContactOptions'
import { useEditorI18n } from '@/editor/i18n'

const { t } = useEditorI18n()

const props = defineProps({
  field: { type: Object, required: true },
  modelValue: { default: '' },
})
const emit = defineEmits(['update:modelValue'])

const { contactOptions } = useContactOptions()

// `type: 'schedule'` is the one field type whose value is an ARRAY, not a
// scalar — `[{ from, to, place }]`, consumed by a `schedule` block (see
// ScheduleBlock.vue) to show a character's routine + current location.
// Always emits a fresh array (never mutates `slots.value` in place) so the
// same :model-value/@update:model-value contract every other field type
// here uses still holds — EffectsBuilder's row.fields[key] = v; sync()
// needs an actual CHANGE event to fire, a silent in-place push() wouldn't
// give it one.
const slots = computed(() => (Array.isArray(props.modelValue) ? props.modelValue : []))
function addSlot() {
  emit('update:modelValue', [...slots.value, { from: '', to: '', place: '' }])
}
function updateSlot(i, patch) {
  emit(
    'update:modelValue',
    slots.value.map((s, idx) => (idx === i ? { ...s, ...patch } : s)),
  )
}
function removeSlot(i) {
  emit(
    'update:modelValue',
    slots.value.filter((_, idx) => idx !== i),
  )
}
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

.schedule-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.schedule-field-label {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.schedule-empty {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  font-style: italic;
}

/* `flex-wrap` matters here: this row lives inside whatever column width the
   caller happens to have (a resizable splitter pane in EntitySchemaForm.vue,
   a dialog in EffectsBuilder.vue) — without wrap, the two fixed-width time
   inputs + the delete button never shrink (flex-shrink: 0) and overflow a
   narrow column instead of reflowing, clipped by the pane's own edge. */
.schedule-slot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
}

.schedule-time {
  width: 90px;
  flex-shrink: 0;
}

.schedule-place {
  flex: 1 1 140px;
  min-width: 0;
}
</style>
