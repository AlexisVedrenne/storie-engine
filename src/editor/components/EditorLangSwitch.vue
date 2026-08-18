<template>
  <q-select
    dense
    outlined
    emit-value
    map-options
    :model-value="locale"
    :options="OPTIONS"
    class="lang-switch"
    @update:model-value="setLocale"
  />
</template>

<script setup>
// Switches the EDITOR's own UI language — independent from story.locale
// (the phone-preview/player language, see src/editor/i18n/index.js's own
// header comment for why they're kept separate). q-select instead of the
// original q-btn-toggle (2026-08-18 user feedback) — reads better once
// this lives inside EditorSettingsDialog next to other form-style fields
// rather than as a compact toolbar toggle.
import { useEditorI18n } from '@/editor/i18n'

const { locale, setLocale } = useEditorI18n()

const OPTIONS = [
  { label: 'Français', value: 'fr-FR' },
  { label: 'English', value: 'en-US' },
]
</script>

<style scoped>
.lang-switch {
  min-width: 160px;
}
</style>
