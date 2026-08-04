<template>
  <div class="color-field">
    <div class="field-label">{{ label || t('colorField.defaultLabel') }}</div>
    <div class="row">
      <div class="swatch-box" :style="{ background: modelValue || defaultValue }">
        <q-popup-proxy cover transition-show="scale" transition-hide="scale">
          <q-color :model-value="modelValue || defaultValue" :default-value="defaultValue" no-header no-footer @update:model-value="(v) => emit('update:modelValue', v)" />
        </q-popup-proxy>
      </div>
      <span class="hex">{{ modelValue || defaultValue }}</span>
    </div>
  </div>
</template>

<script setup>
// Small reusable color swatch + popup picker — same pattern ContactForm.vue
// hand-rolls for a contact's color, extracted here since BlockPropertiesForm
// needs it for 4 different block types (header/avatar/badge/button).
import { useEditorI18n } from '@/editor/i18n'

const { t } = useEditorI18n()
defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: '' },
  defaultValue: { type: String, default: '#4c8bf5' },
})
const emit = defineEmits(['update:modelValue'])
</script>

<style scoped>
.color-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.field-label {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.swatch-box {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  cursor: pointer;
  flex-shrink: 0;
}

.hex {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}
</style>
