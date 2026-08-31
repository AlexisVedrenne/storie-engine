<template>
  <div class="color-field">
    <div class="field-label">{{ label || t('colorField.defaultLabel') }}</div>
    <div class="row">
      <div class="swatch-box" :style="{ background: modelValue || defaultValue }">
        <q-popup-proxy cover transition-show="scale" transition-hide="scale">
          <q-color
            :model-value="modelValue || defaultValue"
            :default-value="defaultValue"
            no-header
            no-footer
            @update:model-value="(v) => emit('update:modelValue', v)"
          />
        </q-popup-proxy>
      </div>
      <input
        class="hex-input"
        :value="draft"
        spellcheck="false"
        @input="draft = $event.target.value"
        @blur="commit"
        @keydown.enter="$event.target.blur()"
      />
      <q-btn
        v-if="clearable && modelValue"
        dense
        flat
        round
        icon="close"
        size="xs"
        @click="emit('update:modelValue', '')"
      />
    </div>
  </div>
</template>

<script setup>
// Small reusable color swatch + popup picker — same pattern ContactForm.vue
// hand-rolls for a contact's color, extracted here since BlockPropertiesForm
// needs it for several block types (header/avatar/badge/button/row/card/
// layout). `clearable` is only meaningful where an unset value has its own
// distinct built-in look (e.g. card's translucent default, layout's no
// background at all) rather than every other user just falling back to the
// same fixed brand color — see BlockPropertiesForm.vue's card/layout usage.
import { ref, watch } from 'vue'
import { useEditorI18n } from '@/editor/i18n'

const { t } = useEditorI18n()
const props = defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: '' },
  defaultValue: { type: String, default: '#4c8bf5' },
  clearable: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])

// Hex was previously a read-only <span> — picker-only, no way to paste a
// code copied from elsewhere (user request). `draft` is a local buffer so
// typing doesn't commit (and re-format) on every keystroke; committing only
// on blur/Enter also means an in-progress, momentarily-invalid string (e.g.
// still typing "#4c8") never gets emitted upstream.
const draft = ref(props.modelValue || props.defaultValue)
watch(
  () => props.modelValue,
  (v) => {
    draft.value = v || props.defaultValue
  },
)

// Bare hex pasted without its '#' (very common when copying from a design
// tool) is auto-prefixed. Anything else — a valid #rgb/#rrggbb/#rrggbbaa, or
// a CSS keyword/function like `transparent`/`rgba(...)` (this field also
// accepts those, see the theme background's own defaultValue) — is passed
// through as-is rather than rejected, so this stays a plain color field, not
// a hex-only validator.
function commit() {
  let v = draft.value.trim()
  if (/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$|^[0-9a-fA-F]{8}$/.test(v)) v = `#${v}`
  draft.value = v || props.defaultValue
  if (v && v !== props.modelValue) emit('update:modelValue', v)
  else if (!v) emit('update:modelValue', '')
}
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

.hex-input {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  padding: 2px 4px;
  min-width: 0;
  flex: 1 1 auto;
}

.hex-input:hover {
  border-color: var(--color-border);
}

.hex-input:focus {
  outline: none;
  border-color: var(--color-accent);
}
</style>
