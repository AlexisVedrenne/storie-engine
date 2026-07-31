<template>
  <q-btn-toggle
    dense
    no-caps
    unelevated
    :model-value="locale"
    :options="OPTIONS"
    color="surface"
    text-color="text-muted"
    toggle-color="primary"
    class="lang-switch"
    @update:model-value="setLocale"
  />
</template>

<script setup>
// Switches the EDITOR's own UI language — independent from story.locale
// (the phone-preview/player language, see src/editor/i18n/index.js's own
// header comment for why they're kept separate).
import { useEditorI18n } from '@/editor/i18n'

const { locale, setLocale } = useEditorI18n()

const OPTIONS = [
  { label: 'FR', value: 'fr-FR' },
  { label: 'EN', value: 'en-US' },
]
</script>

<style scoped>
.lang-switch {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}
</style>
