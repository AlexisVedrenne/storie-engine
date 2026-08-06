<template>
  <div class="entry-form">
    <p class="intro">{{ t('entries.pause.intro') }}</p>
    <q-input
      dense
      outlined
      type="number"
      :label="t('entries.pause.durationLabel')"
      suffix="ms"
      :model-value="entry.duration ?? 1000"
      @update:model-value="(v) => (entry.duration = v === null || v === '' ? 1000 : Number(v))"
    />
  </div>
</template>

<script setup>
import { useEditorI18n } from '@/editor/i18n'

const { t } = useEditorI18n()
defineProps({ entry: { type: Object, required: true } })
</script>

<style scoped>
.entry-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.intro {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}
</style>
