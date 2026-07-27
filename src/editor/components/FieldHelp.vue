<template>
  <q-icon name="help_outline" size="14px" class="field-help">
    <q-tooltip anchor="top middle" self="bottom middle" max-width="280px">{{ text }}</q-tooltip>
  </q-icon>
</template>

<script setup>
// Small "?" affordance for jargon terms (requires/effects/then/flags...)
// that a newcomer to the narrative engine won't know — keeps labels short
// while making the meaning discoverable on hover/tap instead of forcing a
// wall of explanatory text into every form (docs/ui-ux-guidelines.md).
defineProps({ text: { type: String, required: true } })
</script>

<style scoped>
.field-help {
  color: var(--color-text-muted);
  cursor: help;
  margin-left: var(--space-1);
  vertical-align: middle;
}
</style>
